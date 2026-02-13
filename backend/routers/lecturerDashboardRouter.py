import os
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, aliased, joinedload
from sqlalchemy import and_, func, case, desc, or_, extract, cast, Integer
from datetime import datetime,time, date, timedelta
from database.db_config import get_db
import pandas as pd
import uuid
import os
from dependencies.deps import get_current_user_id
from database.db import (#This was really long so I had to bracket it
                         User, 
                         Student, 
                         Lesson, 
                         Module, 
                         AttdCheck, 
                         StudentModules,  
                         LecMod,
                         EntLeave, 
                         GeneratedReport,
                         StudentTutorialGroup,
                         TutorialsGroup)
import uuid
from fastapi.responses import FileResponse

from schemas import( timetableEntry, 
                            AttendanceOverviewCard, 
                            RecentSessionsCardData, 
                            RecentSessionRecord, 
                            courseoverviewcard, 
                            ClassToday,
                            viewUserProfile,
                            UserProfileUpdate,
                            ReportCriteria,
                            DetailedAttendanceRecord,
                            DailyTimetable,
                            Weeklytimetable,
                            MonthlyTimetable,
                            AttendanceDetailRow,
                            ReportHistoryEntry,
                            OverallClassAttendanceDetails)
from routers import studentDashboardRouter
from typing import List
import pandas as pd

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

    start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    next_week = start_of_today + timedelta(days=7)

    upcoming_lessons = db.query(Lesson, Module, TutorialsGroup)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime >= start_of_today,
            Lesson.startDateTime <= next_week
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    results = []
    for lesson, module, group in upcoming_lessons:
        
        display_code = module.moduleCode
        if lesson.tutorialGroupID:
            display_code = f"{module.moduleCode} (T{lesson.tutorialGroupID})"

        if lesson.building and lesson.room:
            loc_str = f"Blk {lesson.building}, {lesson.room}"
        elif lesson.building or lesson.room:
            loc_str = f"{lesson.building or ''}{lesson.room or ''}"
        else:
            loc_str = "Online"

        entry = timetableEntry(
            module_code=display_code,
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
    now = datetime.now()

    total_capacity = (
        db.query(func.count(Lesson.lessonID))
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(StudentModules, LecMod.moduleID == StudentModules.modulesID)
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.endDateTime < now,
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID 
            )
        )
        .scalar()
    ) or 0


    total_actual_checkins = (
        db.query(func.count(AttdCheck.AttdCheckID))
        .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.endDateTime < now
        )
        .scalar()
    ) or 0


    percentage = 0.0
    if total_capacity > 0:

        valid_checkins = min(total_actual_checkins, total_capacity)
        percentage = (valid_checkins / total_capacity) * 100.0

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

    # Count the unique Lesson IDs
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

# Course Overview Card
@router.get("/lecturer/dashboard/my-courses-overview", response_model=list[courseoverviewcard])
def get_lecturer_courses_overview(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    lec_mods = db.query(LecMod).filter(LecMod.lecturerID == user_id).all()
    
    results = []
    now = datetime.now()

    for lm in lec_mods:
        module = lm.modules
        

        enrolled_count = db.query(StudentModules).filter(
            StudentModules.modulesID == module.moduleID
        ).count()


        past_lessons = db.query(Lesson).filter(
            Lesson.lecModID == lm.lecModID,
            Lesson.endDateTime < now
        ).all()

        total_expected_attendances = 0
        total_actual_attendances = 0

        for lesson in past_lessons:
            if lesson.tutorialGroupID:
                expected = db.query(StudentTutorialGroup).filter(
                    StudentTutorialGroup.tutorialGroupID == lesson.tutorialGroupID
                ).count()
            else:

                expected = enrolled_count
            
            total_expected_attendances += expected

            actual = db.query(AttdCheck).filter(
                AttdCheck.lessonID == lesson.lessonID
            ).count()
            
            total_actual_attendances += actual

        rate = (total_actual_attendances / total_expected_attendances * 100.0) if total_expected_attendances > 0 else 0.0

        results.append(courseoverviewcard(
            module_code=module.moduleCode,
            module_name=module.moduleName,
            overall_attendance_rate=round(rate, 1), 
            students_enrolled=enrolled_count
        ))

    return results

#Upcoming class today   
@router.get("/lecturer/dashboard/classes-today", response_model=list[ClassToday])
def get_classes_today(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    now = datetime.now() 
    today = now.date()
    start_of_day = datetime.combine(today, time.min) 
    end_of_day = datetime.combine(today, time.max)


    lessons_today = db.query(Lesson, Module)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.startDateTime.between(start_of_day, end_of_day)
        )\
        .order_by(Lesson.startDateTime)\
        .all()

    results = []
    
    for lesson, module in lessons_today:
        if lesson.tutorialGroupID:
            total_enrolled = db.query(StudentTutorialGroup).filter(
                StudentTutorialGroup.tutorialGroupID == lesson.tutorialGroupID
            ).count()
            lesson_label = " (Tutorial)"
        else:
            total_enrolled = db.query(StudentModules).filter(
                StudentModules.modulesID == module.moduleID
            ).count()
            lesson_label = ""

        present_count = db.query(AttdCheck.studentID)\
            .filter(AttdCheck.lessonID == lesson.lessonID)\
            .distinct().count()

        if lesson.endDateTime < now:
            status_str = 'Completed'
            attendance_display = f"{present_count}/{total_enrolled} present"
        elif lesson.startDateTime <= now <= lesson.endDateTime:
            status_str = 'Live'
            attendance_display = f"{present_count}/{total_enrolled} present (Live)"
        else:
            status_str = 'Pending'
            attendance_display = f"0/{total_enrolled} enrolled"

        loc_str = f"Building {lesson.building}, Room {lesson.room}" if lesson.building and lesson.room else "Online"
        time_range_str = f"{lesson.startDateTime.strftime('%I:%M %p')} - {lesson.endDateTime.strftime('%I:%M %p')}"

        results.append(ClassToday(
            module_code=f"{module.moduleCode}{lesson_label}",
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
    now = datetime.now()
    thirty_days_ago = now - timedelta(days=30) 

    completed_lessons = (
        db.query(Lesson, Module)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        .filter(
            LecMod.lecturerID == user_id,
            Lesson.endDateTime < now,
            Lesson.startDateTime >= thirty_days_ago 
        )
        .order_by(Lesson.startDateTime.desc())
        .limit(10)
        .all()
    )

    results = []

    for lesson, module in completed_lessons:
        
        if lesson.tutorialGroupID is None:
            # It's a Lecture: Expect everyone enrolled in the module
            expected_count = db.query(func.count(StudentModules.studentModulesID)).filter(
                StudentModules.modulesID == module.moduleID
            ).scalar() or 0
        else:
            # It's a Tutorial: Expect only members of this specific Tutorial group
            expected_count = db.query(func.count(StudentTutorialGroup.sTutorialGroupsID)).filter(
                StudentTutorialGroup.tutorialGroupID == lesson.tutorialGroupID
            ).scalar() or 0

        attended_count = db.query(func.count(AttdCheck.AttdCheckID)).filter(
            AttdCheck.lessonID == lesson.lessonID
        ).scalar() or 0

        rate = 0.0
        if expected_count > 0:
            rate = (attended_count / expected_count) * 100.0
            rate = min(rate, 100.0)

        results.append(RecentSessionRecord(
            lessonID=lesson.lessonID,
            subject=f"{module.moduleCode} - {module.moduleName} ({lesson.lessontype})",
            date=lesson.startDateTime.strftime("%d %b %Y"),
            time=lesson.startDateTime.strftime("%I:%M %p").lstrip("0"),
            attended=attended_count,
            total=expected_count,
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
    user_record = db.query(User).filter(User.userID == user_id).first()
    
    if not user_record:
        raise HTTPException(status_code=404, detail="User profile not found in database.")

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

    update_data = updates.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(user_record, key, value)
    
    # Commit and Refresh
    db.commit()
    db.refresh(user_record)
    
    # Return the full, updated profile
    return user_record

UPLOAD_DIR = "generated_reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/lecturer/reports/generate")
def generate_report(
    criteria: ReportCriteria,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Generates a CSV report, saves it locally, logs it to DB, and returns the Report ID.
    """
    
    # Validate Module
    module_details = db.query(Module).filter(Module.moduleCode == criteria.module_code).first()
    if not module_details:
        raise HTTPException(status_code=404, detail="Module not found")
    
    module_id = module_details.moduleID

    # Build the lessons query with explicit joins
    lessons_query = db.query(Lesson, TutorialsGroup.tutorialGroupsID.label('tutorial_group_id')).join(LecMod, Lesson.lecModID == LecMod.lecModID).outerjoin(TutorialsGroup, Lesson.tutorialGroupID == TutorialsGroup.tutorialGroupsID).filter(
        LecMod.lecturerID == user_id,
        LecMod.moduleID == module_id,
        func.date(Lesson.startDateTime).between(criteria.date_from, criteria.date_to)
    )
    
    # Add tutorial group filter if specified
    if criteria.tutorial_group_id is not None:
        lessons_query = lessons_query.filter(Lesson.tutorialGroupID == criteria.tutorial_group_id)
    
    lessons = lessons_query.order_by(Lesson.startDateTime).all()
    
    if not lessons:
        # Check if the lecturer teaches this module at all
        lecturer_teaches_module = db.query(LecMod).filter(
            LecMod.lecturerID == user_id,
            LecMod.moduleID == module_id
        ).first()
        
        if not lecturer_teaches_module:
            raise HTTPException(
                status_code=404, 
                detail=f"You are not assigned to teach module {criteria.module_code}"
            )
        
        # Check if there are any lessons for this module (regardless of date)
        any_lessons = db.query(Lesson).join(LecMod, Lesson.lecModID == LecMod.lecModID).filter(
            LecMod.lecturerID == user_id,
            LecMod.moduleID == module_id
        ).first()
        
        if not any_lessons:
            raise HTTPException(
                status_code=404, 
                detail=f"No lessons scheduled for module {criteria.module_code}. Please contact administrator."
            )
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"No lessons found for module {criteria.module_code} between {criteria.date_from} and {criteria.date_to}. Try a different date range."
            )

    if criteria.tutorial_group_id is not None:
        # If tutorial group is specified, only get students enrolled in that specific tutorial group
        students_query = db.query(Student).join(
            StudentModules, Student.studentID == StudentModules.studentID
        ).join(
            StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID
        ).filter(
            StudentModules.modulesID == module_id,
            StudentTutorialGroup.tutorialGroupID == criteria.tutorial_group_id
        )
    else:
        # Get tutorial group IDs that have lessons in our date range
        lesson_tutorial_groups = db.query(Lesson.tutorialGroupID).join(
            LecMod, Lesson.lecModID == LecMod.lecModID
        ).filter(
            LecMod.lecturerID == user_id,
            LecMod.moduleID == module_id,
            func.date(Lesson.startDateTime).between(criteria.date_from, criteria.date_to),
            Lesson.tutorialGroupID.isnot(None)
        ).distinct().all()
        
        lesson_tutorial_group_ids = [tg[0] for tg in lesson_tutorial_groups if tg[0] is not None]
        
        if lesson_tutorial_group_ids:
            students_query = db.query(Student).join(
                StudentModules, Student.studentID == StudentModules.studentID
            ).join(
                StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID
            ).filter(
                StudentModules.modulesID == module_id,
                StudentTutorialGroup.tutorialGroupID.in_(lesson_tutorial_group_ids)
            )
        else:
            students_query = db.query(Student).join(
                StudentModules, Student.studentID == StudentModules.studentID
            ).filter(
                StudentModules.modulesID == module_id
            )
    
    students = students_query.distinct().all()
    
    if not students:
        if criteria.tutorial_group_id is not None:
            # Check if tutorial group exists for this module
            tutorial_group_exists = db.query(TutorialsGroup).join(Lesson, TutorialsGroup.tutorialGroupsID == Lesson.tutorialGroupID).join(LecMod, Lesson.lecModID == LecMod.lecModID).filter(
                LecMod.moduleID == module_id,
                TutorialsGroup.tutorialGroupsID == criteria.tutorial_group_id
            ).first()
            
            if not tutorial_group_exists:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Tutorial group {criteria.tutorial_group_id} has no lessons for module {criteria.module_code} in the specified date range"
                )
            else:
                # Tutorial group has lessons but no students enrolled
                raise HTTPException(
                    status_code=404, 
                    detail=f"No students enrolled in tutorial group {criteria.tutorial_group_id} for module {criteria.module_code}"
                )
        else:
            # No tutorial group specified but still no students found
            raise HTTPException(
                status_code=404, 
                detail=f"No students found who should attend the lessons for module {criteria.module_code} in the specified date range. This may indicate that no tutorial groups have both lessons and enrolled students."
            )

    # Prepare Data (Pandas DataFrame)
    is_monthly = (criteria.report_type == "Monthly") or (criteria.date_from != criteria.date_to)
    
    df = None
    
    if is_monthly:
        # Monthly Report: Show all students enrolled in the module 
        # (filtered by tutorial group if specified)
        data = []
        for stu in students:
            row = {"Student ID": stu.studentNum, "Name": stu.name}
            present_count = 0
            
            for lesson_data in lessons:
                # Always extract lesson from tuple since our query returns (Lesson, tutorial_group_id)
                lesson = lesson_data[0]
                col_date = lesson.startDateTime.strftime("%d-%b") # "12-Jan"
                
                # Check Attendance for this specific student and lesson
                # only include students who are enrolled in the module
                # If tutorial group is specified, only students in that tutorial group are included
                att = db.query(AttdCheck).filter_by(studentID=stu.studentID, lessonID=lesson.lessonID).first()
                ent = db.query(EntLeave).filter_by(studentID=stu.studentID, lessonID=lesson.lessonID).first()
                
                status = "Absent"
                if att:
                    status = "Present"
                    if ent and ent.detectionTime > lesson.startDateTime + timedelta(minutes=5):
                        status = "Late"
                    present_count += 1
                
                row[col_date] = status
            
            # Calculate Percentage
            total = len(lessons)
            row["Attendance %"] = f"{int((present_count/total)*100)}%" if total > 0 else "0%"
            data.append(row)
        
        df = pd.DataFrame(data)
        # Reorder columns: ID, Name, [Dates], %
        lesson_dates = []
        for lesson_data in lessons:
            # Always extract lesson from tuple since our query returns (Lesson, tutorial_group_id)
            lesson = lesson_data[0]
            lesson_dates.append(lesson.startDateTime.strftime("%d-%b"))
        cols = ["Student ID", "Name"] + lesson_dates + ["Attendance %"]
        # Filter cols that actually exist in data
        df = df[[c for c in cols if c in df.columns]]

    else:
        # Daily Report: Show detailed attendance for a specific day
        # Only includes students enrolled in the module
        data = []
        target_lesson, target_tutorial_group_id = lessons[0] 
        
        
        tutorial_group_name = "N/A"
        if target_tutorial_group_id:
            tutorial_group = db.query(TutorialsGroup).filter(TutorialsGroup.tutorialGroupsID == target_tutorial_group_id).first()
            if tutorial_group:
                tutorial_group_name = f"Group {target_tutorial_group_id}"
        
        # Process each student enrolled in the module
        for stu in students:
            ent = db.query(EntLeave).filter_by(studentID=stu.studentID, lessonID=target_lesson.lessonID).first()
            
            status = "Absent"
            t_in, t_out = "-", "-"
            
            if ent:
                status = "Present"
                if ent.detectionTime:
                    t_in = ent.detectionTime.strftime("%H:%M")
                    if ent.detectionTime > target_lesson.startDateTime + timedelta(minutes=5):
                        status = "Late"
                t_out = "N/A"  # Exit time not tracked in current schema

            # Filter Check
            if criteria.attendance_status != "All" and status != criteria.attendance_status:
                continue
                
            data.append({
                "Student ID": stu.studentNum,
                "Name": stu.name,
                "Tutorial Group": tutorial_group_name,
                "Lesson Type": target_lesson.lessontype,
                "Date": target_lesson.startDateTime.strftime("%Y-%m-%d"),
                "Status": status,
                "Time In": t_in,
                "Time Out": t_out
            })
            
        df = pd.DataFrame(data)

    # Save CSV to Disk
    filename = f"{criteria.module_code}_{criteria.report_type}_{criteria.date_from}_{uuid.uuid4().hex[:6]}.csv"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Write CSV
    df.to_csv(filepath, index=False)

    # Save to DB
    new_report = GeneratedReport(
        lecturerID=uuid.UUID(user_id),
        moduleCode=criteria.module_code,
        title=f"{criteria.module_code} - {criteria.report_type}",
        reportType=criteria.report_type,
        filterStatus=criteria.attendance_status,
        fileName=filename,
        filePath=filepath
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    # Return JSON with ID
    return {
        "status": "success",
        "message": "Report generated successfully",
        "report_id": new_report.reportID 
    }

@router.get("/lecturer/reports/download/{report_id}")
def download_generated_report(
    report_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> FileResponse:  
    report = db.query(GeneratedReport).filter(
        GeneratedReport.reportID == report_id,
        GeneratedReport.lecturerID == user_id 
    ).first()
    
    if not report or not os.path.exists(report.filePath):
        raise HTTPException(status_code=404, detail="File not found")

    # Media Type for CSV
    return FileResponse(
        path=report.filePath, 
        filename=report.fileName,
        media_type='text/csv' 
    )

# Detailed Attendance Record
@router.get("/lecturer/attendance/details/{lesson_id}/{student_num}", response_model=DetailedAttendanceRecord)
def get_detailed_attendance_record(
    lesson_id: int,
    student_num: str, 
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    
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
    
    is_present = db.query(AttdCheck).filter(
        AttdCheck.lessonID == lesson_id, 
        AttdCheck.studentID == student_num
    ).first()

    is_late = db.query(EntLeave).filter(
        EntLeave.lessonID == lesson_id, 
        EntLeave.studentID == student_num,
        EntLeave.detectionTime > lesson.startDateTime + timedelta(minutes=5)
    ).first()

    if not is_present:
        status_str = 'Absent'
    elif is_late:
        status_str = 'Late'
    else:
        status_str = 'Present'
        
    entry_time_record = db.query(EntLeave.detectionTime).filter(EntLeave.lessonID == lesson_id, EntLeave.studentID == student_num).first()
    timestamp_str = (entry_time_record[0] if entry_time_record else lesson.startDateTime).strftime("%H:%M %p")


    camera_location_str = f"Building {lesson.building}, Room {lesson.room}" if lesson.building and lesson.room else "TBA"

    return DetailedAttendanceRecord(
        # Top Section
        student_name=student.name,
        user_id=student.studentNum, # Use the Student Number
        module_code=module.moduleCode,
        date=lesson.startDateTime.strftime("%d %b %Y"),
        
        # Details Section
        attendance_status=status_str,
        live_check='Passed', 
        timestamp=timestamp_str,
        virtual_tripwire='Triggered', 
        attendance_method='Biometric Scan', 
        camera_location=camera_location_str,
        verification_type='Multi-person group verification'
    )

# Overall Class Attendance Details
@router.get("/lecturer/class/details", response_model=OverallClassAttendanceDetails)
def get_overall_class_attendance_details(
    lesson_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    lesson_module = db.query(Lesson, Module, LecMod)\
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
        .join(Module, LecMod.moduleID == Module.moduleID)\
        .filter(Lesson.lessonID == lesson_id, LecMod.lecturerID == user_id)\
        .first()
    
    if not lesson_module:
        raise HTTPException(status_code=404, detail="Lesson not found or access denied.")
        
    lesson, module, lecmod = lesson_module

    if lesson.tutorialGroupID:
        all_students = db.query(Student)\
            .join(StudentModules, Student.studentID == StudentModules.studentID)\
            .join(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)\
            .filter(StudentTutorialGroup.tutorialGroupID == lesson.tutorialGroupID)\
            .all()
    else:
        all_students = db.query(Student)\
            .join(StudentModules, Student.studentID == StudentModules.studentID)\
            .filter(StudentModules.modulesID == module.moduleID)\
            .all()
    
    calc_present = 0
    calc_late = 0
    calc_absent = 0
    attendance_log_rows = []
    
    for student in all_students:
        attd = db.query(AttdCheck).filter(
            AttdCheck.lessonID == lesson_id, 
            AttdCheck.studentID == student.studentID
        ).first()
        
        ent_leave = db.query(EntLeave).filter(
            EntLeave.lessonID == lesson_id, 
            EntLeave.studentID == student.studentID
        ).order_by(EntLeave.detectionTime.asc()).first()

        check_in_str = ent_leave.detectionTime.strftime("%I:%M %p").lstrip('0') if ent_leave else "-"
        
        if attd:
            status = attd.status 
            if status == 'Present': calc_present += 1
            elif status == 'Late': calc_late += 1
        else:
            status = 'Absent'
            calc_absent += 1

        attendance_log_rows.append(AttendanceDetailRow(
            user_id=student.studentNum,
            student_name=student.name,
            check_in_time=check_in_str,
            status=status
        ))

    # Final Calculations
    total_enrolled = len(all_students)
    calc_attended = calc_present + calc_late
    attendance_rate = (calc_attended / total_enrolled * 100.0) if total_enrolled > 0 else 0.0

    # Build Response
    group_suffix = f" (Group {lesson.tutorialGroupID})" if lesson.tutorialGroupID else ""
    
    return OverallClassAttendanceDetails(
        subject_details=f"{module.moduleCode} - {module.moduleName}{group_suffix}",
        lesson_details=(
            f"{lesson.startDateTime.strftime('%d %b %Y')} · "
            f"{lesson.startDateTime.strftime('%I:%M %p').lstrip('0')} · "
            f"Bldg {lesson.building or 'TBA'}, Rm {lesson.room or 'TBA'}"
        ),
        attended_count=calc_attended,
        total_enrolled=total_enrolled,
        attendance_rate=round(attendance_rate, 1),
        Present_count=calc_present,
        late_arrivals=calc_late,
        absentees=calc_absent,
        attendance_log=attendance_log_rows
    )

@router.get("/lecturer/modules")
def get_lecturer_modules(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Fetches all modules taught by the lecturer.
    """
    modules = db.query(Module).join(LecMod).filter(
        LecMod.lecturerID == user_id
    ).all()
    
    return modules  

router.include_router(studentDashboardRouter.router, tags=["Student"])