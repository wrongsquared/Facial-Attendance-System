from typing import Optional
from sqlalchemy import or_, func, cast, Integer
from datetime import datetime, date, time, timedelta
from uuid import UUID
from database.db import (
    User, UserProfile, Student, Lesson, Module, AttdCheck, 
    StudentModules, LecMod, EntLeave, Lecturer, Admin, Courses
)
from schemas import (CreateUserSchema, 
                     UserListItem, 
                     UserManageSchema, 
                     AttendanceLogEntry, 
                     AttendanceLogResponse, 
                     Literal, 
                     AttendanceUpdateRequest,
                     UpdateUserSchema,
                     UpdateProfileSchema)
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session, aliased
from database.db_config import get_db
from dependencies.deps import get_current_user_id

from main import supabase_adm
router = APIRouter()



@router.get("/admin/users/manage", response_model=list[UserManageSchema]) #Does not show the user themselves.
def get_users_for_management(
    search_term: Optional[str] = None,
    role_filter: Optional[str] = None,   # "Student", "Lecturer", etc.
    status_filter: Optional[str] = None, # "Active", "Inactive"
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):  
    current_admin = db.query(Admin).filter(Admin.adminID == user_id).first()

    if not current_admin:

        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID

    StudentTable = aliased(Student)
    LecturerTable = aliased(Lecturer)
    AdminTable = aliased(Admin)
    query = (
        db.query(
            User, 
            UserProfile.profileTypeName, 
            StudentTable.studentNum,
            LecturerTable.specialistIn,
            AdminTable.role.label("admin_job")
        )
        .select_from(User) 
        .join(UserProfile, User.profileTypeID == UserProfile.profileTypeID)
        .outerjoin(StudentTable, User.userID == StudentTable.studentID)
        .outerjoin(LecturerTable, User.userID == LecturerTable.lecturerID) 
        .outerjoin(AdminTable, User.userID == AdminTable.adminID) 
    )
    #Excludes Super Users Platform Manager
    query = query.filter(UserProfile.profileTypeName != 'Pmanager')
    query = query.filter(
        or_(
            StudentTable.campusID == my_campus_id,
            LecturerTable.campusID == my_campus_id,
            AdminTable.campusID == my_campus_id
        )
    )
    if role_filter and role_filter != "all":
        query = query.filter(UserProfile.profileTypeName == role_filter)

    if status_filter and status_filter != "all":
        is_active = (status_filter == "Active")
        query = query.filter(User.active == is_active)

    
    if search_term:
        search = f"%{search_term}%"
        query = query.filter(or_(
            User.name.ilike(search),
            User.email.ilike(search),
            Student.studentNum.ilike(search)
        ))
    query = query.distinct(User.userID).order_by(User.userID, User.name.asc())
    results = query.all()
    output = []
    
    # Unpack the 5 items we queried
    for user_obj, role_name, stud_num, lec_spec, admin_job in results:
        
        # LOGIC: Determine what to show in the "ID/Details" column
        display_id = "-"
        
        if role_name == "Student":
            display_id = stud_num or "No Student ID"
        elif role_name == "Lecturer":
            display_id = lec_spec or "Lecturer" # Show their specialization
        elif role_name == "Admin":
            display_id = admin_job or "Admin"   # Show their job title

        output.append({
            # Align keys with your Pydantic Schema
            "uuid": user_obj.userID, 
            "name": user_obj.name,
            "email": user_obj.email,
            "role": role_name,
            "studentNum": display_id, # We reuse this field to show ID or Job Title
            "status": "Active" if user_obj.active else "Inactive"
        })
    return output

@router.get("/admin/users/manage/custom-goals", response_model=list[UserListItem])
def get_students_for_custom_goals_management(
    search_term: Optional[str] = None,
    status_filter: Optional[str] = None, # "Active", "Inactive"
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    current_admin = db.query(Admin).filter(Admin.adminID == user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    query = (
        db.query(Student, UserProfile.profileTypeName)
        .join(UserProfile, Student.profileTypeID == UserProfile.profileTypeID)
        .filter(Student.campusID == my_campus_id) 
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

# Update student attendance minimum (custom goal)
@router.put("/admin/users/{user_id}/attendance-minimum")
def update_student_attendance_minimum(
    user_id: str,
    attendance_minimum: float = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Verify the user is an admin and get their campus
    current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    # Find the student and verify they belong to the admin's campus
    student = db.query(Student).filter(
        Student.userID == UUID(user_id),
        Student.campusID == my_campus_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or access denied")
    
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
    # Verify the user is an admin and get their campus
    current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    # Find the student and verify they belong to the admin's campus
    student = db.query(Student).filter(
        Student.userID == UUID(user_id),
        Student.campusID == my_campus_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found or access denied")
    
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
    Admin version of attendance log - shows attendance records for students in the admin's campus only
    """
    
    # Verify the user is an admin and get their campus
    current_admin = db.query(Admin).filter(Admin.adminID == user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    # 1. BUILD THE QUERY with campus filtering
    query = (
        db.query(
            Lesson,
            Module.moduleCode,
            Student.studentNum,
            Student.name,
            AttdCheck.AttdCheckID, # If this exists, they are Present
            AttdCheck.remarks,
            func.min(EntLeave.detectionTime).label("entry_time") # Get the FIRST time they entered
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
        
        # CRITICAL: Filter by admin's campus - only show students from this campus
        .filter(Student.campusID == my_campus_id)
        
        # Base Filter: Show only lessons that have ended (attendance can only be taken for completed lessons)
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
                        existing_entry.detectionTime = late_entry_time
                        print(f"[DEBUG] Updated existing entry record to {late_entry_time}")
                    else:
                        # Create new entry record
                        new_entry = EntLeave(
                            studentID=student.userID,
                            lessonID=lesson.lessonID,
                            detectionTime=late_entry_time
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
                        existing_entry.detectionTime = on_time_entry
                        print(f"[DEBUG] Updated existing entry record to {on_time_entry}")
                    else:
                        # Create new entry record
                        new_entry = EntLeave(
                            studentID=student.userID,
                            lessonID=lesson.lessonID,
                            detectionTime=on_time_entry
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
    
@router.get("/admin/campus-courses")
def get_campus_courses(
    current_user: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Retrieve admin campus
    admin = db.query(Admin).filter(Admin.userID == current_user).first()
    if not admin:
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch courses for that campus
    courses = db.query(Courses).filter(Courses.campusID == admin.campusID).all()
    # Return courseID, courseCode, and courseName
    return [{"courseID": c.courseID, "courseCode": c.courseCode, "courseName": c.courseName} for c in courses]

@router.post("/admin/courses")
def create_course(
    course_data: dict,
    current_user: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Creates a new course for the admin's campus.
    """
    try:
        # Retrieve admin campus
        admin = db.query(Admin).filter(Admin.userID == current_user).first()
        if not admin:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create the course
        new_course = Courses(
            courseCode=course_data["courseCode"],
            courseName=course_data["courseName"],
            campusID=admin.campusID
        )
        
        db.add(new_course)
        db.commit()
        
        return {
            "message": "Course created successfully",
            "courseID": new_course.courseID,
            "courseCode": new_course.courseCode,
            "courseName": new_course.courseName
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating course: {str(e)}")

@router.delete("/admin/courses/{course_id}")
def delete_course(
    course_id: int,
    current_user: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Delete a course from the admin's campus.
    """
    try:
        # Retrieve admin campus
        admin = db.query(Admin).filter(Admin.userID == current_user).first()
        if not admin:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if the course exists and belongs to admin's campus
        course = db.query(Courses).filter(
            Courses.courseID == course_id,
            Courses.campusID == admin.campusID
        ).first()
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found or access denied")
        
        # Delete the course (students and related records will be deleted automatically due to cascade)
        db.delete(course)
        db.commit()
        
        return {"message": f"Course {course.courseCode} deleted successfully"}
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail=f"Error deleting course: {str(e)}")

@router.put("/admin/courses/{course_id}")
def update_course(
    course_id: int,
    course_data: dict,
    current_user: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Update a course in the admin's campus.
    """
    try:
        # Retrieve admin campus
        admin = db.query(Admin).filter(Admin.userID == current_user).first()
        if not admin:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if the course exists and belongs to admin's campus
        course = db.query(Courses).filter(
            Courses.courseID == course_id,
            Courses.campusID == admin.campusID
        ).first()
        
        if not course:
            raise HTTPException(status_code=404, detail="Course not found or access denied")
        
        # Update the course fields
        if "courseCode" in course_data:
            course.courseCode = course_data["courseCode"]
        if "courseName" in course_data:
            course.courseName = course_data["courseName"]
        
        db.commit()
        
        return {
            "message": "Course updated successfully",
            "courseID": course.courseID,
            "courseCode": course.courseCode,
            "courseName": course.courseName
        }
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail=f"Error updating course: {str(e)}")

@router.post("/admin/users/create", status_code=201)
def create_new_user(
    user_data: CreateUserSchema,
    current_user: str = Depends(get_current_user_id), # Security check
    db: Session = Depends(get_db)
):
    executing_admin = db.query(Admin).filter(Admin.userID == current_user).first()
    
    if not executing_admin:
        raise HTTPException(
            status_code=403, 
            detail="Current user is not authorized or does not have an admin profile."
        )
    
    admin_campus_id = executing_admin.campusID
    # Find the ProfileTypeID for this specific campus 
    profile_type = db.query(UserProfile).filter(
        UserProfile.profileTypeName.ilike(user_data.role),
        UserProfile.campusID == admin_campus_id
    ).first()

    if not profile_type:
        raise HTTPException(
            status_code=400, 
            detail=f"Role '{user_data.role}' is not configured for campus ID {admin_campus_id}."
        )

    target_type_id = profile_type.profileTypeID
    # Create in Supabase Auth (The Login)
    try:
        auth_response = supabase_adm.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True, # Auto-confirm so they can log in immediately
            "user_metadata": { "name": user_data.name }
        })
        new_uuid = auth_response.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Auth creation failed: {str(e)}")

    # Get Profile Type ID
    try:
        new_profile = None
        role_key = user_data.role.lower()
        if role_key == "student":
                # Generate student number
                max_num = db.query(func.max(cast(Student.studentNum, Integer))).scalar()
                new_student_num = str(max_num + 1) if max_num else "100001"

                new_profile = Student(
                    userID=new_uuid,
                    profileTypeID=target_type_id, # Scoped to campus (e.g., 3 or 7)
                    campusID=admin_campus_id,     # Inherited from Admin
                    name=user_data.name,
                    email=user_data.email,
                    studentNum=new_student_num,
                    attendanceMinimum=80.0,
                    courseID=user_data.courseID, 
                    photo=None
                )
        elif role_key == "lecturer":
            new_profile = Lecturer(
                userID=new_uuid,
                profileTypeID=target_type_id, # Scoped to campus
                campusID=admin_campus_id,     # Inherited from Admin
                name=user_data.name,
                email=user_data.email,
                specialistIn=user_data.specialistIn or "General", 
                photo=None
            )
        elif role_key == "admin":
            new_profile = Admin(
                userID=new_uuid,
                profileTypeID=target_type_id, # Scoped to campus
                campusID=admin_campus_id,     # Inherited from Admin
                name=user_data.name,
                email=user_data.email,
                role=user_data.jobTitle or "Administrator", 
                photo=None
            )

        if new_profile:
            db.add(new_profile)
            db.commit()
        else:
            raise ValueError("Role validation failed")

    except Exception as e:
        db.rollback()
        # Cleanup Supabase if DB insert fails
        supabase_adm.auth.admin.delete_user(new_uuid)
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500, detail="Database profile creation failed.")

    return {
        "message": "User created successfully", 
        "uuid": new_uuid, 
        "campusID": admin_campus_id,
        "profileTypeID": target_type_id
    }


@router.get("/admin/users/manageProfileDisplay")
def get_all_users_for_manage(
    current_user: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Get the Admin's campus
    admin_executing = db.query(Admin).filter(Admin.userID == current_user).first()
    if not admin_executing:
        raise HTTPException(status_code=403, detail="Admin profile not found.")
    
    target_campus_id = admin_executing.campusID

    # Query the tables 
    students = db.query(Student).filter(Student.campusID == target_campus_id).all()
    lecturers = db.query(Lecturer).filter(Lecturer.campusID == target_campus_id).all()
    admins = db.query(Admin).filter(Admin.campusID == target_campus_id).all()

    results = []

    # Process Students
    for s in students:
        results.append({
            "userID": s.userID,
            "name": s.name,
            "role": "Student",
            "active": s.active, 
            "studentNum": s.studentNum,
            "attendanceMinimum": s.attendanceMinimum
        })

    # Process Lecturers
    for l in lecturers:
        results.append({
            "userID": l.userID,
            "name": l.name,
            "role": "Lecturer",
            "active": l.active, 
            "studentNum": None,
            "attendanceMinimum": None
        })

    # Process Admins
    for a in admins:
        results.append({
            "userID": a.userID,
            "name": a.name,
            "role": "Admin",
            "active": a.active,
            "studentNum": None,
            "attendanceMinimum": None
        })

    return results


@router.get("/admin/users/{user_uuid}")
def get_user_details(user_uuid: str, db: Session = Depends(get_db)):
    # Find the base user to see their role
    user = db.query(User).filter(User.userID == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get profile-specific details
    role_name = user.profileType.profileTypeName.lower()
    details = {
        "uuid": user.userID,
        "name": user.name,
        "email": user.email,
        "role": role_name,
    }

    if role_name == "student":
        profile = db.query(Student).filter(Student.userID == user_uuid).first()
        details.update({"studentNum": profile.studentNum, "courseID": profile.courseID})
    elif role_name == "lecturer":
        profile = db.query(Lecturer).filter(Lecturer.userID == user_uuid).first()
        details.update({"specialistIn": profile.specialistIn})
    elif role_name == "admin":
        profile = db.query(Admin).filter(Admin.userID == user_uuid).first()
        details.update({"jobTitle": profile.role}) # in your DB, Admin.role is the job title

    return details

@router.get("/admin/usersProf/{user_uuid}")
def get_user_acc_details(
    user_uuid: str, 
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Verify the user is an admin and get their campus
    current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    # Fetch the base User record
    user = db.query(User).filter(User.userID == user_uuid).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found in system.")

    # Identify the role name 
    role_name = user.profileType.profileTypeName.lower()
    
    # Verify the user belongs to the same campus as the admin
    user_campus_id = None
    if role_name == "student":
        student = db.query(Student).filter(Student.userID == user_uuid).first()
        user_campus_id = student.campusID if student else None
    elif role_name == "lecturer":
        lecturer = db.query(Lecturer).filter(Lecturer.userID == user_uuid).first()
        user_campus_id = lecturer.campusID if lecturer else None
    elif role_name == "admin":
        admin = db.query(Admin).filter(Admin.userID == user_uuid).first()
        user_campus_id = admin.campusID if admin else None
    
    # Campus security check
    if user_campus_id != my_campus_id:
        raise HTTPException(status_code=404, detail="User not found or access denied")

    # Create the response object 
    result = {
        "userID": str(user.userID),
        "name": user.name,
        "email": user.email,
        "active": user.active,
        "phone": user.contactNumber,          # From users table
        "fulladdress": user.address, # From users table
        "role": user.profileType.profileTypeName,
        "creationDate": user.creationDate.isoformat() if user.creationDate else None,
        "associatedModules": "N/A"
    }

    #  Fetch details based on the Role
    if role_name == "student":
        student = db.query(Student).filter(Student.userID == user_uuid).first()
        if student:
            modules_query = db.query(Module.moduleCode).join(
                StudentModules, Module.moduleID == StudentModules.modulesID
            ).filter(StudentModules.studentID == user_uuid).all()
            module_list = [m[0] for m in modules_query]
            modules_string = ", ".join(module_list) if module_list else "N/A"
            result.update({
                "studentNum": student.studentNum,
                "attendanceMinimum": student.attendanceMinimum,
                "associatedModules": modules_string
            })
    elif role_name == "lecturer":
        lecturer = db.query(Lecturer).filter(Lecturer.userID == user_uuid).first()
        if lecturer:
            modules_query = db.query(Module.moduleCode).join(
                LecMod, Module.moduleID == LecMod.moduleID
            ).filter(LecMod.lecturerID == user_uuid).all()
            
            module_list = [m[0] for m in modules_query]
            
            result.update({
                "specialistIn": lecturer.specialistIn,
                "associatedModules": ", ".join(module_list) if module_list else "N/A"
            })

    elif role_name == "admin":
        admin = db.query(Admin).filter(Admin.userID == user_uuid).first()
        if admin:
            result.update({
                "jobTitle": admin.role,
                "campusID": admin.campusID
            })

    return result
@router.patch("/admin/users/{user_uuid}")
def update_user_full(
    user_uuid: str, 
    user_data: UpdateUserSchema, 
    db: Session = Depends(get_db)
):
    # Update Supabase Auth (Login Credentials)
    auth_updates = {}
    if user_data.email: auth_updates["email"] = user_data.email
    if user_data.password: auth_updates["password"] = user_data.password
    if user_data.name: auth_updates["user_metadata"] = {"name": user_data.name}

    try:
        if auth_updates:
            supabase_adm.auth.admin.update_user_by_id(user_uuid, auth_updates)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Auth update failed: {str(e)}")

    # Update the Local Database
    # Fetch the base user
    user_record = db.query(User).filter(User.userID == user_uuid).first()
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    # Update common fields in User table
    if user_data.name: user_record.name = user_data.name
    if user_data.email: user_record.email = user_data.email

    # Update the specific Role table
    role_name = user_record.profileType.profileTypeName.lower()

    if role_name == "student":
        profile = db.query(Student).filter(Student.userID == user_uuid).first()
        if profile:
            if user_data.courseID: profile.courseID = user_data.courseID
            if user_data.studentNum: profile.studentNum = user_data.studentNum
            # If name/email are also duplicated in the Student table:
            if user_data.name: profile.name = user_data.name
            if user_data.email: profile.email = user_data.email

    elif role_name == "lecturer":
        profile = db.query(Lecturer).filter(Lecturer.userID == user_uuid).first()
        if profile:
            if user_data.specialistIn: profile.specialistIn = user_data.specialistIn
            if user_data.name: profile.name = user_data.name
            if user_data.email: profile.email = user_data.email

    elif role_name == "admin":
        profile = db.query(Admin).filter(Admin.userID == user_uuid).first()
        if profile:
            if user_data.jobTitle: profile.role = user_data.jobTitle # Admin table uses .role for title
            if user_data.name: profile.name = user_data.name
            if user_data.email: profile.email = user_data.email

    db.commit()
    return {"message": "User credentials and profile updated successfully"}
@router.patch("/admin/usersProf/{user_uuid}")
def update_user_profile(user_uuid: str, data: UpdateProfileSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.userID == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    #Update Base User fields
    if data.name: user.name = data.name
    if data.phone: user.phone = data.phone
    if data.fulladdress: user.fulladdress = data.fulladdress
    if data.status:
        user.active = True if data.status == "Active" else False

    # Update Student specific fields
    if user.profileType.profileTypeName.lower() == "student":
        student_record = db.query(Student).filter(Student.userID == user_uuid).first()
        if student_record and data.attendanceMinimum is not None:
            student_record.attendanceMinimum = data.attendanceMinimum

    db.commit()
    return {"message": "Profile updated"}