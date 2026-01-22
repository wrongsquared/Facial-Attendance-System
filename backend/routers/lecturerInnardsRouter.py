from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc, or_, extract, cast, Integer
from datetime import datetime,time, date, timedelta
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from database.db import (
                         User, 
                         Student, 
                         Lesson, 
                         Module, 
                         AttdCheck, 
                         StudentModules,  
                         LecMod,
                         EntLeave,)

from schemas import(Literal,
                    viewUserProfile,
                    UserProfileUpdate,
                    ReportCriteria,
                    AttendanceLogEntry,
                    DetailedAttendanceRecord,
                    DailyTimetable,
                    Weeklytimetable,
                    MonthlyTimetable,
                    AttendanceLogResponse)
from io import StringIO
from routers import studentDashboardRouter
from typing import Union, List
import csv

router = APIRouter() 




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
    
    # Find the User Record
    user_record = db.query(User).filter(User.userID == user_id).first()
    
    if not user_record:
        raise HTTPException(status_code=404, detail="User profile not found.")

    # Get the non-None values from the Pydantic input model
    # We use .model_dump(exclude_none=True) to only get fields the user submitted
    update_data = updates.model_dump(exclude_unset=True)

    # Apply the updates to the ORM object
    for key, value in update_data.items():
        # Use setattr to dynamically update the ORM attribute (e.g., user_record.name = "new name")
        setattr(user_record, key, value)
    
    # Commit and Refresh
    db.commit()
    db.refresh(user_record)
    
    # Return the full, updated profile
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
    
    # Define time boundaries and retrieve module details
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
        
        # Taught by the current user
        LecMod.lecturerID == user_id, 
        
        # Belongs to the module we looked up earlier
        LecMod.moduleID == module_id,
        
        # Falls within the date range (using the fixed date comparison)
        func.date(Lesson.startDateTime).between(start_date, end_date)
    ).subquery()
        
    if not db.query(lesson_pool).first():
        raise HTTPException(status_code=404, detail="No relevant lessons found for the selected module and dates.")

    # Get all students enrolled in the selected module
    enrolled_students = db.query(Student.studentID, Student.name)\
        .join(StudentModules, Student.studentID == StudentModules.studentID)\
        .filter(
            # Use the Module ID for the student enrollment join
            StudentModules.modulesID == module_id
        ).all()
        

    
    report_data = []
    
    # Compile the detailed report row (Student-Session Data)
    for student_id, student_name in enrolled_students:
        for lesson_id, lesson_start_time in db.query(lesson_pool).all():
            
            # This is where the status check happens, and it's missing!
            attendance_record = db.query(AttdCheck).filter(
                AttdCheck.studentID == student_id,
                AttdCheck.lessonID == lesson_id
            ).first()
        
            #  Determine status based on record existence
            if attendance_record:
                status_text = "Present"
            else:
                status_text = "Absent" # Default status if no record is found
        
            # Apply the final status filter requested by the user
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
            
    # Handle Download (CSV Generation)

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
@router.get("/lecturer/attendance-log", response_model=AttendanceLogResponse)
def get_lecturer_attendance_log_filtered(
    search_term: str = Query(None, description="Search by Student Name or ID"),
    module_code: str = Query(None, description="Filter by Module Code"),
    status: Literal['Present', 'Absent', 'Late'] = Query(None, description="Filter by Status"),
    date: date = Query(None, description="Filter by specific date (YYYY-MM-DD)"),
    limit: int = Query(10, gt=0),
    offset: int = Query(0, ge=0),
    
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # 1. BUILD THE QUERY
    # We fetch the Lesson, the Student, and check for Attendance/Entry records all at once.
    query = (
        db.query(
            Lesson,
            Module.moduleCode,
            Student.studentNum,
            Student.name,
            AttdCheck.AttdCheckID, # If this exists, they are Present
            AttdCheck.remarks,
            func.min(EntLeave.enter).label("entry_time") # Get the FIRST time they entered
        )
        .select_from(Lesson)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        
        # Link Lesson -> Module -> Enrolled Students
        # This ensures we get a row for every student, even if they are Absent
        .join(StudentModules, Module.moduleID == StudentModules.modulesID)
        .join(Student, StudentModules.studentID == Student.userID)
        
        # Check if they have an Attendance Record (Left Join)
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == Student.userID))
        
        # Check their Entry Logs to see if they were late (Left Join)
        .outerjoin(EntLeave, (EntLeave.lessonID == Lesson.lessonID) & (EntLeave.studentID == Student.userID))
        
        # Base Filters: Current Lecturer & Past Lessons only
        .filter(LecMod.lecturerID == user_id)
        .filter(Lesson.endDateTime < datetime.now())
        
        # Grouping is required because we used an aggregate function: min(entry_time)
        .group_by(
            Lesson.lessonID, 
            Module.moduleCode, 
            Student.studentNum, 
            Student.name, 
            AttdCheck.AttdCheckID,
            AttdCheck.remarks
        )
    )

    # 2. APPLY FILTERS (SQL Side)
    
    # Date Filter
    if date:
        start_of_day = datetime.combine(date, time.min)
        end_of_day = datetime.combine(date, time.max)
        query = query.filter(Lesson.startDateTime.between(start_of_day, end_of_day))

    # Module Code Filter
    if module_code:
        query = query.filter(Module.moduleCode == module_code)

    # Search Filter (Name or ID)
    if search_term:
        search_like = f"%{search_term}%"
        query = query.filter(or_(
            Student.name.ilike(search_like),
            Student.studentNum.ilike(search_like)
        ))

    # 3. EXECUTE QUERY
    # We fetch ALL matching rows here so we can process the 'Late' logic in Python
    # Sorting by newest lesson first
    results = query.order_by(Lesson.startDateTime.desc()).all()

    # 4. PROCESS LOGIC (Python Side)
    log_entries = []
    
    for lesson, mod_code, s_id, s_name, attd_id, remarks, entry_time in results:
        
        # --- CALCULATE STATUS ---
        current_status = "Absent"
        
        if attd_id:
            current_status = "Present"
            
            # Late Logic: If they entered more than 15 mins after start
            # entry_time comes from the database (EntLeave table)
            if entry_time and entry_time > (lesson.startDateTime + timedelta(minutes=15)):
                current_status = "Late"
        loc = "Building: "+ lesson.building + " Room: " + lesson.room

        entry_time = str(entry_time)
        # --- FILTER BY STATUS ---
        # If the user requested a specific status (e.g. "Late"), skip rows that don't match
        if status and current_status != status:
            continue

        # --- ADD TO LIST ---
        log_entries.append(AttendanceLogEntry(
            user_id=s_id,
            student_name=s_name,
            module_code=mod_code,
            status=current_status,
            date=lesson.startDateTime.strftime("%d %b %Y"),
            lesson_id=lesson.lessonID,
            location = loc,
            timestamp = entry_time,
            method = remarks
        ))
    total_records = len(log_entries)
    paginated_data = log_entries[offset : offset + limit]

    return {"data": paginated_data, "total": total_records, "page": (offset // limit) + 1,"limit": limit}

# Detailed Attendance Record
@router.get("/lecturer/attendance/details/{lesson_id}/{student_num}", response_model=DetailedAttendanceRecord)
def get_detailed_attendance_record(
    lesson_id: int,
    student_num: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # Base Query: Start from Student and fetch all related data
    
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
    
    # Check for Presence/Late Status (Simplified Logic from the Log Query)
    # Check for AttdCheck existence
    is_present = db.query(AttdCheck).filter(
        AttdCheck.lessonID == lesson_id, 
        AttdCheck.studentID == student_num
    ).first()

    # Check for Late Status (using the 5-minute rule)
    is_late = db.query(EntLeave).filter(
        EntLeave.lessonID == lesson_id, 
        EntLeave.studentID == student_num,
        EntLeave.enter > lesson.startDateTime + timedelta(minutes=30)
    ).first()

    # C. Final Status Assignment
    if not is_present:
        status_str = 'Absent'
    elif is_late:
        status_str = 'Late'
    else:
        status_str = 'Present'
        
    # Get Timestamp (Use EntLeave.enter time if available, otherwise lesson start)
    entry_time_record = db.query(EntLeave.enter).filter(EntLeave.lessonID == lesson_id, EntLeave.studentID == student_num).first()
    timestamp_str = (entry_time_record[0] if entry_time_record else lesson.startDateTime).strftime("%H:%M %p")


    # Assemble and Return Data (Using Placeholders for Missing DB Fields)
    
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
    
    # Query Lessons
    upcoming_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_of_day, end_of_day) # Filter for the single day
        )\
        .order_by(Lesson.startDateTime)\
        .all()
    # Format the data
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
    
    # Query Lessons (Fetch all 7 days of data)
    upcoming_lessons = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_time, end_time) 
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    # Format the data into a single, flat list
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

@router.get("/lecturer/modules", response_model=List[str])
def get_lecturer_modules(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """
    Fetches a list of unique module codes (e.g. ['CSCI334', 'CSCI203']) 
    assigned to this lecturer.
    """
    results = (
        db.query(Module.moduleCode)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .filter(LecMod.lecturerID == user_id)
        .distinct() # Remove duplicates if multiple classes exist for one module
        .all()
    )
    
    # SQLAlchemy returns tuples like [('CSCI334',), ('CSCI203',)], flatten it:
    return [row[0] for row in results]