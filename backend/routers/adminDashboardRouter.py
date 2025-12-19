from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database.db_config import get_db
from pdantic.schemas import AdminDashboardStats, CourseAttentionItem, UserManagementItem
from dependencies.deps import get_current_user_id
from database.db import Lesson, AttdCheck, User, Student, StudentModules, Module, LecMod, Lecturer, UserProfile
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/admin/stats", response_model=AdminDashboardStats)
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    current_month = now.month
    current_year = now.year

    # Total Active Users
    total_users = db.query(func.count(User.userID)).scalar() or 0

    # Total Records (Attendance checks)
    total_records = db.query(func.count(AttdCheck.AttdCheckID)).scalar() or 0

    # Overall Attendance Rate
    # (Total Attended / Total Expected Lessons * Students)
    # This is a complex query, for MVP let's estimate using just recorded checks
    # vs total possible lesson slots. 
    # For now, let's just return a placeholder or simple math:
    total_possible_slots = (
        db.query(func.count(StudentModules.studentID))
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        .filter(Lesson.endDateTime < now) # Only count lessons that have finished
        .scalar()
    ) or 0

    # B. Count Actual Presents (All time)
    # (We already have this in total_records, assuming AttdCheck means 'Present')
    
    attendance_rate = 0.0
    if total_possible_slots > 0:
        attendance_rate = round((total_records / total_possible_slots) * 100, 1)

    # Monthly Absences
    possible_month = (
        db.query(func.count(StudentModules.studentID))
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        .filter(
            extract('month', Lesson.startDateTime) == current_month,
            extract('year', Lesson.startDateTime) == current_year,
            Lesson.endDateTime < now
        )
        .scalar()
    ) or 0

    #Actual Presents
    actual_month = (
        db.query(func.count(AttdCheck.AttdCheckID))
        .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)
        .filter(
            extract('month', Lesson.startDateTime) == current_month,
            extract('year', Lesson.startDateTime) == current_year
        )
        .scalar()
    ) or 0

    monthly_absences = max(0, possible_month - actual_month)# Placeholder logic

    return {
        "overall_attendance_rate": attendance_rate,
        "monthly_absences": monthly_absences,
        "total_active_users": total_users,
        "total_records": total_records,
        # Leave trends empty for now..
        "trend_attendance": "",
        "trend_absences": "",
        "trend_users": "",
        "trend_records": ""
    }

@router.get("/admin/courses/attention", response_model=list[CourseAttentionItem])
def get_courses_requiring_attention(db: Session = Depends(get_db)):
    
    modules = db.query(Module).all()
    results = []
    
    now = datetime.now()

    for mod in modules:
        # Get Lecturer Name
        # Assuming 1 lecturer per module for simplicity in dashboard
        lecturer_user = (
            db.query(User)
            .join(Lecturer, User.userID == Lecturer.lecturerID)
            .join(LecMod, Lecturer.lecturerID == LecMod.lecturerID)
            .filter(LecMod.moduleID == mod.moduleID)
            .first()
        )
        lecturer_name = lecturer_user.name if lecturer_user else "Unknown"

        # Count Enrolled Students
        student_count = db.query(func.count(StudentModules.studentID))\
            .filter(StudentModules.modulesID == mod.moduleID).scalar() or 0

        if student_count == 0:
            continue # Skip empty courses

        # Count Past Lessons
        # We need to join LecMod to get lessons for this module
        past_lessons_count = (
            db.query(func.count(Lesson.lessonID))
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .filter(LecMod.moduleID == mod.moduleID)
            .filter(Lesson.endDateTime < now)
            .scalar()
        ) or 0

        if past_lessons_count == 0:
            continue # No classes held yet, can't have low attendance

        #  Count Actual Attendance Records
        total_attendance = (
            db.query(func.count(AttdCheck.AttdCheckID))
            .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .filter(LecMod.moduleID == mod.moduleID)
            .scalar()
        ) or 0

        # Calculate Rate
        total_possible = student_count * past_lessons_count
        rate = round((total_attendance / total_possible) * 100)

        # Only return if < 80%
        if rate < 80:
            results.append({
                "module_code": mod.moduleCode,
                "module_name": mod.moduleName,
                "lecturer_name": lecturer_name,
                "student_count": student_count,
                "attendance_rate": rate
            })

    return results


@router.get("/admin/users/recent", response_model=list[UserManagementItem])
def get_recent_users(
    db: Session = Depends(get_db),
    limit: int = 5
):
    # Query Users + Profile Type Name
    results = (
        db.query(
            User,
            UserProfile.profileTypeName
        )
        .join(UserProfile, User.profileTypeID == UserProfile.profileTypeID)
        .limit(limit)
        .all()
    )

    output = []
    for user, role_name in results:
        
        # Logic to determine status 
        status = "active" 
        # Example logic: if user.email_confirmed is False, status = "pending"
        
        # Logic for Joined Date
        # If no created_at column, use a placeholder or today
        joined = datetime.now().strftime("%d %b %Y") 
        # if user.created_at: joined = user.created_at.strftime("%d %b %Y")

        output.append({
            "user_id": str(user.userID),
            "name": user.name,
            "email": user.email,
            "role": role_name,
            "status": status,
            "joined_date": joined
        })

    return output