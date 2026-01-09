from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc, or_, extract, cast, Integer
from datetime import datetime,time, date, timedelta
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from database.db import (#This was really long so I had to bracket it
                         User, 
                         Student, 
                         Lesson, 
                         Module, 
                         AttdCheck, 
                         StudentModules,  
                         LecMod,
                         EntLeave)

from schemas import( timetableEntry, 
                            AttendanceOverviewCard, 
                            RecentSessionsCardData, 
                            RecentSessionRecord, 
                            courseoverviewcard, 
                            ClassToday,
                            Literal,
                            viewUserProfile,
                            UserProfileUpdate,
                            ReportCriteria,
                            AttendanceLogEntry,
                            DetailedAttendanceRecord,
                            DailyTimetable,
                            Weeklytimetable,
                            MonthlyTimetable,
                            AttendanceDetailRow,
                            OverallClassAttendanceDetails)
from io import StringIO
from routers import studentDashboardRouter
from typing import Union, List
import csv


router = APIRouter() 

@router.get("/lecturer/dashboard/summary") #sum of mods taught by lecturer
def get_lecturer_dashboard_summary(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    mods_taught_by_me = db.query(LecMod).filter(LecMod.lecturerID == user_id).all()
    return {"total_modules": len(mods_taught_by_me)}


# Timetable for dashboard
@router.get("/lecturer/dashboard/timetable", response_model=list[timetableEntry])
def get_lecturer_timetable(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    now = datetime.now()
    next_week = now + timedelta(days=7)

    upcoming_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime >= now,
            Lesson.startDateTime <= next_week
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    results = []
    for lesson, module in upcoming_lessons:
        
        # Handle Location (Combine Building + Room)
        bldg = lesson.building or ""
        rm = lesson.room or ""
        
        if bldg and rm:
            loc_str = f"{bldg}-{rm}"
        else:
            loc_str = bldg + rm 
            
        if not loc_str:
            loc_str = "Online"

        # Create the Pydantic Object
        entry = timetableEntry(
            module_code=module.moduleCode,
            day_of_week=lesson.startDateTime.strftime("%a"),
            start_time=lesson.startDateTime.strftime("%I:%M %p").lstrip("0"),
            end_time=lesson.endDateTime.strftime("%I:%M %p").lstrip("0"),
            location=loc_str
        )
        results.append(entry)

    return results

# Average Attendance across all modules taught by me
@router.get("/lecturer/dashboard/average-attendance", response_model=AttendanceOverviewCard)
def get_lecturer_average_attendance_safe(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    lec_mods = db.query(LecMod).filter(LecMod.lecturerID == user_id).all()

    total_capacity = 0
    total_actual_checkins = 0

    for lm in lec_mods:
        # Get Count
        enrolled_count = db.query(StudentModules).filter(
            StudentModules.modulesID == lm.moduleID
        ).count()

        # Get Count of distinct people who have EVER attended this module
        # (This catches students missing from the StudentModules table)
        active_students = db.query(AttdCheck.studentID)\
            .join(Lesson).filter(Lesson.lecModID == lm.lecModID)\
            .distinct().count()

        # Use the higher number
        # If DB says 1 student, but 4 people are attending, we use 4 to prevent >100%
        real_student_count = max(enrolled_count, active_students)

        # Get Lessons
        lesson_count = db.query(Lesson).filter(
            Lesson.lecModID == lm.lecModID,
            Lesson.endDateTime < datetime.now()
        ).count()

        # Math
        total_capacity += (real_student_count * lesson_count)

        unique_checkins = db.query(AttdCheck.lessonID, AttdCheck.studentID)\
            .join(Lesson).filter(
                Lesson.lecModID == lm.lecModID,
                Lesson.endDateTime < datetime.now()
            )\
            .distinct().count()
            
        total_actual_checkins += unique_checkins

    # Result
    if total_capacity == 0:
        percentage = 0.0
    else:
        percentage = (total_actual_checkins / total_capacity) * 100.0

    return AttendanceOverviewCard(
        Average_attendance=round(percentage, 1)
    )

# Recent Sessions recorded
@router.get("/lecturer/dashboard/recent-sessions-card", response_model=RecentSessionsCardData)
def get_recent_sessions_card(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Counts the total number of unique lessons that have been completed 
    by this lecturer in the last 7 days.
    """
    
    # Define the time window (Last 7 Days)
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)

    # Query Logic: Count the unique Lesson IDs
    recent_sessions_count = db.query(func.count(Lesson.lessonID))\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.endDateTime < now,           # Class is finished
            Lesson.endDateTime >= seven_days_ago # Finished recently
        ).scalar() or 0

    # Return Data
    return RecentSessionsCardData(
        Recent_sessions_record=recent_sessions_count
    )


# Course Overview Cards
@router.get("/lecturer/dashboard/my-courses-overview", response_model=list[courseoverviewcard])
def get_lecturer_courses_overview(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Provides a list of all modules taught by the lecturer, with enrollment and 
    module-specific attendance rate.
    """
    
    #  Get all Lecture-Module connections (which includes the Module details)
    lec_mods = db.query(LecMod).join(Module).filter(LecMod.lecturerID == user_id).all()
    
    results = []

    for lm in lec_mods:
        module = lm.modules

        #Get Enrollment Count (The simple student count for the display)
        enrolled_count = db.query(StudentModules).filter(
            StudentModules.modulesID == module.moduleID
        ).count()

        #  Attendance Rate Calculation (The complex part)

        # Get Actual Visitors (for Safe Math check)
        # We need this to prevent the attendance rate from exceeding 100%
        active_visitors = db.query(AttdCheck.studentID)\
            .join(Lesson).filter(Lesson.lecModID == lm.lecModID)\
            .distinct().count()
        
        # Define the Class Size for the Denominator
        # Use whichever is higher (enrolled or visitors) as the true class size
        class_size = max(enrolled_count, active_visitors)

        # Get Finished Lessons
        lessons_taught = db.query(Lesson).filter(
            Lesson.lecModID == lm.lecModID,
            Lesson.endDateTime < datetime.now()
        ).count()

        # Calculate Capacity & Actuals
        capacity = class_size * lessons_taught
        
        actual_checkins = db.query(AttdCheck.lessonID, AttdCheck.studentID)\
            .join(Lesson).filter(Lesson.lecModID == lm.lecModID)\
            .distinct().count()

        #Final Rate
        rate = (actual_checkins / capacity * 100.0) if capacity > 0 else 0.0

        # Append to results
        results.append(courseoverviewcard(
            module_code=module.moduleCode,
            module_name=module.moduleName, # Assumes moduleName is the descriptive title
            overall_attendance_rate=round(rate, 0), # Round to 0 decimal places (e.g., 91%)
            students_enrolled=enrolled_count # Uses the official enrolled count
        ))

    return results

#Upcoming class today   
@router.get("/lecturer/dashboard/classes-today", response_model=list[ClassToday])
def get_classes_today(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Define the Time Window (Start of Today to End of Today)
    now = datetime.now() 
    today = now.date()
            
            # FIX: Use 'time.min' and 'time.max'
    start_of_day = datetime.combine(today, time.min) 
    end_of_day = datetime.combine(today, time.max)

    # Query Lessons for Today
    lessons_today = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_of_day, end_of_day) # Filter for Today
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    results = []
    
    for lesson, module in lessons_today:
        
        # --- Pre-calculate Common Values ---
        
        # Location: Combine Building + Room
        loc_str = ""
        bldg = lesson.building or ""
        rm = lesson.room or ""
        if bldg and rm:
            loc_str = f"Building {bldg}, Room {rm}" # e.g., "Building 3, Room 205"
        else:
            loc_str = "Online"

        # Time Range
        start_time = lesson.startDateTime.strftime("%I:%M %p").lstrip("0")
        end_time = lesson.endDateTime.strftime("%I:%M %p").lstrip("0")
        time_range_str = f"{start_time} - {end_time}"
        
        
        # --- Determine Status and Attendance ---
        
        status_str: Literal['Completed', 'Pending', 'Live'] = 'Pending'
        present_count = 0
        total_enrolled = 0
        attendance_display = ""
        
        # Get Enrolled Count (Total Students)
        total_enrolled = db.query(StudentModules).filter(
            StudentModules.modulesID == module.moduleID
        ).count()

        # Check if Completed
        if lesson.endDateTime < now:
            status_str = 'Completed'
            # Count distinct students who checked in for THIS specific lesson
            present_count = db.query(AttdCheck.studentID)\
                .filter(AttdCheck.lessonID == lesson.lessonID)\
                .distinct().count()
            attendance_display = f"{present_count}/{total_enrolled} present"

        # Check if Live (starts in the past, ends in the future)
        elif lesson.startDateTime <= now and lesson.endDateTime >= now:
            status_str = 'Live'
            # Attendance for a live class is calculated the same way
            present_count = db.query(AttdCheck.studentID)\
                .filter(AttdCheck.lessonID == lesson.lessonID)\
                .distinct().count()
            attendance_display = f"{present_count}/{total_enrolled} present (Live)"
            
        # Otherwise, it remains 'Pending' (Starts in the future)
        else:
            present_count = 0
            attendance_display = ""


        # Create the final object
        results.append(ClassToday(
            module_code=module.moduleCode,
            module_name=module.moduleName,
            time_range=time_range_str,
            location=loc_str,
            status=status_str,
            present_count=present_count,
            total_enrolled=total_enrolled,
            attendance_display=attendance_display
        ))

    return results

#Recent sessions attandance records front recent classes
@router.get("/lecturer/dashboard/recent-sessions-log", response_model=list[RecentSessionRecord])
def get_recent_sessions_log(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Fetches a detailed log of completed lessons in the last 30 days 
    with their attendance statistics.
    """
    
    # Define the Time Window (Last 30 Days)
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30) 

    # Query Completed Lessons
    # Get all lessons taught by the user that have ended in the last 30 days.
    completed_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.endDateTime < now,
            Lesson.startDateTime >= thirty_days_ago 
        )\
        .order_by(Lesson.startDateTime.desc())\
        .limit(10)\
        .all()

    results = []

    for lesson, module in completed_lessons:
        
        # Get Total Enrolled (Expected Students)
        total_enrolled = db.query(StudentModules).filter(
            StudentModules.modulesID == module.moduleID
        ).count()

        # Get Actual Attended (Unique Check-ins for this specific lesson)
        # We use distinct() to prevent double-counting students
        attended_count = db.query(AttdCheck.studentID)\
            .filter(AttdCheck.lessonID == lesson.lessonID)\
            .distinct().count()

        # Calculate Percentage (Safe Math: Attended / Total)
        # Note: If Ghost Students > Enrolled, the percentage might still be >100%. 
        # We use a min() check to ensure the numerator is never larger than the denominator for display.
        total_for_calc = max(total_enrolled, attended_count) # Use the larger number for the total only if you need to fix the 200% problem

        # Using the official enrolled count for the display, but ensuring percentage isn't > 100%
        rate = (attended_count / max(total_enrolled, 1) * 100.0)
        rate = min(rate, 100.0) # Cap at 100% for the final display

        # Format the strings
        results.append(RecentSessionRecord(
            subject=f"{module.moduleCode} - {module.moduleName}",
            date=lesson.startDateTime.strftime("%d %b %Y"), # e.g., 28 Oct 2025
            time=lesson.startDateTime.strftime("%I:%M %p").lstrip("0"), # e.g., 9:00 AM
            attended=attended_count,
            total=total_enrolled,
            percentage=round(rate, 0)
        ))

    return results
@router.get("/lecturer/class/details", response_model=OverallClassAttendanceDetails)
def get_overall_class_attendance_details(
    lesson_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # Fetch Lesson/Module/Enrollment Data
    lesson_module = db.query(Lesson, Module)\
        .join(Module, Lesson.lecModID == Module.moduleID)\
        .filter(Lesson.lessonID == lesson_id)\
        .first()
    
    if not lesson_module:
        raise HTTPException(status_code=404, detail="Lesson not found.")
        
    lesson, module = lesson_module

    # Total Enrolled Students (Total)
    total_enrolled = db.query(StudentModules).filter(
        StudentModules.modulesID == module.moduleID
    ).count()

    #  Calculate Metrics (Attended, Late, Absent)

    # Attended Count (Unique distinct check-ins)
    attended_count = db.query(AttdCheck.studentID).filter(
        AttdCheck.lessonID == lesson_id
    ).distinct().count()

    # Late Arrivals Count (Check EntLeave against lesson start time)
    late_arrivals_count = db.query(EntLeave).filter(
        EntLeave.lessonID == lesson_id,
        EntLeave.enter > lesson.startDateTime + timedelta(minutes=5)
    ).count()

    # Present Count (Attended - Late Arrivals)
    present_count = attended_count - late_arrivals_count # 42 - 3 = 39 (Close to 38)

    # Absentees Count (Total Enrolled - Attended)
    # Note: Using min(Total, Attended) to avoid negative if enrollment is wrong
    absentees_count = max(0, total_enrolled - attended_count)
    
    # Attendance Rate
    attendance_rate = (attended_count / max(total_enrolled, 1) * 100.0)
    attendance_rate = round(min(attendance_rate, 100.0), 1)

    # Assemble Header Strings
    subject_details_str = f"{module.moduleCode} - {module.moduleName}"
    
    time_str = lesson.startDateTime.strftime("%I:%M %p").lstrip('0')
    date_str = lesson.startDateTime.strftime("%d %b %Y")
    
    # Location (Using the corrected fields from your Lesson model)
    loc_str = f"Lab {lesson.building} (Room {lesson.room})" if lesson.building and lesson.room else "Online"
    lesson_details_str = f"{date_str} · {time_str} · {loc_str}"
    
    
    # Generate Table Log (AttendanceDetailRow)
    
    #Get all enrolled students
    all_students = db.query(Student).join(StudentModules).filter(
        StudentModules.modulesID == module.moduleID
    ).all()
    
    attendance_log_rows = []
    
    for student in all_students:
        # Check presence and late status for THIS specific student/lesson
        check_in = db.query(AttdCheck).filter(AttdCheck.lessonID == lesson_id, AttdCheck.studentID == student.studentID).first()
        ent_leave = db.query(EntLeave).filter(EntLeave.lessonID == lesson_id, EntLeave.studentID == student.studentID).first()
        
        status = 'Absent'
        check_in_time = None

        if check_in:
            status = 'Present'
            if ent_leave:
                check_in_time = ent_leave.enter.strftime("%H:%M %p")
                if ent_leave.enter > lesson.startDateTime + timedelta(minutes=5):
                    status = 'Late'
            else:
                # If checked-in but no EntLeave record, use lesson start time as fallback
                check_in_time = lesson.startDateTime.strftime("%H:%M %p")

        attendance_log_rows.append(AttendanceDetailRow(
            user_id=student.studentNum,
            student_name=student.name,
            check_in_time=check_in_time,
            status=status
        ))


    # Return the final structure
    return OverallClassAttendanceDetails(
        subject_details=subject_details_str,
        lesson_details=lesson_details_str,
        attended_count=attended_count,
        total_enrolled=total_enrolled,
        attendance_rate=attendance_rate,
        Present_count=present_count,
        late_arrivals=late_arrivals_count,
        absentees=absentees_count,
        attendance_log=attendance_log_rows
    )