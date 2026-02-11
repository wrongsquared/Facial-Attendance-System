from fastapi.security import HTTPBearer,OAuth2PasswordBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status ,Security
from client import supabase
from sqlalchemy import func, or_, distinct
from database.db import Lesson, LecMod, Module, StudentModules, AttdCheck, StudentNotifications, Student, StudentTutorialGroup
from sqlalchemy.orm import Session
from datetime import datetime

security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Decodes and validates the JWT using Supabase.
    Returns the User object if valid, raises 401 if not.
    """
    token = credentials.credentials # Extract just the token string

    try:
        # verify the token by asking Supabase for the user details
        user_response = supabase.auth.get_user(token)
        
        # Depending on your supabase version, you might need to check if user_response has data
        if not user_response.user:
            raise Exception("User not found")

        return user_response.user.id

    except Exception as e:
        # If Supabase rejects the token (expired, malformed, etc.)
        print(f"Auth Error: {e}") # specific logging for your server
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
def get_signed_url(path: str | None) -> str | None:
    if not path:
        return None
        
    try:
        response = supabase.storage.from_("avatars").create_signed_url(path, 3600)
        
        if isinstance(response, dict):
            return response.get("signedURL")
        else:
            return response 
            
    except Exception as e:
        print(f"Error signing URL for {path}: {e}")
        return None
    

def check_single_student_risk(db: Session, student_id: str):
    # 1. Get the student and their threshold
    student = db.query(Student).filter(Student.studentID == student_id).first()
    if not student or student.attendanceMinimum is None: 
        return

    # 2. Get student's enrollments
    enrollments = db.query(StudentModules, Module).join(Module).filter(
        StudentModules.studentID == student_id
    ).all()

    now = datetime.now()

    for sm, module in enrollments:
        # 3. Find their assigned group
        group_link = db.query(StudentTutorialGroup).filter(
            StudentTutorialGroup.studentModulesID == sm.studentModulesID
        ).first()
        assigned_group_id = group_link.tutorialGroupID if group_link else None

        # 4. Count EXPECTED past lessons
        total_past = (
            db.query(func.count(distinct(Lesson.lessonID)))
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .filter(
                LecMod.moduleID == module.moduleID,
                Lesson.endDateTime < now,
                or_(
                    Lesson.tutorialGroupID == None, 
                    Lesson.tutorialGroupID == assigned_group_id
                )
            )
            .scalar()
        ) or 0

        if total_past == 0: 
            continue 

        # 5. Count ACTUAL attended lessons
        attended = (
            db.query(func.count(distinct(AttdCheck.lessonID)))
            .filter(
                AttdCheck.studentID == student_id,
                AttdCheck.lessonID.in_(
                    db.query(Lesson.lessonID)
                    .join(LecMod)
                    .filter(
                        LecMod.moduleID == module.moduleID,
                        or_(
                            Lesson.tutorialGroupID == None,
                            Lesson.tutorialGroupID == assigned_group_id
                        )
                    )
                )
            )
            .scalar()
        ) or 0

        # 6. Final Logic
        pct = (attended / total_past) * 100
        
        # Define the filter used for both checking and deleting
        notification_filter = (
            StudentNotifications.studentID == student_id,
            StudentNotifications.title.contains(module.moduleCode)
        )

        if pct < student.attendanceMinimum:
            # Check if alert already exists
            existing = db.query(StudentNotifications).filter(*notification_filter).first()

            if not existing:
                alert = StudentNotifications(
                    studentID=student_id,
                    title=f"Attendance Warning: {module.moduleCode}",
                    message=f"Your attendance in {module.moduleCode} has dropped to {pct:.1f}%.",
                    type="alert",
                    meta_data={
                        "module_code": module.moduleCode,
                        "current_pct": round(pct, 1),
                        "threshold": student.attendanceMinimum,
                        "total_expected": total_past,
                        "total_attended": attended
                    }
                )
                db.add(alert)
        else:
            # Attendance is fine: Clear previous alerts for this specific module
            db.query(StudentNotifications).filter(*notification_filter).delete(synchronize_session=False)

    db.commit()