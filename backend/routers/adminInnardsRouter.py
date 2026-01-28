from typing import Optional
from sqlalchemy import or_, func
from datetime import datetime, date, time, timedelta
from uuid import UUID
from database.db import (
    User, UserProfile, Student, Lesson, Module, AttdCheck, 
    StudentModules, LecMod, EntLeave
)
from schemas import UserListItem, AttendanceLogEntry, AttendanceLogResponse, Literal, AttendanceUpdateRequest
from fastapi import APIRouter, Depends, HTTPException, Query, Body
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
    # If specifically requesting students for custom goals, query Student table directly
    if role_filter == "Student":
        query = (
            db.query(Student, UserProfile.profileTypeName)
            .join(UserProfile, Student.profileTypeID == UserProfile.profileTypeID)
        )
        
        if status_filter and status_filter != "All Status":
            query = query.filter(Student.status == status_filter)

        if search_term:
            search = f"%{search_term}%"
            query = query.filter(or_(
                Student.name.ilike(search),
                Student.email.ilike(search),
                Student.studentNum.ilike(search)
            ))

        results = query.all()
        output = []

        for student, role_name in results:
            status = ""
            if student.active == True or student.active == None:
                status = "Active"
            else:
                status = "Inactive"
            output.append({
                "uuid": student.userID,
                "user_display_id": student.studentNum,
                "name": student.name,
                "role": role_name,
                "status": status,
                "attendanceMinimum": student.attendanceMinimum
            })
        return output
    
    # Original query for all roles
    query = (
        db.query(User, UserProfile.profileTypeName, Student.studentNum, Student.attendanceMinimum)
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

    for user, role_name, student_num, attendance_minimum in results:
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
            "status": status,
            "attendanceMinimum": attendance_minimum
        })

    return output

# Update student attendance minimum (custom goal)
@router.put("/admin/users/{user_id}/attendance-minimum")
def update_student_attendance_minimum(
    user_id: str,
    attendance_minimum: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Find the student
    student = db.query(Student).filter(Student.userID == UUID(user_id)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Update attendance minimum
    student.attendanceMinimum = attendance_minimum
    db.commit()
    
    return {"message": "Attendance minimum updated successfully", "attendanceMinimum": attendance_minimum}

# Delete student attendance minimum (reset custom goal)
@router.delete("/admin/users/{user_id}/attendance-minimum")
def delete_student_attendance_minimum(
    user_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Find the student
    student = db.query(Student).filter(Student.userID == UUID(user_id)).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Reset attendance minimum to default value (0 means no custom goal)
    student.attendanceMinimum = 0.0
    db.commit()
    
    return {"message": "Attendance minimum reset successfully"}

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
        
        # Base Filter: Show all lessons (not just past ones)
        # Removed: .filter(Lesson.endDateTime < datetime.now())
        # This allows seeing current and future lessons as well
        
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
    # We need to fetch more records than requested to account for status filtering at Python level
    # Get all matching records first, then filter by status in Python
    all_results = query.order_by(Lesson.startDateTime.desc()).all()

    # 4. PROCESS LOGIC AND FILTER BY STATUS (Python Side)
    log_entries = []
    
    for lesson, mod_code, s_id, s_name, attd_id, remarks, entry_time in all_results:
        
        # --- CALCULATE STATUS ---
        current_status = "Absent"
        
        if attd_id:
            current_status = "Present"
            
            # Late Logic: If they entered more than 15 mins after start
            # entry_time comes from the database (EntLeave table)
            if entry_time and entry_time > (lesson.startDateTime + timedelta(minutes=15)):
                current_status = "Late"
        
        # --- FILTER BY STATUS ---
        # If the user requested a specific status, skip rows that don't match
        if status and current_status != status:
            continue
        
        # Handle building and room safely
        building = lesson.building or "TBA"
        room = lesson.room or "TBA"
        loc = f"Building: {building} Room: {room}"

        # Format entry time safely - use proper 12-hour format like other parts of the system
        if entry_time:
            entry_time_str = entry_time.strftime("%I:%M %p").lstrip("0")
        elif current_status == "Present":
            # If marked present but no entry time recorded, use lesson start time
            entry_time_str = lesson.startDateTime.strftime("%I:%M %p").lstrip("0")
        else:
            entry_time_str = "N/A"
        
        # Format method based on attendance status
        if current_status == "Absent":
            method_str = "N/A"
        else:
            method_str = "Camera Capture"
        
        # --- ADD TO LIST ---
        log_entries.append(AttendanceLogEntry(
            user_id=s_id,
            student_name=s_name,
            module_code=mod_code,
            status=current_status,
            date=lesson.startDateTime.strftime("%d %b %Y"),
            lesson_id=lesson.lessonID,
            location=loc,
            timestamp=entry_time_str,
            method=method_str
        ))
    
    # Apply pagination to filtered results
    total_records = len(log_entries)
    paginated_data = log_entries[offset : offset + limit]
    
    # Return the properly paginated results
    return {
        "data": paginated_data, 
        "total": total_records, 
        "page": (offset // limit) + 1,
        "limit": limit
    }

@router.put("/admin/attendance/update")
def update_attendance_record(
    request: AttendanceUpdateRequest = Body(...),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Updates an attendance record for a specific student, date, and lesson.
    Creates or modifies the AttdCheck record to reflect the new status.
    """
    try:
        print(f"[DEBUG] Starting attendance update for user_id: {request.user_id}, date: {request.date}, status: {request.new_status}")
        
        # Parse the date string ("DD MMM YYYY" format)
        from datetime import datetime
        date_obj = datetime.strptime(request.date, "%d %b %Y").date()
        print(f"[DEBUG] Parsed date: {date_obj}")
        
        # Find the student by studentNum (user_id)
        student = db.query(Student).filter(Student.studentNum == request.user_id).first()
        if not student:
            print(f"[DEBUG] Student not found with studentNum: {request.user_id}")
            # Try to find by userID instead
            user = db.query(User).filter(User.userID == request.user_id).first()
            if user:
                student = db.query(Student).filter(Student.userID == user.userID).first()
                print(f"[DEBUG] Found student via User table: {student}")
            
            if not student:
                print(f"[DEBUG] Student still not found, available students:")
                all_students = db.query(Student.studentNum, Student.name).limit(5).all()
                for s in all_students:
                    print(f"  - {s.studentNum}: {s.name}")
                raise HTTPException(status_code=404, detail=f"Student not found with ID: {request.user_id}")
        
        print(f"[DEBUG] Found student: {student.studentNum} - {student.name}")
        
        # Find lessons for this student on this date
        start_of_day = datetime.combine(date_obj, time.min)
        end_of_day = datetime.combine(date_obj, time.max)
        print(f"[DEBUG] Looking for lessons between {start_of_day} and {end_of_day}")
        
        lessons_query = (
            db.query(Lesson)
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .join(Module, LecMod.moduleID == Module.moduleID)
            .join(StudentModules, Module.moduleID == StudentModules.modulesID)
            .filter(StudentModules.studentID == student.userID)
            .filter(Lesson.startDateTime.between(start_of_day, end_of_day))
        )
        
        # If lesson_id is specified, filter by that specific lesson
        if request.lesson_id:
            lessons_query = lessons_query.filter(Lesson.lessonID == request.lesson_id)
            print(f"[DEBUG] Filtering by specific lesson ID: {request.lesson_id}")
        
        lessons = lessons_query.all()
        
        print(f"[DEBUG] Found {len(lessons)} lessons for this student on this date")
        if not lessons:
            print(f"[DEBUG] No lessons found. Checking student enrollments:")
            enrollments = db.query(StudentModules, Module.moduleCode).join(Module).filter(StudentModules.studentID == student.userID).all()
            print(f"[DEBUG] Student is enrolled in {len(enrollments)} modules:")
            for enrollment, module_code in enrollments:
                print(f"  - {module_code}")
            
            print(f"[DEBUG] Checking all lessons on this date:")
            all_lessons = db.query(Lesson, Module.moduleCode).join(LecMod).join(Module).filter(
                Lesson.startDateTime.between(start_of_day, end_of_day)
            ).limit(5).all()
            for lesson, module_code in all_lessons:
                print(f"  - {module_code}: {lesson.startDateTime}")
            
            lesson_filter_text = f" (lesson ID: {request.lesson_id})" if request.lesson_id else ""
            raise HTTPException(status_code=404, detail=f"No lessons found for student {request.user_id} on {request.date}{lesson_filter_text}")
        
        # Process each lesson for this date
        updated_lessons = []
        for lesson in lessons:
            print(f"[DEBUG] Processing lesson {lesson.lessonID}")
            
            # Check if attendance record already exists
            existing_attd = db.query(AttdCheck).filter(
                AttdCheck.lessonID == lesson.lessonID,
                AttdCheck.studentID == student.userID
            ).first()
            
            print(f"[DEBUG] Existing attendance record: {existing_attd}")
            
            if request.new_status == "Present" or request.new_status == "Late":
                # Create or update attendance record
                if existing_attd:
                    print(f"[DEBUG] Updating existing attendance record")
                    existing_attd.remarks = f"Manual override: {request.new_status.lower()}"
                    if request.admin_notes:
                        existing_attd.remarks += f" - {request.admin_notes}"
                else:
                    # Create new attendance record
                    print(f"[DEBUG] Creating new attendance record")
                    new_attd = AttdCheck(
                        studentID=student.userID,
                        lessonID=lesson.lessonID,
                        remarks=f"Manual override: {request.new_status.lower()}"
                    )
                    if request.admin_notes:
                        new_attd.remarks += f" - {request.admin_notes}"
                    db.add(new_attd)
                
                # For "Late" status, we may need to handle EntLeave records
                if request.new_status == "Late":
                    print(f"[DEBUG] Handling Late status entry record")
                    # Check if entry record exists
                    existing_entry = db.query(EntLeave).filter(
                        EntLeave.lessonID == lesson.lessonID,
                        EntLeave.studentID == student.userID
                    ).first()
                    
                    # Create or update entry record with timestamp after allowed time (>15 mins)
                    late_entry_time = lesson.startDateTime + timedelta(minutes=20)  # 20 mins late
                    
                    if existing_entry:
                        # Update existing entry to be late
                        existing_entry.enter = late_entry_time
                        print(f"[DEBUG] Updated existing entry record to {late_entry_time}")
                    else:
                        # Create new entry record
                        new_entry = EntLeave(
                            studentID=student.userID,
                            lessonID=lesson.lessonID,
                            enter=late_entry_time,
                            leave=None
                        )
                        db.add(new_entry)
                        print(f"[DEBUG] Created late entry record at {late_entry_time}")
                else:
                    # For "Present" status, ensure entry time is within the allowed window (<= 15 mins)
                    print(f"[DEBUG] Handling Present status entry record")
                    existing_entry = db.query(EntLeave).filter(
                        EntLeave.lessonID == lesson.lessonID,
                        EntLeave.studentID == student.userID
                    ).first()
                    
                    # Create or update entry record with on-time timestamp
                    on_time_entry = lesson.startDateTime + timedelta(minutes=5)  # 5 mins after start (on time)
                    
                    if existing_entry:
                        # Update existing entry to be on time
                        existing_entry.enter = on_time_entry
                        print(f"[DEBUG] Updated existing entry record to {on_time_entry}")
                    else:
                        # Create new entry record
                        new_entry = EntLeave(
                            studentID=student.userID,
                            lessonID=lesson.lessonID,
                            enter=on_time_entry,
                            leave=None
                        )
                        db.add(new_entry)
                        print(f"[DEBUG] Created on-time entry record at {on_time_entry}")
                        
            elif request.new_status == "Absent":
                print(f"[DEBUG] Handling Absent status")
                # Remove attendance record if it exists
                if existing_attd:
                    print(f"[DEBUG] Removing existing attendance record")
                    db.delete(existing_attd)
                
                # Remove entry/leave records if they exist
                existing_entries = db.query(EntLeave).filter(
                    EntLeave.lessonID == lesson.lessonID,
                    EntLeave.studentID == student.userID
                ).all()
                
                print(f"[DEBUG] Removing {len(existing_entries)} entry/leave records")
                for entry in existing_entries:
                    db.delete(entry)
            
            updated_lessons.append(lesson.lessonID)
        
        db.commit()
        print(f"[DEBUG] Successfully updated attendance for {len(updated_lessons)} lessons")
        return {
            "message": "Attendance record updated successfully", 
            "status": "success",
            "updated_lessons": updated_lessons,
            "student_id": student.studentNum
        }
        
    except ValueError as e:
        print(f"[DEBUG] ValueError: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"[DEBUG] Unexpected error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update attendance: {str(e)}")
