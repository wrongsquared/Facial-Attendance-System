from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc
from datetime import datetime
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
                            UserProfileUpdate)
from routers import studentDashboardRouter

router = APIRouter() 

# total module taught by me

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
    now = datetime.datetime.now()
    next_week = now + datetime.timedelta(days=7)

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
        
        # 1. Handle Location (Combine Building + Room)
        bldg = lesson.building or ""
        rm = lesson.room or ""
        
        if bldg and rm:
            loc_str = f"{bldg}-{rm}"
        else:
            loc_str = bldg + rm 
            
        if not loc_str:
            loc_str = "Online"

        # 2. Create the Pydantic Object
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
            Lesson.endDateTime < datetime.datetime.now()
        ).count()

        # 5. Math
        total_capacity += (real_student_count * lesson_count)

        unique_checkins = db.query(AttdCheck.lessonID, AttdCheck.studentID)\
            .join(Lesson).filter(
                Lesson.lecModID == lm.lecModID,
                Lesson.endDateTime < datetime.datetime.now()
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
    now = datetime.datetime.now()
    seven_days_ago = now - datetime.timedelta(days=7)

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
            Lesson.endDateTime < datetime.datetime.now()
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
    today = datetime.datetime.now().date()
    start_of_day = datetime.datetime.combine(today, datetime.time.min)
    end_of_day = datetime.datetime.combine(today, datetime.time.max)
    now = datetime.datetime.now()

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
    now = datetime.datetime.now()
    thirty_days_ago = now - datetime.timedelta(days=30) 

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