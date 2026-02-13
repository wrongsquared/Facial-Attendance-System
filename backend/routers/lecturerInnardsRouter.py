from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc, or_, extract, cast, Integer, exists
from datetime import datetime,time, date, timedelta
from database.db_config import get_db
import csv
import uuid as uuid_module
import os
from dependencies.deps import get_current_user_id
from database.db import (
                         User, 
                         Student, 
                         Lesson, 
                         Module, 
                         AttdCheck, 
                         StudentModules,  
                         LecMod,
                         EntLeave,
                         GeneratedReport,
                         TutorialsGroup,
                         StudentTutorialGroup)

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
import os
import uuid as uuid_module
from fastapi.responses import FileResponse
router = APIRouter() 

@router.get("/lecturer/profile/view-basic", response_model=viewUserProfile)
def get_view_only_user_profile(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    user_record = db.query(User).filter(User.userID == user_id).first()
    
    if not user_record:
        raise HTTPException(status_code=404, detail="User profile not found in database.")

    return user_record

@router.put("/lecturer/profile/update", response_model=viewUserProfile)
def update_user_profile(
    updates: UserProfileUpdate,
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

    update_data = updates.model_dump(exclude_unset=True)

    # Apply the updates to the ORM object
    for key, value in update_data.items():
        setattr(user_record, key, value)
    
    # Commit and Refresh
    db.commit()
    db.refresh(user_record)
    
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
    
    start_date = criteria.date_from 
    end_date = criteria.date_to
    

    module_details = db.query(Module).filter(Module.moduleCode == criteria.module_code).first()
    
    if not module_details:
        raise HTTPException(status_code=404, detail=f"Module code not found: {criteria.module_code}")

    module_id = module_details.moduleID
    module_code = module_details.moduleCode
    module_name = module_details.moduleName
    
    # Identify the pool of relevant lessons (subquery for efficiency) with tutorial group info
    lesson_pool_query = db.query(Lesson.lessonID, Lesson.startDateTime, Lesson.lessontype, TutorialsGroup.tutorialGroupsID.label('tutorial_group_id'))\
    .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
    .outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
    .filter(
       # Ensure that LecMod record satisfies all conditions:
        # Taught by the current user
        LecMod.lecturerID == user_id, 
        # Belongs to the module looked up earlier
        LecMod.moduleID == module_id,
        # Falls within the date range (using the fixed date comparison)
        func.date(Lesson.startDateTime).between(start_date, end_date)
    )
    
    # Filter by tutorial group if specified
    if criteria.tutorial_group_id:
        lesson_pool_query = lesson_pool_query.filter(TutorialsGroup.tutorialGroupsID == criteria.tutorial_group_id)
    
    lesson_pool = lesson_pool_query.subquery()
        
    if not db.query(lesson_pool).first():
        raise HTTPException(status_code=404, detail="No relevant lessons found for the selected module and dates.")

    # Get all students enrolled in the selected module with tutorial group info
    enrolled_students_query = db.query(
        Student.studentID, 
        Student.name,
        TutorialsGroup.tutorialGroupsID.label('student_tutorial_group_id')
    )\
        .join(StudentModules, Student.studentID == StudentModules.studentID)\
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)\
        .outerjoin(TutorialsGroup, StudentTutorialGroup.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
        .filter(
            # Use the Module ID for the student enrollment join
            StudentModules.modulesID == module_id
        )
        
    # Filter by tutorial group if specified
    if criteria.tutorial_group_id:
        enrolled_students_query = enrolled_students_query.filter(TutorialsGroup.tutorialGroupsID == criteria.tutorial_group_id)
        
    enrolled_students = enrolled_students_query.all()
        

    
    report_data = []
    
    # Compile the detailed report row (Student-Session Data)
    for student_id, student_name, student_tutorial_group_id in enrolled_students:
        for lesson_id, lesson_start_time, lesson_type, lesson_tutorial_group_id in db.query(lesson_pool).all():
            # Skip if student is not in the same tutorial group as the lesson
            if student_tutorial_group_id and lesson_tutorial_group_id and student_tutorial_group_id != lesson_tutorial_group_id:
                continue
                # Check attendance record
            attendance_record = db.query(AttdCheck).filter(
                AttdCheck.studentID == student_id,
                AttdCheck.lessonID == lesson_id
            ).first()
        
            #  Determine status based on record existence
            if attendance_record:
                status_text = "Present"
            else:
                status_text = "Absent" # Default status
        
            # Apply the final status filter requested by the user
            if criteria.attendance_status != "All" and status_text != criteria.attendance_status:
                # If the user requested 'Present' but the status is 'Absent', skip this row.
                continue   

            # Get tutorial group name
            tutorial_group_name = "N/A"
            if lesson_tutorial_group_id:
                tutorial_group = db.query(TutorialsGroup).filter(TutorialsGroup.tutorialGroupsID == lesson_tutorial_group_id).first()
                if tutorial_group:
                    tutorial_group_name = f"Group {lesson_tutorial_group_id}"

            report_data.append({
                "Module Code": module_code, 
                "Module Name": module_name,
                "Student ID": student_id,
                "Student Name": student_name,
                "Tutorial Group": tutorial_group_name,
                "Lesson Type": lesson_type,
                "Date": lesson_start_time.strftime("%Y-%m-%d"),
                "Time": lesson_start_time.strftime("%H:%M"),
                "Attendance Status": status_text,
            })
            
    # CSV Generation

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


# Get report history for lecturer
@router.get("/lecturer/reports/history")
def get_report_history(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get previously generated reports for this lecturer"""
    reports = (
        db.query(GeneratedReport)
        .filter(GeneratedReport.lecturerID == user_id)
        .order_by(desc(GeneratedReport.generatedAt))
        .all()
    )
    
    return [
        {
            "id": report.reportID,
            "title": report.title,
            "date": report.generatedAt.strftime("%d %b %Y"),
            "tags": [report.reportType, report.filterStatus],
            "fileName": report.fileName
        }
        for report in reports
    ]


@router.post("/lecturer/reports/generate")
def generate_report(
    criteria: ReportCriteria,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Generate a report and save it, returning the report ID"""
    
    # First generate the report data using existing logic
    start_date = criteria.date_from 
    end_date = criteria.date_to
    
    module_details = db.query(Module).filter(Module.moduleCode == criteria.module_code).first()
    
    if not module_details:
        raise HTTPException(status_code=404, detail=f"Module code not found: {criteria.module_code}")

    module_id = module_details.moduleID
    module_code = module_details.moduleCode
    module_name = module_details.moduleName
    
    # Get lesson pool with tutorial group info
    lesson_pool_query = db.query(Lesson.lessonID, Lesson.startDateTime, Lesson.lessontype, TutorialsGroup.tutorialGroupsID.label('tutorial_group_id'))\
    .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
    .outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
    .filter(
        LecMod.lecturerID == user_id, 
        LecMod.moduleID == module_id,
        func.date(Lesson.startDateTime).between(start_date, end_date)
    )
    
    # Filter by tutorial group if specified
    if criteria.tutorial_group_id:
        lesson_pool_query = lesson_pool_query.filter(TutorialsGroup.tutorialGroupsID == criteria.tutorial_group_id)
    
    lesson_pool = lesson_pool_query.subquery()
        
    if not db.query(lesson_pool).first():
        raise HTTPException(status_code=404, detail="No relevant lessons found for the selected module and dates.")

    enrolled_students_query = db.query(
        Student.studentID, 
        Student.name,
        TutorialsGroup.tutorialGroupsID.label('student_tutorial_group_id')
    )\
        .join(StudentModules, Student.studentID == StudentModules.studentID)\
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)\
        .outerjoin(TutorialsGroup, StudentTutorialGroup.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
        .filter(StudentModules.modulesID == module_id)
        
    # Filter by tutorial group if specified
    if criteria.tutorial_group_id:
        enrolled_students_query = enrolled_students_query.filter(TutorialsGroup.tutorialGroupsID == criteria.tutorial_group_id)
        
    enrolled_students = enrolled_students_query.all()
    
    report_data = []
    
    for student_id, student_name, student_tutorial_group_id in enrolled_students:
        for lesson_id, lesson_start_time, lesson_type, lesson_tutorial_group_id in db.query(lesson_pool).all():
            # Skip if student is not in the same tutorial group as the lesson
            if student_tutorial_group_id and lesson_tutorial_group_id and student_tutorial_group_id != lesson_tutorial_group_id:
                continue
                
            attendance_record = db.query(AttdCheck).filter(
                AttdCheck.studentID == student_id,
                AttdCheck.lessonID == lesson_id
            ).first()
        
            status_text = "Present" if attendance_record else "Absent"
        
            if criteria.attendance_status != "All" and status_text != criteria.attendance_status:
                continue   

            # Get tutorial group name
            tutorial_group_name = "N/A"
            if lesson_tutorial_group_id:
                tutorial_group = db.query(TutorialsGroup).filter(TutorialsGroup.tutorialGroupsID == lesson_tutorial_group_id).first()
                if tutorial_group:
                    tutorial_group_name = f"Group {lesson_tutorial_group_id}"

            report_data.append({
                "Module Code": module_code, 
                "Module Name": module_name,
                "Student ID": student_id,
                "Student Name": student_name,
                "Tutorial Group": tutorial_group_name,
                "Lesson Type": lesson_type,
                "Date": lesson_start_time.strftime("%Y-%m-%d"),
                "Time": lesson_start_time.strftime("%H:%M"),
                "Attendance Status": status_text,
            })
            
    if not report_data:
        raise HTTPException(status_code=404, detail="No records match the selected criteria and status filter.")
        
    # Generate CSV content
    output = StringIO()
    fieldnames = list(report_data[0].keys())
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(report_data)
    csv_content = output.getvalue()
    
    # Create unique filename
    report_id_str = str(uuid_module.uuid4())[:6]
    filename = f"{module_code}_{criteria.report_type}_{criteria.date_from}_{report_id_str}.csv"
    
    # Ensure generated_reports directory exists
    reports_dir = os.path.join("generated_reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(reports_dir, filename)
    with open(file_path, "w", newline='', encoding='utf-8') as f:
        f.write(csv_content)
    
    # Create database record
    new_report = GeneratedReport(
        lecturerID=user_id,
        title=f"{module_code} - {criteria.report_type} Report",
        moduleCode=module_code,
        reportType=criteria.report_type,
        filterStatus=criteria.attendance_status,
        fileName=filename,
        filePath=file_path
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    return {"report_id": new_report.reportID}


# Download specific report by ID
@router.get("/lecturer/reports/download/{report_id}")
def download_report(
    report_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Download a specific report by ID"""
    
    report = db.query(GeneratedReport).filter(
        GeneratedReport.reportID == report_id,
        GeneratedReport.lecturerID == user_id  # Security: only allow downloading own reports
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check if file exists
    if not os.path.exists(report.filePath):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    return FileResponse(
        path=report.filePath,
        filename=report.fileName,
        media_type='text/csv'
    )


# Lecturer Attendance Log with Dynamic Filtering
@router.get("/lecturer/attendance-log", response_model=AttendanceLogResponse)
def get_lecturer_attendance_log_filtered(
    search_term: str = Query(None),
    module_code: str = Query(None),
    status: Literal['Present', 'Absent', 'Late'] = Query(None),
    date: date = Query(None),
    limit: int = Query(10),
    offset: int = Query(0),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    lecturer_uuid = uuid_module.UUID(user_id) if isinstance(user_id, str) else user_id
    now = datetime.now()

    student_in_group = exists().where(
        and_(
            StudentTutorialGroup.tutorialGroupID == Lesson.tutorialGroupID,
            StudentTutorialGroup.studentModulesID == StudentModules.studentModulesID
        )
    )

    query = (
        db.query(
            Lesson.lessonID,
            Lesson.building,
            Lesson.room,
            Lesson.startDateTime,
            Lesson.tutorialGroupID,
            Module.moduleCode,
            Student.studentNum,
            Student.name,
            Student.studentID,
            AttdCheck.AttdCheckID,
            AttdCheck.status.label("attd_status"),
            func.min(EntLeave.detectionTime).label("entry_time")
        )
        .select_from(Lesson)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        .join(StudentModules, Module.moduleID == StudentModules.modulesID)
        .join(Student, StudentModules.studentID == Student.studentID)
        # Polymorphic join to User is handled by Student.name/studentID
        
        .filter(
            or_(
                Lesson.tutorialGroupID == None,
                student_in_group
            )
        )
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == Student.studentID))
        .outerjoin(EntLeave, (EntLeave.lessonID == Lesson.lessonID) & (EntLeave.studentID == Student.studentID))
        .filter(LecMod.lecturerID == lecturer_uuid)
        .filter(Lesson.endDateTime < now)
    )

    if date:
        query = query.filter(Lesson.startDateTime.between(
            datetime.combine(date, time.min), 
            datetime.combine(date, time.max)
        ))
    if module_code:
        query = query.filter(Module.moduleCode == module_code)
    if search_term:
        query = query.filter(or_(
            Student.name.ilike(f"%{search_term}%"),
            Student.studentNum.ilike(f"%{search_term}%")
        ))

    query = query.group_by(
        Lesson.lessonID,
        Lesson.building,
        Lesson.room,
        Lesson.startDateTime,
        Lesson.tutorialGroupID,
        Module.moduleCode,
        Student.studentNum,
        Student.name,
        Student.studentID,
        AttdCheck.AttdCheckID,
        AttdCheck.status
    )
    
    results = query.order_by(Lesson.startDateTime.desc()).all()
    
    log_entries = []
    for (l_id, l_bldg, l_rm, l_start, l_tgroup, m_code, s_num, s_name, s_uuid, attd_id, attd_status, entry_time) in results:
        
        final_status = attd_status if attd_id else "Absent"
        
        if status and final_status != status:
            continue
        

        display_mod = f"{m_code} (T{l_tgroup})" if l_tgroup else m_code
        
        log_entries.append(AttendanceLogEntry(
            user_id=s_num,
            student_name=s_name,
            module_code=display_mod,
            status=final_status,
            date=l_start.strftime("%d %b %Y"),
            lesson_id=l_id,
            location=f"Blk {l_bldg or 'TBA'}, {l_rm or 'TBA'}",
            timestamp=entry_time.strftime("%I:%M %p").lstrip("0") if entry_time else "N/A",
            method="Camera Capture" if attd_id else "N/A"
        ))

    total_records = len(log_entries)
    return {
        "data": log_entries[offset : offset + limit],
        "total": total_records,
        "page": (offset // limit) + 1,
        "limit": limit
    }
# Detailed Attendance Record
@router.get("/lecturer/attendance/details/{lesson_id}/{student_num}", response_model=DetailedAttendanceRecord)
def get_detailed_attendance_record(
    lesson_id: int,
    student_num: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
    # Security: Verify this lecturer teaches this lesson
    lecturer_lesson = db.query(Lesson, LecMod)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .filter(Lesson.lessonID == lesson_id, LecMod.lecturerID == user_id)\
        .first()
    
    if not lecturer_lesson:
        raise HTTPException(status_code=403, detail="Access denied: You are not authorized to view this lesson's attendance.")
    
    # Base Query: Start from Student and fetch all related data
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
    
    # Check for Presence/Late Status,
    # Check for AttdCheck existence
    is_present = db.query(AttdCheck).filter(
        AttdCheck.lessonID == lesson_id, 
        AttdCheck.studentID == student.studentID
    ).first()

    # Check for Late Status (using the 5-minute rule)
    is_late = db.query(EntLeave).filter(
        EntLeave.lessonID == lesson_id, 
        EntLeave.studentID == student.studentID,
        EntLeave.detectionTime > lesson.startDateTime + timedelta(minutes=30)
    ).first()

    # C. Final Status Assignment
    if not is_present:
        status_str = 'Absent'
    elif is_late:
        status_str = 'Late'
    else:
        status_str = 'Present'
        
    entry_time_record = db.query(EntLeave.detectionTime).filter(EntLeave.lessonID == lesson_id, EntLeave.studentID == student.studentID).first()
    timestamp_str = (entry_time_record[0] if entry_time_record else lesson.startDateTime).strftime("%H:%M %p")
    # Assemble data
    # Location (Using the corrected fields from your Lesson model)
    camera_location_str = f"Building {lesson.building}, Room {lesson.room}" if lesson.building and lesson.room else "TBA"

    return DetailedAttendanceRecord( #Need to change this
        # Top Section
        student_name=student.name,
        user_id=student.studentNum, # Use the Student Number
        module_code=module.moduleCode,
        date=lesson.startDateTime.strftime("%d %b %Y"),
        
        # Details Section
        attendance_status=status_str,
        timestamp=timestamp_str,
        
        attendance_method='Biometric Scan', 
        camera_location=camera_location_str,
    )

# Daily Timetable
@router.get("/lecturer/timetable/daily", response_model=list[DailyTimetable])
def get_daily_timetable(
    date_str: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    try:
        selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    start_of_day = datetime.combine(selected_date, time.min)
    end_of_day = datetime.combine(selected_date, time.max)

    query_results = db.query(Lesson, Module, TutorialsGroup)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_of_day, end_of_day)
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    results = []

    for lesson, module, group in query_results:
        
        display_code = module.moduleCode
        if lesson.tutorialGroupID:
            display_code = f"{module.moduleCode} (T{lesson.tutorialGroupID})"

        if lesson.building and lesson.room:
            loc_str = f"Blk {lesson.building} {lesson.room}"
        elif lesson.building or lesson.room:
            loc_str = f"{lesson.building or ''}{lesson.room or ''}"
        else:
            loc_str = "Online"

        start_t = lesson.startDateTime.strftime("%I:%M %p").lstrip("0")
        end_t = lesson.endDateTime.strftime("%I:%M %p").lstrip("0")

        results.append(DailyTimetable(
            module_code=display_code,
            module_name=module.moduleName,
            lesson_type=lesson.lessontype, 
            start_time=start_t,
            end_time=end_t,
            location=loc_str
        ))

    return results

# Weekly Timetable 
@router.get("/lecturer/timetable/weekly", response_model=list[Weeklytimetable])
def get_weekly_timetable_flat(
    start_date_str: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    start_time = datetime.combine(start_date, time.min)
    end_time = datetime.combine(start_date + timedelta(days=6), time.max)
    
    query_results = db.query(Lesson, Module, TutorialsGroup)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_time, end_time) 
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    results = []

    for lesson, module, group in query_results:
        

        display_code = module.moduleCode
        if lesson.tutorialGroupID:
            display_code = f"{module.moduleCode} (T{lesson.tutorialGroupID})"
        

        if lesson.building and lesson.room:
            loc_str = f"Blk {lesson.building}  {lesson.room}"
        elif lesson.building or lesson.room:
            loc_str = f"{lesson.building or ''}{lesson.room or ''}"
        else:
            loc_str = "Online"
        
        start_t = lesson.startDateTime.strftime("%I:%M %p").lstrip("0")
        end_t = lesson.endDateTime.strftime("%I:%M %p").lstrip("0")
        
        day_name = lesson.startDateTime.strftime("%a") # e.g., "Mon"
        day_digit = lesson.startDateTime.strftime("%d") # e.g., "28"
        
        results.append(Weeklytimetable(
            day_of_week=day_name,
            date_of_day=day_digit,
            module_code=display_code,
            module_name=module.moduleName,
            lesson_type=lesson.lessontype,
            start_time=start_t,
            end_time=end_t,
            location=loc_str
        ))

    return results

# Monthly Timetable
@router.get("/lecturer/timetable/monthly", response_model=List[MonthlyTimetable])
def get_monthly_timetable(
    year: int = Query(..., description="The year to filter by (e.g., 2025)"),
    month: int = Query(..., description="The month to filter by (1-12)"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    lessons = db.query(Lesson, Module, TutorialsGroup)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
        .filter(
            LecMod.lecturerID == user_id,
            cast(extract('year', Lesson.startDateTime), Integer) == year, 
            cast(extract('month', Lesson.startDateTime), Integer) == month, 
        )\
        .order_by(Lesson.startDateTime.asc())\
        .all()

    results = []

    for lesson, module, group in lessons:
        
        display_code = module.moduleCode
        if lesson.tutorialGroupID:
            display_code = f"{module.moduleCode} (T{lesson.tutorialGroupID})"

        results.append(MonthlyTimetable(
            date_of_month=lesson.startDateTime.date(),
            module_code=display_code
        ))

    return results


@router.get("/lecturer/reports/modules")
def get_lecturer_modules(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """
    Fetches a list of modules assigned to this lecturer with full module details.
    """
    results = (
        db.query(Module)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .filter(LecMod.lecturerID == user_id)
        .distinct()
        .all()
    )
    
    return [{
        "moduleID": module.moduleID,
        "moduleName": module.moduleName, 
        "moduleCode": module.moduleCode
    } for module in results]

# Debug endpoint to check lessons data
@router.get("/lecturer/debug/lessons")
def debug_lessons(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Debug endpoint to check what lessons exist for this lecturer"""
    lessons = (
        db.query(Lesson, Module)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        .filter(LecMod.lecturerID == user_id)
        .order_by(Lesson.startDateTime)
        .all()
    )
    
    return [
        {
            "lessonID": lesson.lessonID,
            "moduleCode": module.moduleCode,
            "moduleName": module.moduleName,
            "startDateTime": lesson.startDateTime.isoformat(),
            "endDateTime": lesson.endDateTime.isoformat(),
            "lessonType": lesson.lessonType
        }
        for lesson, module in lessons
    ]