from typing import Optional
from sqlalchemy import or_
from database.db import User, UserProfile, Student
from schemas import UserListItem
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.db_config import get_db


router = APIRouter()

@router.get("/admin/users/manage", response_model=list[UserListItem])
def get_users_for_management(
    search_term: Optional[str] = None,
    role_filter: Optional[str] = None,   # "Student", "Lecturer", etc.
    status_filter: Optional[str] = None, # "Active", "Inactive"
    db: Session = Depends(get_db)
):
    query = (
        db.query(User, UserProfile.profileTypeName, Student.studentNum)
        .distinct(User.userID)
        .join(UserProfile, User.profileTypeID == UserProfile.profileTypeID)
        .outerjoin(Student, User.userID == Student.userID) 
    )

    if role_filter and role_filter != "All Roles":
        query = query.filter(UserProfile.profileTypeName == role_filter)

    if status_filter and status_filter != "All Status":
        query = query.filter(User.status == status_filter)

    if search_term:
        search = f"%{search_term}%"
        query = query.filter(or_(
            User.name.ilike(search),
            User.email.ilike(search),
            Student.studentNum.ilike(search)
        ))

    results = query.all()
    output = []

    for user, role_name, student_num in results:
        display_id = student_num if student_num else f"U-{str(user.userID)[:4]}"
        status = ""
        if user.active == True or user.active== None:
            status = "Active"
        else:
            status = "Inactive"
        output.append({
            "uuid": user.userID,
            "user_display_id": display_id,
            "name": user.name,
            "role": role_name,
            "status": status
        })

    return output