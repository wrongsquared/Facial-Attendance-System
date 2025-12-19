from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc, or_, extract, cast, Integer
from datetime import datetime,time, date, timedelta
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from database.db import (UserProfile, #This was really long so I had to bracket it
                         User, 
                         Admin, 
                         Lecturer, 
                         Student, 
                         Lesson, 
                         EntLeave, 
                         Module, 
                         AttdCheck, 
                         StudentModules, 
                         studentAngles, 
                         Courses, 
                         LecMod)
from pdantic.schemas import( timetableEntry, 
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
                            DetailedAttendanceRecord,DailyTimetable,Weeklytimetable,MonthlyTimetable,AttendanceDetailRow,OverallClassAttendanceDetails)
from io import StringIO
from routers import studentDashboardRouter
from typing import Union, List,Literal
import csv


router = APIRouter() 

#---------------------------#
# LECTURER DASHBOARD ROUTES
#---------------------------#

# total module taught by me
@router.get("/lecturer/dashboard/summary")
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
    # 1. Get the start of 'today' (midnight) so past classes today don't disappear
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    seven_days_later = today_start + timedelta(days=7)

    # 2. Fetch all lessons starting from today's midnight through the next 7 days
    upcoming_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime >= today_start,
            Lesson.startDateTime < seven_days_later
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    # 3. Create our 7-day slot list (starting from today)
    date_range = [now.date() + timedelta(days=i) for i in range(7)]
    
    # Organize DB results into a dictionary by date
    lessons_by_date = {}
    for lesson, module in upcoming_lessons:
        d = lesson.startDateTime.date()
        if d not in lessons_by_date:
            lessons_by_date[d] = []
        lessons_by_date[d].append((lesson, module))

    results = []

    # 4. Build the final response
    for date_obj in date_range:
        day_name = date_obj.strftime("%a")
        
        if date_obj in lessons_by_date:
            # Day has classes (shows even if they ended earlier today)
            for lesson, module in lessons_by_date[date_obj]:
                bldg = lesson.building or ""
                rm = lesson.room or ""
                loc_str = f"{bldg}-{rm}" if bldg and rm else (bldg + rm or "Online")

                results.append(timetableEntry(
                    module_code=module.moduleCode,
                    day_of_week=day_name,
                    start_time=lesson.startDateTime.strftime("%I:%M %p").lstrip("0"),
                    end_time=lesson.endDateTime.strftime("%I:%M %p").lstrip("0"),
                    location=loc_str
                ))
        else:
            # Day has NO classes
            results.append(timetableEntry(
                module_code="No Classes Scheduled",
                day_of_week=day_name,
                start_time="",
                end_time="",
                location=""
            ))

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
        # 1. Get Official Count
        enrolled_count = db.query(StudentModules).filter(
            StudentModules.modulesID == lm.moduleID
        ).count()

        # 2. Get Count of distinct people who have EVER attended this module
        # (This catches students missing from the StudentModules table)
        active_students = db.query(AttdCheck.studentID)\
            .join(Lesson).filter(Lesson.lecModID == lm.lecModID)\
            .distinct().count()

        # 3. SAFETY CHECK: Use the higher number
        # If DB says 1 student, but 4 people are attending, we use 4 to prevent >100%
        real_student_count = max(enrolled_count, active_students)

        # 4. Get Lessons
        lesson_count = db.query(Lesson).filter(
            Lesson.lecModID == lm.lecModID,
            Lesson.endDateTime < datetime.now()
        ).count()

        # 5. Math
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
        Average_attendance=round(percentage, 1), 
        label="Across all courses"
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
        Recent_sessions_record=recent_sessions_count, 
        label="Recent sessions recorded"
    )

router.include_router(studentDashboardRouter.router, tags=["Student"])
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
    
    # 1. Get all Lecture-Module connections (which includes the Module details)
    lec_mods = db.query(LecMod).join(Module).filter(LecMod.lecturerID == user_id).all()
    
    results = []

    for lm in lec_mods:
        module = lm.modules

        # A. Get Enrollment Count (The simple student count for the display)
        enrolled_count = db.query(StudentModules).filter(
            StudentModules.modulesID == module.moduleID
        ).count()

        # --- Attendance Rate Calculation (The complex part) ---

        # B. Get Actual Visitors (for Safe Math check)
        # We need this to prevent the attendance rate from exceeding 100%
        active_visitors = db.query(AttdCheck.studentID)\
            .join(Lesson).filter(Lesson.lecModID == lm.lecModID)\
            .distinct().count()
        
        # C. Define the Class Size for the Denominator
        # Use whichever is higher (enrolled or visitors) as the true class size
        class_size = max(enrolled_count, active_visitors)

        # D. Get Finished Lessons
        lessons_taught = db.query(Lesson).filter(
            Lesson.lecModID == lm.lecModID,
            Lesson.endDateTime < datetime.now()
        ).count()

        # E. Calculate Capacity & Actuals
        capacity = class_size * lessons_taught
        
        actual_checkins = db.query(AttdCheck.lessonID, AttdCheck.studentID)\
            .join(Lesson).filter(Lesson.lecModID == lm.lecModID)\
            .distinct().count()

        # F. Final Rate
        rate = (actual_checkins / capacity * 100.0) if capacity > 0 else 0.0

        # 3. Append to results
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
    # 1. Define the Time Window (Start of Today to End of Today)
    now = datetime.now() 
    today = now.date()
            
            # FIX: Use 'time.min' and 'time.max'
    start_of_day = datetime.combine(today, time.min) 
    end_of_day = datetime.combine(today, time.max)

    # 2. Query Lessons for Today
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


        # 3. Create the final object
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
    
    # 1. Define the Time Window (Last 30 Days)
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30) 

    # 2. Query Completed Lessons
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
        .all()

    results = []

    for lesson, module in completed_lessons:
        
        # A. Get Total Enrolled (Expected Students)
        total_enrolled = db.query(StudentModules).filter(
            StudentModules.modulesID == module.moduleID
        ).count()

        # B. Get Actual Attended (Unique Check-ins for this specific lesson)
        # We use distinct() to prevent double-counting students
        attended_count = db.query(AttdCheck.studentID)\
            .filter(AttdCheck.lessonID == lesson.lessonID)\
            .distinct().count()

        # C. Calculate Percentage (Safe Math: Attended / Total)
        # Note: If Ghost Students > Enrolled, the percentage might still be >100%. 
        # We use a min() check to ensure the numerator is never larger than the denominator for display.
        total_for_calc = max(total_enrolled, attended_count) # Use the larger number for the total only if you need to fix the 200% problem

        # Using the official enrolled count for the display, but ensuring percentage isn't > 100%
        rate = (attended_count / max(total_enrolled, 1) * 100.0)
        rate = min(rate, 100.0) # Cap at 100% for the final display

        # 3. Format the strings
        results.append(RecentSessionRecord(
            subject=f"{module.moduleCode} - {module.moduleName}",
            date=lesson.startDateTime.strftime("%d %b %Y"), # e.g., 28 Oct 2025
            time=lesson.startDateTime.strftime("%I:%M %p").lstrip("0"), # e.g., 9:00 AM
            attended=attended_count,
            total=total_enrolled,
            percentage=round(rate, 0)
        ))

    return results

# View user profile (view-only)
@router.get("/lecturer/profile/view-basic", response_model=viewUserProfile)
def get_view_only_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Fetches all profile data from the merged 'users' table.
    """
    # The query is simple SELECT * FROM users
    user_record = db.query(User).filter(User.userID == user_id).first()
    
    if not user_record:
        raise HTTPException(status_code=404, detail="User profile not found in database.")

    # Pydantic maps the ORM attributes directly.
    return user_record

@router.put("/lecturer/profile/update", response_model=viewUserProfile)
def update_user_profile(
    updates: UserProfileUpdate, # The data sent from the frontend
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Updates the user's personal information and emergency contact in a single transaction.
    """
    
    # 1. Find the User Record
    user_record = db.query(User).filter(User.userID == user_id).first()
    
    if not user_record:
        raise HTTPException(status_code=404, detail="User profile not found.")

    # 2. Get the non-None values from the Pydantic input model
    # We use .model_dump(exclude_none=True) to only get fields the user submitted
    update_data = updates.model_dump(exclude_unset=True)

    # 3. Apply the updates to the ORM object
    for key, value in update_data.items():
        # Use setattr to dynamically update the ORM attribute (e.g., user_record.name = "new name")
        setattr(user_record, key, value)
    
    # 4. Commit and Refresh
    db.commit()
    db.refresh(user_record)
    
    # 5. Return the full, updated profile
    return user_record


# Generate and download attendance report
@router.post("/lecturer/reports/generate-download")
def generate_and_download_report(
    criteria: ReportCriteria,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Receives report criteria and compiles the student-centric attendance data 
    for the selected module and time period, returning it as CSV content.
    """
    
    # 1. Define time boundaries and retrieve module details
    start_date = criteria.date_from 
    end_date = criteria.date_to
    
    # --- START OF CRITICAL CHANGES ---
    # Fetch module details using the new criteria field: criteria.module_code
    module_details = db.query(Module).filter(Module.moduleCode == criteria.module_code).first()
    
    if not module_details:
        raise HTTPException(status_code=404, detail=f"Module code not found: {criteria.module_code}")

    # Now we must use the Module ID (the PK) for joining in the database
    module_id = module_details.moduleID
    module_code = module_details.moduleCode
    module_name = module_details.moduleName
    
    # 2. Identify the pool of relevant lessons (subquery for efficiency)
    lesson_pool = db.query(Lesson.lessonID, Lesson.startDateTime)\
    .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
    .filter(
        # The Lesson is already linked to a LecMod record.
        # We need to ensure that LecMod record satisfies BOTH conditions:
        
        # 1. Taught by the current user
        LecMod.lecturerID == user_id, 
        
        # 2. Belongs to the module we looked up earlier
        LecMod.moduleID == module_id,
        
        # 3. Falls within the date range (using the fixed date comparison)
        func.date(Lesson.startDateTime).between(start_date, end_date)
    ).subquery()
        
    if not db.query(lesson_pool).first():
        raise HTTPException(status_code=404, detail="No relevant lessons found for the selected module and dates.")

    # 3. Get all students enrolled in the selected module
    enrolled_students = db.query(Student.studentID, Student.name)\
        .join(StudentModules, Student.studentID == StudentModules.studentID)\
        .filter(
            # Use the Module ID for the student enrollment join
            StudentModules.modulesID == module_id
        ).all()
        
    # --- END OF CRITICAL CHANGES ---
    
    report_data = []

    # 4. Iterate through every student and every lesson to check status...
    # (The rest of the logic remains the same, as it uses the now-defined module_code and module_name)
    # ...
    
    # 5. Compile the detailed report row (Student-Session Data)
    for student_id, student_name in enrolled_students:
        for lesson_id, lesson_start_time in db.query(lesson_pool).all():
            
            # This is where the status check happens, and it's missing!
            attendance_record = db.query(AttdCheck).filter(
                AttdCheck.studentID == student_id,
                AttdCheck.lessonID == lesson_id
            ).first()
        
            # 4b. Determine status based on record existence
            if attendance_record:
                status_text = "Present"
            else:
                status_text = "Absent" # Default status if no record is found
        
            # 4c. Apply the final status filter requested by the user
            if criteria.attendance_status != "All" and status_text != criteria.attendance_status:
                # If the user requested 'Present' but the status is 'Absent', skip this row.
                continue   

        report_data.append({
            "Module Code": module_code, 
            "Module Name": module_name,
            "Student ID": student_id,
            "Student Name": student_name,
            "Date": lesson_start_time.strftime("%Y-%m-%d"),
            "Time": lesson_start_time.strftime("%H:%M"),
            "Attendance Status": status_text,
        })
            
    # 6. Handle Download (CSV Generation)
    # ... (CSV creation logic remains the same) ...

    if not report_data:
        raise HTTPException(status_code=404, detail="No records match the selected criteria and status filter.")
        
    output = StringIO()
    fieldnames = list(report_data[0].keys())
    writer = csv.DictWriter(output, fieldnames=fieldnames)

    writer.writeheader()
    writer.writerows(report_data)
    
    csv_content = output.getvalue()

    return {
        "content": csv_content,
        "filename": f"Attendance_Report_{criteria.report_type}_{criteria.date_from}_to_{criteria.date_to}.csv",
        "media_type": "text/csv"
    }

# Lecturer Attendance Log with Dynamic Filtering
@router.get("/lecturer/attendance-log", response_model=List[AttendanceLogEntry])
def get_lecturer_attendance_log_filtered(
    # URL QUERY PARAMETERS
    search_term: str = Query(None, description="Search by Student Name or ID"),
    module_code: str = Query(None, description="Filter by Module Code"),
    status: Literal['Present', 'Absent', 'Late'] = Query(None, description="Filter by Status"),
    date: date = Query(None, description="Filter by specific date (YYYY-MM-DD)"),
    limit: int = Query(50, gt=0),
    offset: int = Query(0, ge=0),
    
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # --- 1. Define Core Lesson Sets (Filter Lessons by Lecturer & Date) ---
    
    relevant_lessons_query = db.query(
        Lesson.lessonID, Lesson.startDateTime, Lesson.endDateTime, LecMod.moduleID
    ).join(LecMod).filter(
        LecMod.lecturerID == user_id,
        Lesson.endDateTime < datetime.now() # Only completed lessons
    )
    
    # Apply URL DATE filter if provided
    if date:
        start_of_day = datetime.combine(date, time.min) # Note: time.min must be imported/defined
        end_of_day = datetime.combine(date, time.max)   # Note: time.max must be imported/defined
        relevant_lessons_query = relevant_lessons_query.filter(
            Lesson.startDateTime.between(start_of_day, end_of_day)
        )
        
    relevant_lessons = relevant_lessons_query.subquery()

    # All student enrollments relevant to the lecturer
    enrolled_students = db.query(StudentModules.studentID, StudentModules.modulesID).subquery()
    
    # Full Cartesian Product (A row for every Student X Lesson pairing)
    attendance_slots = db.query(
        enrolled_students.c.studentID,
        relevant_lessons.c.lessonID,
        relevant_lessons.c.startDateTime,
        relevant_lessons.c.moduleID
    ).join(
        relevant_lessons,
        enrolled_students.c.modulesID == relevant_lessons.c.moduleID
    ).subquery()
    
    
    # --- 2. LATE Status Subquery (Corrected Syntax) ---
    late_check = db.query(
        EntLeave.studentID, EntLeave.lessonID,
        # Corrected syntax: func.count(case(condition, result))
        func.count(case(
            (EntLeave.enter > relevant_lessons.c.startDateTime + timedelta(minutes=5), 1)
        , else_=None)).label('late_count')
    ).group_by(EntLeave.studentID, EntLeave.lessonID).subquery()
    
    
    # --- 3. Final Query Construction ---
    
    # The calculated status expression (Corrected Syntax)
    status_expr = case(
        (func.count(AttdCheck.AttdCheckID) > 0, # <-- CRITICAL FIX: This is now an aggregate function
         case( 
             (func.max(late_check.c.late_count) > 0, 'Late') 
         , else_='Present')
        )
    , else_='Absent').label('status')
    
    # Base SELECT statement joins all necessary data
    final_query = db.query(
        Student.studentNum.label('user_id'),
        Student.name.label('student_name'),
        Module.moduleCode.label('module_code'),
        attendance_slots.c.startDateTime.label('date_time'),
        attendance_slots.c.lessonID.label('lesson_id'),
        status_expr
    ).select_from(attendance_slots).join(
        Student, Student.studentID == attendance_slots.c.studentID
    ).join(
        Module, Module.moduleID == attendance_slots.c.moduleID
    ).outerjoin(
        AttdCheck, and_(AttdCheck.lessonID == attendance_slots.c.lessonID, AttdCheck.studentID == attendance_slots.c.studentID)
    ).outerjoin(
        late_check, and_(late_check.c.lessonID == attendance_slots.c.lessonID, late_check.c.studentID == attendance_slots.c.studentID)
    ).group_by(
    Student.studentNum, 
    Student.name, 
    Module.moduleCode, 
    attendance_slots.c.startDateTime, 
    attendance_slots.c.lessonID
)

    # --- 4. Apply Dynamic Filters ---
    
    if module_code:
        final_query = final_query.filter(Module.moduleCode == module_code)

    if search_term:
        search_like = f"%{search_term}%"
        # Search by Student Name OR Student ID (studentNum)
        search_filter = or_(
            Student.name.ilike(search_like),
            Student.studentNum.ilike(search_like)
        )
        final_query = final_query.filter(search_filter)
        
    # --- 5. Execute, Filter Status (Python), and Paginate ---

    # Execute the query (LIMIT and OFFSET are applied to the full dataset)
    final_records = final_query.order_by(
        attendance_slots.c.startDateTime.desc()
    ).all()

    log_entries = []
    for row in final_records:
        entry = AttendanceLogEntry(
            user_id=row.user_id,
            student_name=row.student_name,
            module_code=row.module_code,
            status=row.status,
            date=row.date_time.strftime("%d %b %Y"),
            lesson_id=row.lesson_id
        )
        
        # Apply Status Filter (Python-side filtering)
        if not status or entry.status == status:
            log_entries.append(entry)

    # Apply Pagination to the final list
    return log_entries[offset:offset + limit]

# Detailed Attendance Record
@router.get("/lecturer/attendance/details/{lesson_id}/{student_num}", response_model=DetailedAttendanceRecord)
def get_detailed_attendance_record(
    lesson_id: int,
    student_num: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # 1. Base Query: Start from Student and fetch all related data
    
    # We will query all needed entities (Student, Lesson, Module) but start the FROM clause at Student
    record = db.query(Student, Lesson, Module)\
        .select_from(Student) \
        .join(Lesson, Lesson.lessonID == lesson_id) \
        .join(LecMod, Lesson.lecModID == LecMod.lecModID) \
        .join(Module, Module.moduleID == LecMod.moduleID) \
        .filter(Student.studentNum == student_num) \
        .first()

    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")

    student, lesson, module = record
    
    # 2. Check for Presence/Late Status (Simplified Logic from the Log Query)
    # A. Check for AttdCheck existence
    is_present = db.query(AttdCheck).filter(
        AttdCheck.lessonID == lesson_id, 
        AttdCheck.studentID == student_num
    ).first()

    # B. Check for Late Status (using the 5-minute rule)
    is_late = db.query(EntLeave).filter(
        EntLeave.lessonID == lesson_id, 
        EntLeave.studentID == student_num,
        EntLeave.enter > lesson.startDateTime + timedelta(minutes=5)
    ).first()

    # C. Final Status Assignment
    if not is_present:
        status_str = 'Absent'
    elif is_late:
        status_str = 'Late'
    else:
        status_str = 'Present'
        
    # D. Get Timestamp (Use EntLeave.enter time if available, otherwise lesson start)
    entry_time_record = db.query(EntLeave.enter).filter(EntLeave.lessonID == lesson_id, EntLeave.studentID == student_num).first()
    timestamp_str = (entry_time_record[0] if entry_time_record else lesson.startDateTime).strftime("%H:%M %p")


    # 3. Assemble and Return Data (Using Placeholders for Missing DB Fields)
    
    # Location (Using the corrected fields from your Lesson model)
    camera_location_str = f"Building {lesson.building}, Room {lesson.room}" if lesson.building and lesson.room else "TBA"

    return DetailedAttendanceRecord(
        # Top Section
        student_name=student.name,
        user_id=student.studentNum, # Use the Student Number
        module_code=module.moduleCode,
        date=lesson.startDateTime.strftime("%d %b %Y"),
        
        # Details Section
        attendance_status=status_str,
        live_check='Passed', # <--- PLACEHOLDER (Requires a 'liveCheck' column)
        timestamp=timestamp_str,
        virtual_tripwire='Triggered', # <--- PLACEHOLDER (Requires a 'tripwire' column)
        
        attendance_method='Biometric Scan', # <--- PLACEHOLDER (Requires a 'method' column)
        camera_location=camera_location_str,
        verification_type='Multi-person group verification' # <--- PLACEHOLDER (Requires a 'verification' column)
    )

#--------------------------
#Lecturer timetable 
#--------------------------
# Daily Timetable
@router.get("/lecturer/timetable/daily", response_model=list[DailyTimetable])
def get_daily_timetable(
    date_str: str, # Date as string (e.g., "2025-12-01") from the URL
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Fetches lessons for a specific single day based on the date provided in the URL path.
    """
    
    try:
        # CRITICAL: Convert the URL string to a Python date object
        selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Define the time window: Start of the selected day to End of the selected day
    start_of_day = datetime.combine(selected_date, time.min)
    end_of_day = datetime.combine(selected_date, time.max)
    
    # 1. Query Lessons
    upcoming_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_of_day, end_of_day) # Filter for the single day
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    # 2. Format the data
    results = []

    for lesson, module in upcoming_lessons:
        
        # Location: Combine Building + Room (using the fields you have)
        loc_str = ""
        bldg = lesson.building or ""
        rm = lesson.room or ""
        if bldg and rm:
            # Note: We can't tell what T01/T02 is from your DB, so we use a simple string
            loc_str = f"Building {bldg} | Room {rm}"
        else:
            loc_str = "Online"

        # Time
        start_time = lesson.startDateTime.strftime("%I:%M %p").lstrip("0")
        end_time = lesson.endDateTime.strftime("%I:%M %p").lstrip("0")

        # Create the Pydantic Object
        entry = DailyTimetable(
            module_code=module.moduleCode,
            module_name=module.moduleName,          # ADDED: Required by DailyTimetable schema
            lesson_type=lesson.lessontype,          # ADDED: Required by DailyTimetable schema
            start_time=start_time,
            end_time=end_time,
            location=loc_str
        )
        results.append(entry)

    return results

# Weekly Timetable 
@router.get("/lecturer/timetable/weekly", response_model=List[Weeklytimetable])
def get_weekly_timetable_flat(
    start_date_str: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Fetches all lessons for a 7-day period starting from the provided date 
    and returns them as a single, flat list (no grouping by day).
    """
    
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    # Define the time window: 7 days
    start_time = datetime.combine(start_date, time.min)
    end_time = datetime.combine(start_date + timedelta(days=6), time.max)
    
    # 1. Query Lessons (Fetch all 7 days of data)
    upcoming_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_time, end_time) 
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    # 2. Format the data into a single, flat list
    results = []

    for lesson, module in upcoming_lessons:
        
        # Formatting Logic
        bldg = lesson.building or ""
        rm = lesson.room or ""
        loc_str = f"Building {bldg} | Room {rm}" if bldg and rm else "Online"
        
        start_t = lesson.startDateTime.strftime("%I:%M %p").lstrip("0")
        end_t = lesson.endDateTime.strftime("%I:%M %p").lstrip("0")
        date_full_str = lesson.startDateTime.strftime("%d")
        
        # Construct the flat Weeklytimetable object
        results.append(Weeklytimetable(
            day_of_week=lesson.startDateTime.strftime("%a"), # e.g. Mon
            date_of_day=date_full_str,                             # e.g. 28
            module_code=f"{module.moduleCode}",
            module_name=module.moduleName,
            lesson_type=lesson.lessontype,
            start_time=start_t,
            end_time=end_t,
            location=loc_str
        ))

    # The frontend will now receive the entire week's schedule as one long list
    return results

# Monthly Timetable
@router.get("/lecturer/timetable/monthly", response_model=List[MonthlyTimetable])
def get_monthly_timetable(
    year: int = Query(..., description="The year to filter by (e.g., 2025)"),
    month: int = Query(..., description="The month to filter by (1-12)"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    lessons = db.query(Lesson.startDateTime, Module.moduleCode)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            cast(extract('year', Lesson.startDateTime), Integer) == year, 
            cast(extract('month', Lesson.startDateTime), Integer) == month, 
        )\
        .order_by(Lesson.startDateTime.asc())\
        .all()

    results = []

    for start_dt, module_code in lessons:
        
        results.append(MonthlyTimetable(
            date_of_month=start_dt.date(),
            module_code=module_code
        ))

    return results


@router.get("/lecturer/class/details", response_model=OverallClassAttendanceDetails)
def get_overall_class_attendance_details(
    lesson_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # 1. Fetch Lesson/Module/Enrollment Data
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

    # 2. Calculate Metrics (Attended, Late, Absent)

    # A. Attended Count (Unique distinct check-ins)
    attended_count = db.query(AttdCheck.studentID).filter(
        AttdCheck.lessonID == lesson_id
    ).distinct().count()

    # B. Late Arrivals Count (Check EntLeave against lesson start time)
    late_arrivals_count = db.query(EntLeave).filter(
        EntLeave.lessonID == lesson_id,
        EntLeave.enter > lesson.startDateTime + timedelta(minutes=5)
    ).count()

    # C. NEW: Present Count (Attended - Late Arrivals)
    present_count = attended_count - late_arrivals_count # 42 - 3 = 39 (Close to 38)

    # D. Absentees Count (Total Enrolled - Attended)
    # Note: Using min(Total, Attended) to avoid negative if enrollment is wrong
    absentees_count = max(0, total_enrolled - attended_count)
    
    # E. Attendance Rate
    attendance_rate = (attended_count / max(total_enrolled, 1) * 100.0)
    attendance_rate = round(min(attendance_rate, 100.0), 1)

    # 3. Assemble Header Strings
    subject_details_str = f"{module.moduleCode} - {module.moduleName}"
    
    time_str = lesson.startDateTime.strftime("%I:%M %p").lstrip('0')
    date_str = lesson.startDateTime.strftime("%d %b %Y")
    
    # Location (Using the corrected fields from your Lesson model)
    loc_str = f"Lab {lesson.building} (Room {lesson.room})" if lesson.building and lesson.room else "Online"
    lesson_details_str = f"{date_str} · {time_str} · {loc_str}"
    
    
    # 4. Generate Table Log (AttendanceDetailRow)
    
    # A. Get all enrolled students
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


    # 5. Return the final structure
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