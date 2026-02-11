from fastapi.security import HTTPBearer,OAuth2PasswordBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status ,Security
from client import supabase
from sqlalchemy import func, or_
from database.db import Lesson, LecMod, Module, StudentModules, AttdCheck, StudentNotifications, Student, StudentTutorialGroup
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

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
    student = db.query(Student).filter(Student.studentID == student_id).first()
    if not student: 
        return

    enrollments = db.query(StudentModules, Module).join(Module).filter(
        StudentModules.studentID == student_id
    ).all()

    now = datetime.now()
    # Define a cutoff time (e.g., 24 hours ago)
    twenty_four_hours_ago = now - timedelta(hours=24)

    for sm, module in enrollments:
        group_link = db.query(StudentTutorialGroup).filter(
            StudentTutorialGroup.studentModulesID == sm.studentModulesID
        ).first()
        
        assigned_group_id = group_link.tutorialGroupID if group_link else None


        total_past = (
            db.query(func.count(Lesson.lessonID))
            .join(LecMod)
            .filter(LecMod.moduleID == module.moduleID)
            .filter(Lesson.endDateTime < now)
            .filter(or_(
                Lesson.tutorialGroupID == None,
                Lesson.tutorialGroupID == assigned_group_id  
            ))
            .scalar()
        ) or 0

        if total_past == 0: 
            continue 

        attended = (
            db.query(func.count(AttdCheck.AttdCheckID))
            .join(Lesson).join(LecMod)
            .filter(LecMod.moduleID == module.moduleID)
            .filter(AttdCheck.studentID == student_id)
            .filter(or_(
                Lesson.tutorialGroupID == None,
                Lesson.tutorialGroupID == assigned_group_id
            ))
            .scalar()
        ) or 0

        pct = (attended / total_past) * 100
        
        if pct < student.attendanceMinimum:
            # Check for existing unread notifications for this module
            target_title = f"Attendance Warning: {module.moduleCode}"
            existing = db.query(StudentNotifications).filter(
                StudentNotifications.studentID == student_id,
                StudentNotifications.title == target_title,
                StudentNotifications.type == "alert",
                StudentNotifications.isRead == False
            ).first()

            missed = total_past - attended
            
            if existing:
                # Update existing unread notification with latest data
                existing.message = f"Your attendance in {module.moduleCode} has dropped to {pct:.0f}%."
                existing.meta_data = {
                    "module_code": module.moduleCode,
                    "module_name": module.moduleName,
                    "current_pct": round(pct),
                    "threshold": student.attendanceMinimum,
                    "total_expected": total_past,
                    "total_attended": attended,
                    "missed_count": missed,
                    "date": now.strftime("%d-%m-%Y")
                }
                existing.generatedAt = now
            else:
                # Create new notification
                alert = StudentNotifications(
                    studentID=student_id,
                    title=f"Attendance Warning: {module.moduleCode}",
                    message=f"Your attendance in {module.moduleCode} has dropped to {pct:.0f}%.",
                    type="alert",
                    meta_data={
                        "module_code": module.moduleCode,
                        "module_name": module.moduleName,
                        "current_pct": round(pct),
                        "threshold": student.attendanceMinimum,
                        "total_expected": total_past,
                        "total_attended": attended,
                        "missed_count": missed,
                        "date": now.strftime("%d-%m-%Y")
                    }
                )
                db.add(alert)

    db.commit()