from typing import Optional
from sqlalchemy import or_, func
from datetime import datetime, date, time, timedelta
from database.db import (
    User, UserProfile, Student, Lesson, Module, AttdCheck, 
    StudentModules, LecMod, EntLeave
)
from schemas import UserListItem, AttendanceLogEntry, AttendanceLogResponse, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.db_config import get_db
from dependencies.deps import get_current_user_id


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

# Admin Attendance Log with Dynamic Filtering (shows all attendance records, not just for one lecturer)
@router.get("/admin/attendance-log", response_model=AttendanceLogResponse)
def get_admin_attendance_log_filtered(
    search_term: str = Query(None, description="Search by Student Name or ID"),
    module_code: str = Query(None, description="Filter by Module Code"),
    status: Literal['Present', 'Absent', 'Late'] = Query(None, description="Filter by Status"),
    date: date = Query(None, description="Filter by specific date (YYYY-MM-DD)"),
    limit: int = Query(10, gt=0),
    offset: int = Query(0, ge=0),
    
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Admin version of attendance log - shows ALL attendance records across all lecturers
    """
    
    # 1. BUILD THE QUERY
    # Same as lecturer version but without filtering by lecturer ID
    query = (
        db.query(
            Lesson,
            Module.moduleCode,
            Student.studentNum,
            Student.name,
            AttdCheck.AttdCheckID, # If this exists, they are Present
            AttdCheck.remarks,
            func.min(EntLeave.enter).label("entry_time") # Get the FIRST time they entered
        )
        .select_from(Lesson)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        
        # Link Lesson -> Module -> Enrolled Students
        # This ensures we get a row for every student, even if they are Absent
        .join(StudentModules, Module.moduleID == StudentModules.modulesID)
        .join(Student, StudentModules.studentID == Student.userID)
        
        # Check if they have an Attendance Record (Left Join)
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == Student.userID))
        
        # Check their Entry Logs to see if they were late (Left Join)
        .outerjoin(EntLeave, (EntLeave.lessonID == Lesson.lessonID) & (EntLeave.studentID == Student.userID))
        
        # Base Filter: Past Lessons only (NO lecturer filter for admin)
        .filter(Lesson.endDateTime < datetime.now())
        
        # Grouping is required because we used an aggregate function: min(entry_time)
        .group_by(
            Lesson.lessonID, 
            Module.moduleCode, 
            Student.studentNum, 
            Student.name, 
            AttdCheck.AttdCheckID,
            AttdCheck.remarks
        )
    )

    # 2. APPLY FILTERS (SQL Side)
    
    # Date Filter
    if date:
        start_of_day = datetime.combine(date, time.min)
        end_of_day = datetime.combine(date, time.max)
        query = query.filter(Lesson.startDateTime.between(start_of_day, end_of_day))

    # Module Code Filter
    if module_code:
        query = query.filter(Module.moduleCode == module_code)

    # Search Filter (Name or ID)
    if search_term:
        search_like = f"%{search_term}%"
        query = query.filter(or_(
            Student.name.ilike(search_like),
            Student.studentNum.ilike(search_like)
        ))

    # 3. EXECUTE QUERY
    # We fetch ALL matching rows here so we can process the 'Late' logic in Python
    # Sorting by newest lesson first
    results = query.order_by(Lesson.startDateTime.desc()).all()

    # 4. PROCESS LOGIC (Python Side)
    log_entries = []
    
    for lesson, mod_code, s_id, s_name, attd_id, remarks, entry_time in results:
        
        # --- CALCULATE STATUS ---
        current_status = "Absent"
        
        if attd_id:
            current_status = "Present"
            
            # Late Logic: If they entered more than 15 mins after start
            # entry_time comes from the database (EntLeave table)
            if entry_time and entry_time > (lesson.startDateTime + timedelta(minutes=15)):
                current_status = "Late"
        
        loc = "Building: "+ lesson.building + " Room: " + lesson.room

        entry_time = str(entry_time)
        
        # --- FILTER BY STATUS ---
        # If the user requested a specific status (e.g. "Late"), skip rows that don't match
        if status and current_status != status:
            continue

        # --- ADD TO LIST ---
        log_entries.append(AttendanceLogEntry(
            user_id=s_id,
            student_name=s_name,
            module_code=mod_code,
            status=current_status,
            date=lesson.startDateTime.strftime("%d %b %Y"),
            lesson_id=lesson.lessonID,
            location = loc,
            timestamp = entry_time,
            method = remarks
        ))
    
    total_records = len(log_entries)
    paginated_data = log_entries[offset : offset + limit]

    return {"data": paginated_data, "total": total_records, "page": (offset // limit) + 1,"limit": limit}
