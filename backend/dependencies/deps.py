from fastapi.security import HTTPBearer,OAuth2PasswordBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status ,Security
from client import supabase
from sqlalchemy import func
from database.db import Lesson, LecMod, Module, StudentModules, AttdCheck, StudentNotifications, Student
from sqlalchemy.orm import Session
from datetime import datetime

# This tells Swagger UI to show a "Authorize" button using the /login route
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
# oauth2_scheme = HTTPBearer()
# def get_current_user_id(token: str = Depends(oauth2_scheme)):
#     """
#     1. Takes the Token from the Request Header.
#     2. Asks Supabase: "Is this token valid?"
#     3. Returns the User UUID.
#     """
#     try:
#         # Get user details from Supabase using the token
#         user_response = supabase.auth.get_user(token)
        
#         if not user_response.user:
#             raise HTTPException(status_code=401, detail="Invalid token")
            
#         return user_response.user.id
        
#     except Exception:
#         raise HTTPException(
#             status_code=401, 
#             detail="Could not validate credentials",
#             headers={"WWW-Authenticate": "Bearer"},
#         )

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
    if not student: return

    # Get all modules this student is enrolled in
    enrollments = db.query(Module).join(StudentModules).filter(StudentModules.studentID == student_id).all()

    for module in enrollments:
        # Stats for THIS specific module
        total_past = (
            db.query(func.count(Lesson.lessonID))
            .join(LecMod).filter(LecMod.moduleID == module.moduleID)
            .filter(Lesson.endDateTime < datetime.now())
            .scalar()
        ) or 0

        if total_past == 0: continue # Skip if no classes yet

        attended = (
            db.query(func.count(AttdCheck.AttdCheckID))
            .join(Lesson).join(LecMod)
            .filter(LecMod.moduleID == module.moduleID)
            .filter(AttdCheck.studentID == student_id)
            .scalar()
        ) or 0

        pct = (attended / total_past) * 100
        
        # Check Threshold
        if pct < student.attendanceMinimum:
            
            existing = db.query(StudentNotifications).filter(
                StudentNotifications.studentID == student_id,
                StudentNotifications.isRead == False,
                StudentNotifications.title.contains(module.moduleCode) # Simple duplicate check
            ).first()

            if not existing:
                # CREATE RICH StudentNotifications
                missed = total_past - attended
                
                alert = StudentNotifications(
                    studentID=student_id,
                    title=f"Attendance Warning: {module.moduleCode}",
                    message=f"Attendance in {module.moduleCode} is {pct:.1f}%.",
                    type="alert",
                    meta_data={
                        "module_code": module.moduleCode,
                        "module_name": module.moduleName,
                        "current_pct": round(pct, 1),
                        "threshold": student.attendanceMinimum,
                        "missed_count": missed,
                        "total_past": total_past,
                        "date": datetime.now().strftime("%d %b %Y")
                    }
                )
                db.add(alert)

    db.commit()