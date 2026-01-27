from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc
from datetime import datetime, timedelta
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from schemas import( WeeklyLesson,
                     StudentProgressResponse,
                     AttendanceLogItem,
                     StudentProfileDetails,
                     NotificationItem,
                     UserProfileUpdate,
                     viewUserProfile
                     )
from database.db import  Lesson, Module,  StudentModules, LecMod, AttdCheck, Student, User, StudentNotifications


router = APIRouter() 

@router.get("/student/progress/quarterly", response_model=StudentProgressResponse)
def get_student_progress_quarterly(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    # Determine Current Quarter Date Range
    now = datetime.now()
    year = now.year
    month = now.month
    
    if 1 <= month <= 3:
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 3, 31, 23, 59, 59)
        label = f"{year} Quarter (Jan - Mar)"
    elif 4 <= month <= 6:
        start_date = datetime(year, 4, 1)
        end_date = datetime(year, 6, 30, 23, 59, 59)
        label = f"{year} Quarter (Apr - Jun)"
    elif 7 <= month <= 9:
        start_date = datetime(year, 7, 1)
        end_date = datetime(year, 9, 30, 23, 59, 59)
        label = f"{year} Quarter (Jul - Sep)"
    else:
        start_date = datetime(year, 10, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        label = f"{year} Quarter (Oct - Dec)"

    # Get Student's Personal Goal
    student = db.query(Student).filter(Student.userID == user_id).first()
    student_goal = int(student.attendanceMinimum) if student else 85

    #  Query Stats by Module (Filtered by Date Range)
    results = (
        db.query(
            Module.moduleCode,
            Module.moduleName,
            func.count(Lesson.lessonID).label("total"),
            func.count(AttdCheck.AttdCheckID).label("attended")
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        
        # FILTERS
        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.startDateTime >= start_date) # Start of Quarter
        .filter(Lesson.startDateTime <= end_date)   # End of Quarter
        .filter(Lesson.endDateTime < now)           # Only count Past lessons
        
        .group_by(Module.moduleCode, Module.moduleName)
        .all()
    )

    # Process Results
    modules_data = []
    total_lessons_all = 0
    total_attended_all = 0

    for code, name, total, attended in results:
        percentage = 0
        if total > 0:
            percentage = round((attended / total) * 100)
        
        total_lessons_all += total
        total_attended_all += attended

        # Determine Status
        status = "On Track" if percentage >= student_goal else "At Risk"

        modules_data.append({
            "module_code": code,
            "module_name": name,
            "attendance_percentage": percentage,
            "goal_percentage": student_goal,
            "status": status
        })

    # Calculate Overall
    overall = 0
    if total_lessons_all > 0:
        overall = round((total_attended_all / total_lessons_all) * 100)

    return {
        "quarter_label": label,
        "overall_percentage": overall,
        "modules": modules_data
    }

@router.get("/student/history/all", response_model=list[AttendanceLogItem])
def get_full_attendance_history(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            AttdCheck
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        
        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.endDateTime < datetime.now()) # Past lessons only
        .order_by(desc(Lesson.startDateTime))
        .all()
    )

    output = []
    for lesson, mod_code, attd_record in results:
        # Status Logic
        status = "Absent"
        if attd_record:
            # If you have a 'status' column in AttdCheck, use it:
            # status = attd_record.status 
            # Otherwise default to Present:
            status = "Present"
            
            # Logic for "Late" (e.g. if check-in was > 15 mins after start)
            # if attd_record.timestamp > lesson.startDateTime + timedelta(minutes=15):
            #    status = "Late"

        output.append({
            "lessonID": lesson.lessonID,
            "module_code": mod_code,
            "status": status,
            "start_time": lesson.startDateTime
        })

    return output

@router.get("/student/timetable/range", response_model=list[WeeklyLesson])
def get_timetable_by_range(
    start_date: datetime,
    end_date: datetime,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Fetches lessons falling strictly within the start and end datetime.
    """
    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName,
            AttdCheck.AttdCheckID
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        
        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.startDateTime >= start_date)
        .filter(Lesson.startDateTime <= end_date)
        
        .order_by(Lesson.startDateTime.asc())
        .all()
    )

    output = []
    current_time = datetime.now()
    for lesson, code, name, attd_id in results:
        status = "upcoming"
        if attd_id: status = "present"
        elif lesson.endDateTime < current_time: status = "absent"

        output.append({
            "lessonID": lesson.lessonID,
            "module_code": code,
            "module_name": name,
            "lesson_type": lesson.lessontype,
            "start_time": lesson.startDateTime,
            "end_time": lesson.endDateTime,
            "location": lesson.lessontype, # Or venue column
            "status": status
        })
        
    return output


@router.get("/student/profile/details", response_model=StudentProfileDetails)
def get_student_profile_details(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.userID == user_id).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    return student


from datetime import timedelta
import uuid

@router.get("/student/notifications", response_model=list[NotificationItem])
def get_student_notifications(
    user_id: str = Depends(get_current_user_id), # This is the UUID
    db: Session = Depends(get_db)
):
    # 1. Get raw DB rows
    raw_notifications = db.query(StudentNotifications).filter(StudentNotifications.studentID == user_id).all()


    return raw_notifications


@router.put("/student/profile/update", response_model=viewUserProfile)
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