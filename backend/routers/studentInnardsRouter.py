from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc, distinct, or_
from datetime import datetime
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
from database.db import  Lesson, Module,  StudentModules, LecMod, AttdCheck, Student, User, StudentNotifications, StudentTutorialGroup
from dependencies.deps import check_single_student_risk


router = APIRouter() 

@router.get("/student/progress/quarterly", response_model=StudentProgressResponse)
def get_student_progress_quarterly(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    now = datetime.now()
    year = now.year
    month = now.month
    
    if 1 <= month <= 3:
        start_date = datetime(year, 1, 1); end_date = datetime(year, 3, 31, 23, 59, 59)
        label = f"{year} Quarter (Jan - Mar)"
    elif 4 <= month <= 6:
        start_date = datetime(year, 4, 1); end_date = datetime(year, 6, 30, 23, 59, 59)
        label = f"{year} Quarter (Apr - Jun)"
    elif 7 <= month <= 9:
        start_date = datetime(year, 7, 1); end_date = datetime(year, 9, 30, 23, 59, 59)
        label = f"{year} Quarter (Jul - Sep)"
    else:
        start_date = datetime(year, 10, 1); end_date = datetime(year, 12, 31, 23, 59, 59)
        label = f"{year} Quarter (Oct - Dec)"


    student = db.query(Student).filter(Student.studentID == user_id).first()
    student_goal = int(student.attendanceMinimum) if (student and student.attendanceMinimum) else 85

    results = (
        db.query(
            Module.moduleCode,
            Module.moduleName,
 
            func.count(distinct(Lesson.lessonID)).label("total"),
            func.count(distinct(AttdCheck.AttdCheckID)).label("attended")
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        
        .outerjoin(AttdCheck, and_(
            AttdCheck.lessonID == Lesson.lessonID, 
            AttdCheck.studentID == user_id
        ))
        
        .filter(
            StudentModules.studentID == user_id,
            Lesson.startDateTime >= start_date,
            Lesson.startDateTime <= end_date,
            Lesson.endDateTime < now, 
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .group_by(Module.moduleCode, Module.moduleName)
        .all()
    )

    modules_data = []
    total_lessons_all = 0
    total_attended_all = 0

    for code, name, total, attended in results:
        percentage = 0
        if total and total > 0:
            percentage = round(((attended or 0) / total) * 100)
        
        total_lessons_all += (total or 0)
        total_attended_all += (attended or 0)

        status = "On Track" if percentage >= student_goal else "At Risk"

        modules_data.append({
            "module_code": code,
            "module_name": name,
            "attendance_percentage": percentage,
            "goal_percentage": student_goal,
            "status": status
        })

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
    now = datetime.now()

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
        
        
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        
        .outerjoin(AttdCheck, and_(
            AttdCheck.lessonID == Lesson.lessonID, 
            AttdCheck.studentID == user_id
        ))
        
        .filter(
            StudentModules.studentID == user_id,
            Lesson.endDateTime < now, 
            
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .order_by(desc(Lesson.startDateTime))
        .all()
    )

    output = []
    for lesson, mod_code, attd_record in results:
        status = attd_record.status if attd_record else "Absent"

        output.append({
            "lessonID": lesson.lessonID,
            "module_code": mod_code,
            "status": status, 
            "start_time": lesson.startDateTime,
            "lesson_type": lesson.lessontype 
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
    Correctly filters for Lectures vs assigned Tutorial Groups.
    """
    now = datetime.now()

    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName,
            AttdCheck.AttdCheckID,
            AttdCheck.status.label("attd_status") # Get the specific status (Present/Late)
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        .outerjoin(StudentTutorialGroup, and_(
            StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID
        ))
        
        .outerjoin(AttdCheck, and_(
            AttdCheck.lessonID == Lesson.lessonID, 
            AttdCheck.studentID == user_id
        ))
        
        .filter(
            StudentModules.studentID == user_id,
            Lesson.startDateTime >= start_date,
            Lesson.startDateTime <= end_date,
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .order_by(Lesson.startDateTime.asc())
        .all()
    )

    output = []
    for lesson, code, name, attd_id, attd_status in results:
        # Determine Status for the UI
        display_status = "upcoming"
        if attd_id: 
            # If present, use the specific status from the DB (e.g., 'Late' or 'Present')
            display_status = attd_status.lower() 
        elif lesson.endDateTime < now: 
            display_status = "absent"

        output.append({
            "lessonID": lesson.lessonID,
            "module_code": code,
            "module_name": name,
            "lesson_type": lesson.lessontype,
            "start_time": lesson.startDateTime,
            "end_time": lesson.endDateTime,
            "location": f"Blk {lesson.building}, Rm {lesson.room}",
            "status": display_status
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


@router.get("/student/notifications", response_model=list[NotificationItem])
def get_student_notifications(
    user_id: str = Depends(get_current_user_id), # This is the UUID
    db: Session = Depends(get_db)
):
    # Ensure notifications are up to date
    check_single_student_risk(db, user_id)
    
    # Clean up any duplicate notifications after risk assessment
    # Get all unread notifications for this student, grouped by title
    notifications_by_title = {}
    all_unread_notifications = db.query(StudentNotifications).filter(
        StudentNotifications.studentID == user_id,
        StudentNotifications.isRead == False
    ).order_by(StudentNotifications.generatedAt.desc()).all()
    
    for notif in all_unread_notifications:
        title = notif.title
        if title not in notifications_by_title:
            notifications_by_title[title] = []
        notifications_by_title[title].append(notif)
    
    # Remove duplicates - keep only the most recent for each title
    for title, notifs in notifications_by_title.items():
        if len(notifs) > 1:
            # Keep the most recent, delete the rest
            notifs.sort(key=lambda x: x.generatedAt, reverse=True)
            for duplicate in notifs[1:]:
                db.delete(duplicate)
    
    db.commit()
    
    # Get final notifications after cleanup
    raw_notifications = db.query(StudentNotifications).filter(
        StudentNotifications.studentID == user_id
    ).order_by(StudentNotifications.generatedAt.desc()).all()

    return raw_notifications


@router.patch("/notifications/{notification_id}/read")
def mark_notification_as_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(StudentNotifications).filter(
        StudentNotifications.notificationID == notification_id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.isRead = True
    db.commit()
    
    return {"message": "Notification marked as read"}

@router.put("/student/profile/update", response_model=viewUserProfile)
def update_user_profile(
    updates: UserProfileUpdate, # The data sent from the frontend
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Updates the user's personal information and emergency contact in a single transaction.
    """
    
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
    
    return user_record