from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.db_config import get_db
from pdantic.schemas import AdminStats
from dependencies.deps import get_current_user_id
from database.db import Lesson, AttdCheck, User, Student
from datetime import datetime, timedelta

router = APIRouter()

# @router.get("/admin/dashboard", response_model=AdminStats)
@router.get("/admin/dashboard")
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Overall Attendance Rate
    total_checkins = db.query(func.count(AttdCheck.AttdCheckID)).scalar()
    total_possible = db.query(func.count(Lesson.lessonID) * func.count(Student.userID)).scalar()  # rough example
    attendance_rate = round((total_checkins / total_possible) * 100, 1) if total_possible else 0

    # 2. Monthly Absences

    start_of_month = datetime.now().replace(day=1)
    monthly_absences = db.query(AttdCheck).filter(AttdCheck.created_at >= start_of_month).count()

    # 3. Total Active Users
    active_users = db.query(User).count()

    return {
        "attendanceRate": attendance_rate,
        "monthlyAbsences": monthly_absences,
        "activeUsers": active_users,
    }