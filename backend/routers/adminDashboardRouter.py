import uuid
import os
import csv
import traceback
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, extract, and_, or_ , case
from database.db_config import get_db
from schemas import AdminDashboardStats, CourseAttentionItem, UserManagementItem,ReportHistoryEntry
from schemas.admin import AdminReportRequest, AdminProfileUpdateRequest, ModuleUpdateSchema
from dependencies.deps import get_current_user_id
from database.db import Lesson, StudentTutorialGroup, AttdCheck, User, Student, StudentModules, Module, LecMod, Lecturer, UserProfile, GeneratedReport, Admin, Courses
from datetime import datetime, timedelta, time
import os
import csv
import uuid

router = APIRouter()
REPORT_DIR = "generated_reports_files"
os.makedirs(REPORT_DIR, exist_ok=True)
@router.get("/admin/stats", response_model=AdminDashboardStats)
def get_admin_dashboard_stats(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    now = datetime.now()
    current_month = now.month
    current_year = now.year

    s_count = db.query(func.count(Student.studentID)).filter(Student.campusID == my_campus_id).scalar() or 0
    l_count = db.query(func.count(Lecturer.lecturerID)).filter(Lecturer.campusID == my_campus_id).scalar() or 0
    a_count = db.query(func.count(Admin.adminID)).filter(Admin.campusID == my_campus_id).scalar() or 0
    total_users = s_count + l_count + a_count


    total_possible_slots = (
        db.query(func.count(Lesson.lessonID))
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(StudentModules, LecMod.moduleID == StudentModules.modulesID)
        .join(Student, StudentModules.studentID == Student.studentID)
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        .filter(
            Student.campusID == my_campus_id,
            Lesson.endDateTime < now,
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID 
            )
        )
        .scalar()
    ) or 0

    total_records = (
        db.query(func.count(AttdCheck.AttdCheckID))
        .join(Student, AttdCheck.studentID == Student.studentID)
        .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)
        .filter(
            Student.campusID == my_campus_id,
            Lesson.endDateTime < now
        )
        .scalar()
    ) or 0

    attendance_rate = 0.0
    if total_possible_slots > 0:
        attendance_rate = round((min(total_records, total_possible_slots) / total_possible_slots) * 100, 1)

    possible_month = (
        db.query(func.count(Lesson.lessonID))
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(StudentModules, LecMod.moduleID == StudentModules.modulesID)
        .join(Student, StudentModules.studentID == Student.studentID)
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        .filter(
            Student.campusID == my_campus_id,
            extract('month', Lesson.startDateTime) == current_month,
            extract('year', Lesson.startDateTime) == current_year,
            Lesson.endDateTime < now,
            or_(
                Lesson.tutorialGroupID == None,
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .scalar()
    ) or 0

    return {
        "overall_attendance_rate": attendance_rate,
        "total_active_users": total_users,
    }

@router.get("/admin/courses/attention", response_model=list[CourseAttentionItem])
def get_courses_requiring_attention(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    try:
        admin_uuid = uuid.UUID(current_user_id) if isinstance(current_user_id, str) else current_user_id
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid User ID format")

    current_admin = db.query(Admin).filter(Admin.adminID == admin_uuid).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    
    my_campus_id = current_admin.campusID
    now = datetime.now()

    # 2. CREATE ALIASES
    # Because Lecturer and Student both use the 'users' table, 
    # we must alias them to avoid "DuplicateAlias" errors.
    LecUser = aliased(User) 
    StudUser = aliased(User)

    # 3. THE OPTIMIZED QUERY
    query = (
        db.query(
            Module.moduleCode,
            Module.moduleName,
            LecUser.name.label("lecturer_name"),
            func.count(func.distinct(Student.studentID)).label("student_count"),
            func.count(func.distinct(Lesson.lessonID)).label("past_lessons_count"),
            func.count(func.distinct(
                case(
                    (AttdCheck.status.in_(['Present', 'Late']), AttdCheck.AttdCheckID),
                    else_=None
                )
            )).label("actual_attendance_count")
        )
        # Join Module to LecMod to Lecturer to User (LecUser)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
        .join(LecUser, Lecturer.lecturerID == LecUser.userID)
        
        # Join Lessons
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        # Outer Join Students (via StudentModules)
        .outerjoin(StudentModules, Module.moduleID == StudentModules.modulesID)
        .outerjoin(Student, StudentModules.studentID == Student.studentID)
        
        # Outer Join Attendance records linked to both Lesson and Student
        .outerjoin(AttdCheck, and_(
            Lesson.lessonID == AttdCheck.lessonID,
            Student.studentID == AttdCheck.studentID
        ))
        
        # FILTERS
        .filter(Lecturer.campusID == my_campus_id) # Lecturer must be from this campus
        .filter(Student.campusID == my_campus_id)  # Only count students from this campus
        .filter(Lesson.endDateTime < now)          # Only look at finished classes
        
        # GROUP BY
        .group_by(Module.moduleID, LecUser.name)
    )

    raw_results = query.all()
    final_results = []

    for row in raw_results:
        student_count = row.student_count or 0
        past_lessons = row.past_lessons_count or 0
        actual_attd = row.actual_attendance_count or 0

        # total_possible = students enrolled * classes held
        total_possible = student_count * past_lessons
        
        if total_possible == 0:
            continue

        rate = round((actual_attd / total_possible) * 100)

        if rate < 80:
            final_results.append({
                "module_code": row.moduleCode,
                "module_name": row.moduleName,
                "lecturer_name": row.lecturer_name,
                "student_count": student_count,
                "attendance_rate": rate
            })

    return final_results


@router.get("/admin/users/recent", response_model=list[UserManagementItem])
def get_recent_users(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    limit: int = 5
):
    # Verify the user is an admin and get their campus
    current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    
    # Query Users + Profile Type Name with campus filtering
    StudentTable = aliased(Student)
    LecturerTable = aliased(Lecturer)
    AdminTable = aliased(Admin)
    
    results = (
        db.query(
            User,
            UserProfile.profileTypeName
        )
        .join(UserProfile, User.profileTypeID == UserProfile.profileTypeID)
        .outerjoin(StudentTable, User.userID == StudentTable.studentID)
        .outerjoin(LecturerTable, User.userID == LecturerTable.lecturerID)
        .outerjoin(AdminTable, User.userID == AdminTable.adminID)
        # Filter to only show users from the admin's campus
        .filter(
            or_(
                StudentTable.campusID == my_campus_id,
                LecturerTable.campusID == my_campus_id,
                AdminTable.campusID == my_campus_id
            )
        )
        .filter(UserProfile.profileTypeName != 'Pmanager')  # Exclude Platform Managers
        .order_by(User.creationDate.desc())
        .limit(limit)
        .all()
    )

    output = []
    for user, role_name in results:
        
        # Logic to determine status 
        status = "active" 

        joined = datetime.now().strftime("%d %b %Y") 


        output.append({
            "user_id": str(user.userID),
            "name": user.name,
            "email": user.email,
            "role": role_name,
            "status": status,
            "joined_date": joined
        })

    return output

@router.get("/admin/modules")
def get_all_modules_for_admin(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Returns a simple list of all modules for the Admin Report dropdown.
    """
    try:
        modules = db.query(Module).all()
        result = []
        
        for module in modules:
            # Get the lecturer assigned to this module
            lecmod = db.query(LecMod).filter(LecMod.moduleID == module.moduleID).first()
            lecturer_id = str(lecmod.lecturerID) if lecmod else None

            
            result.append({
                "moduleID": str(module.moduleID),  # Ensure it's a string
                "moduleCode": module.moduleCode, 
                "moduleName": module.moduleName,
                "startDate": module.startDate.isoformat() if module.startDate else None,
                "endDate": module.endDate.isoformat() if module.endDate else None,
                "lecturerID": lecturer_id  # Convert UUID to string
            })
        
        print(f"Returning {len(result)} modules")
        return result
        
    except Exception as e:
        print(f"Error in get_all_modules_for_admin: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching modules: {str(e)}")

@router.post("/admin/modules")
def create_module(
    module_data: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Creates a new module and assigns it to a lecturer.
    """
    from datetime import datetime
    
    try:
        # Create the module
        new_module = Module(
            moduleName=module_data["moduleName"],
            moduleCode=module_data["moduleCode"],
            startDate=datetime.fromisoformat(module_data["startDate"]) if module_data.get("startDate") else None,
            endDate=datetime.fromisoformat(module_data["endDate"]) if module_data.get("endDate") else None
        )
        
        db.add(new_module)
        db.flush()  # Get the module ID
        
        # Create lecturer-module relationship
        if module_data.get("lecturerID"):
            try:
                # Convert string to UUID
                lecturer_uuid = uuid.UUID(module_data["lecturerID"])
                lecturer_module = LecMod(
                    lecturerID=lecturer_uuid,
                    moduleID=new_module.moduleID
                )
                db.add(lecturer_module)
            except ValueError as e:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Invalid lecturerID format: {str(e)}")
        
        db.commit()
        
        return {
            "message": "Module created successfully",
            "moduleID": new_module.moduleID,
            "moduleCode": new_module.moduleCode,
            "moduleName": new_module.moduleName,
            "startDate": new_module.startDate.isoformat() if new_module.startDate else None,
            "endDate": new_module.endDate.isoformat() if new_module.endDate else None
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating module: {str(e)}")

@router.delete("/admin/modules/{module_id}")
def delete_module(
    module_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Delete a module and its related records
    """
    try:
        # Convert module_id to integer since database expects int
        try:
            module_id_int = int(module_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid module ID format")
            
        # First, check if the module exists
        module = db.query(Module).filter(Module.moduleID == module_id_int).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Delete the module (related records will be deleted automatically due to cascade)
        db.delete(module)
        db.commit()
        
        return {"message": f"Module {module.moduleCode} deleted successfully"}
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail=f"Error deleting module: {str(e)}")

@router.put("/admin/modules/{module_id}")
def update_module(
    module_id: str,
    module_data: ModuleUpdateSchema,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Update an existing module
    """
    try:
        # Convert module_id to integer since database expects int
        try:
            module_id_int = int(module_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid module ID format")
        
        # Check if the module exists
        module = db.query(Module).filter(Module.moduleID == module_id_int).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Update module fields
        module.moduleName = module_data.moduleName
        module.moduleCode = module_data.moduleCode
        
        try:
            module.startDate = datetime.fromisoformat(module_data.startDate)
            module.endDate = datetime.fromisoformat(module_data.endDate)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
        
        # Handle lecturer assignment
        # Get existing lecturer-module relationship
        existing_lecmod = db.query(LecMod).filter(LecMod.moduleID == module_id_int).first()
        
        if module_data.lecturerID:
            # Convert lecturer ID to UUID
            try:
                lecturer_uuid = uuid.UUID(module_data.lecturerID)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid lecturer ID format")
            
            if existing_lecmod:
                # Update existing LecMod record instead of deleting/creating
                existing_lecmod.lecturerID = lecturer_uuid
            else:
                # Create new LecMod record if none exists
                new_lecmod = LecMod(
                    lecturerID=lecturer_uuid,
                    moduleID=module_id_int
                )
                db.add(new_lecmod)
        else:
            # If no lecturer assigned and there's an existing LecMod, we need to handle lessons
            if existing_lecmod:
                # Check if there are lessons referencing this LecMod
                lesson_count = db.query(Lesson).filter(Lesson.lecModID == existing_lecmod.lecModID).count()
                if lesson_count > 0:
                    # Don't allow removing lecturer if there are lessons
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Cannot remove lecturer assignment. There are {lesson_count} lessons that depend on this lecturer-module relationship."
                    )
                else:
                    # Safe to delete since no lessons depend on it
                    db.delete(existing_lecmod)
        
        # Handle course assignments
        if hasattr(module_data, 'courseIDs') and module_data.courseIDs is not None:
            # Remove existing course assignments
            existing_course_modules = db.query(CourseModules).filter(CourseModules.moduleID == module_id_int).all()
            for cm in existing_course_modules:
                db.delete(cm)
                
            # Add new course assignments
            for course_id in module_data.courseIDs:
                course_module = CourseModules(
                    courseID=course_id,
                    moduleID=module_id_int
                )
                db.add(course_module)
        
        db.commit()
        
        return {
            "message": "Module updated successfully",
            "moduleID": module.moduleID,
            "moduleCode": module.moduleCode,
            "moduleName": module.moduleName,
            "startDate": module.startDate.isoformat() if module.startDate else None,
            "endDate": module.endDate.isoformat() if module.endDate else None,
            "courseIDs": module_data.courseIDs if hasattr(module_data, 'courseIDs') and module_data.courseIDs is not None else []
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error updating module {module_id}: {str(e)}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail=f"Error updating module: {str(e)}")

@router.get("/admin/reports/history")
def get_report_history(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Fetches reports generated ONLY by the current logged-in user (Admin/Manager).
    Matches Frontend expectation: [{id, title, date, tags, fileName}]
    """
    
    # Cast current_user_id to UUID if your DB stores it as UUID type
    # (SQLAlchemy usually handles string-to-uuid conversion automatically, 
    # but strictly speaking, it should match the column type).
    user_uuid = uuid.UUID(current_user_id)

    reports = (
        db.query(GeneratedReport)
        # Filter: strictly match the creator ID to the logged-in user
        .filter(GeneratedReport.lecturerID == user_uuid) 
        .order_by(GeneratedReport.generatedAt.desc())
        .limit(10)
        .all()
    )
    
    results = []
    for r in reports:
        # Format date for frontend (e.g., "2023-10-27")
        formatted_date = r.generatedAt.strftime("%Y-%m-%d") 
        
        results.append({
            "id": r.reportID,
            "title": r.title,
            "date": formatted_date,
            # Create tags from report type and module code
            "tags": [r.reportType, r.moduleCode], 
            "fileName": r.fileName
        })
        
    return results

@router.post("/admin/reports/generate")
def generate_report(
    req: AdminReportRequest,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # 1. Setup
    user_uuid = uuid.UUID(current_user_id)
    
    # SECURITY: Get admin's campus to filter reports to their campus only
    current_admin = db.query(Admin).filter(Admin.userID == user_uuid).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Calculate Sequential Number
    existing_count = db.query(func.count(GeneratedReport.reportID))\
        .filter(GeneratedReport.lecturerID == user_uuid)\
        .filter(GeneratedReport.reportType == req.report_type)\
        .scalar() or 0
    next_number = existing_count + 1
    new_report_title = f"{req.report_type} - Report {next_number}"

    # Prepare Path (Using the global REPORT_DIR)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_mod = req.course_id.replace(" ", "_")
    safe_type = req.report_type.replace(" ", "_")
    filename = f"Report_{safe_type}_{safe_mod}_{timestamp}.csv"
    
    # !!! IMPORTANT: Use the global variable defined at the top
    filepath = os.path.join(REPORT_DIR, filename)

    csv_data = []

    # 2. Logic: Module Performance
    if req.report_type == "Module Performance":
        csv_data.append(["Date", "Module Code", "Lecturer", "Lesson Type", "Total Students", "Present", "Attendance Rate (%)"])
        
        # SECURITY: Filter lessons to only include those from lecturers in the admin's campus
        query = db.query(Lesson)\
            .join(LecMod)\
            .join(Lecturer, LecMod.lecturerID == Lecturer.userID)\
            .filter(Lecturer.campusID == current_admin.campusID)\
            .filter(Lesson.startDateTime >= req.date_from, Lesson.endDateTime <= req.date_to)
        
        if req.course_id != "All":
            query = query.join(Module, LecMod.moduleID == Module.moduleID).filter(Module.moduleCode == req.course_id)
        
        lessons = query.all()
        for lesson in lessons:
            mod_code = lesson.lecMod.modules.moduleCode if lesson.lecMod and lesson.lecMod.modules else "N/A"
            lecturer_name = lesson.lecMod.lecturers.name if lesson.lecMod and lesson.lecMod.lecturers else "Unknown"
            
            total_students = db.query(func.count(StudentModules.studentID)).filter(StudentModules.modulesID == lesson.lecMod.moduleID).scalar() or 0
            present_count = db.query(func.count(AttdCheck.AttdCheckID)).filter(AttdCheck.lessonID == lesson.lessonID).scalar() or 0
            rate = round((present_count / total_students * 100), 2) if total_students > 0 else 0
            
            csv_data.append([
                lesson.startDateTime.strftime("%Y-%m-%d"), 
                mod_code, lecturer_name, lesson.lessontype, 
                total_students, present_count, f"{rate}%"
            ])

    # 3. Logic: Low Attendance
    elif req.report_type == "Low Attendance Rate":
        csv_data.append(["Student ID", "Student Name", "Module Code", "Total Lessons", "Attended", "Attendance Rate (%)", "Status"])

        # SECURITY: Filter enrollments to only include students from the admin's campus
        enrollment_query = db.query(Student, Module)\
            .join(StudentModules, Student.studentID == StudentModules.studentID)\
            .join(Module, StudentModules.modulesID == Module.moduleID)\
            .filter(Student.campusID == current_admin.campusID)
            
        if req.course_id != "All":
            enrollment_query = enrollment_query.filter(Module.moduleCode == req.course_id)
        
        enrollments = enrollment_query.all()

        for student, module in enrollments:
            # SECURITY: Count lessons only from lecturers in the same campus
            total_lessons = db.query(func.count(Lesson.lessonID))\
                .join(LecMod)\
                .join(Lecturer, LecMod.lecturerID == Lecturer.userID)\
                .filter(Lecturer.campusID == current_admin.campusID)\
                .filter(LecMod.moduleID == module.moduleID)\
                .filter(Lesson.startDateTime >= req.date_from)\
                .filter(Lesson.endDateTime <= req.date_to)\
                .scalar() or 0
            
            if total_lessons == 0: continue

            # SECURITY: Count attended lessons only from lecturers in the same campus
            attended_count = db.query(func.count(AttdCheck.AttdCheckID))\
                .join(Lesson)\
                .join(LecMod)\
                .join(Lecturer, LecMod.lecturerID == Lecturer.userID)\
                .filter(Lecturer.campusID == current_admin.campusID)\
                .filter(LecMod.moduleID == module.moduleID)\
                .filter(AttdCheck.studentID == student.studentID)\
                .filter(AttdCheck.status == "Present")\
                .filter(Lesson.startDateTime >= req.date_from)\
                .filter(Lesson.endDateTime <= req.date_to)\
                .scalar() or 0

            rate = (attended_count / total_lessons) * 100
            
            # Only include students with low attendance (75% and below)
            if rate <= 75:
                status = "Critical" if rate < 50 else "Warning"
                csv_data.append([
                    student.studentNum, student.name, module.moduleCode,
                    total_lessons, attended_count, f"{round(rate, 1)}%", status
                ])

    # ---------------------------------------------------------
    # 4. WRITE FILE TO DISK (This was missing!)
    # ---------------------------------------------------------
    try:
        with open(filepath, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            if not csv_data:
                writer.writerow(["No data found for the selected criteria."])
            else:
                writer.writerows(csv_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file to disk: {str(e)}")

    # 5. Save Record
    new_report = GeneratedReport(
        lecturerID=user_uuid,
        title=new_report_title,
        moduleCode=req.course_id,
        reportType=req.report_type,
        filterStatus="All",
        fileName=filename,
        filePath=filepath,
        generatedAt=datetime.now()
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return {"message": "Report generated", "report_id": new_report.reportID, "filename": filename}

@router.get("/admin/reports/download/{report_id}")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # SECURITY: Verify admin access and get admin's campus
    user_uuid = uuid.UUID(current_user_id)
    current_admin = db.query(Admin).filter(Admin.userID == user_uuid).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # SECURITY: Only allow downloading reports created by current admin
    report = db.query(GeneratedReport).filter(
        GeneratedReport.reportID == report_id,
        GeneratedReport.lecturerID == user_uuid  # Ensure report belongs to this admin
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied")

    # Clean filename
    clean_filename = os.path.basename(report.fileName)
    
    # Construct path using the SAME global variable used in generate
    forced_path = os.path.join(REPORT_DIR, clean_filename)

    print(f"DEBUG: Checking for file at: {forced_path}")

    if not os.path.exists(forced_path):
        raise HTTPException(status_code=404, detail="File missing from server")

    return FileResponse(path=forced_path, filename=clean_filename, media_type='text/csv')

@router.put("/admin/profile")
def update_admin_profile(
    payload: AdminProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    user_uuid = uuid.UUID(current_user_id)

    user = db.query(User).filter(User.userID == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="Admin not found")

    # Update only editable fields
    user.contactNumber = payload.contactNumber
    user.address = payload.address
    user.emergencyContactName = payload.emergencyContactName
    user.emergencyContactRelationship = payload.emergencyContactRelationship
    user.emergencyContactNumber = payload.emergencyContactNumber

    db.commit()
    db.refresh(user)

    return {"message": "Admin profile updated successfully"}


@router.get("/admin/test")
def test_admin_access(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Test endpoint to check admin access and campus.
    """
    try:
        user_uuid = uuid.UUID(user_id)
        current_admin = db.query(Admin).filter(Admin.adminID == user_uuid).first()
        
        if not current_admin:
            user_exists = db.query(User).filter(User.userID == user_uuid).first()
            return {
                "user_exists": user_exists is not None,
                "admin_exists": False,
                "user_id": user_id,
                "message": "User found but not admin" if user_exists else "User not found"
            }
        
        return {
            "user_exists": True,
            "admin_exists": True,
            "campus_id": current_admin.campusID,
            "admin_role": current_admin.role,
            "user_id": user_id,
            "message": "Admin access confirmed"
        }
    except Exception as e:
        return {"error": str(e), "user_id": user_id}


@router.get("/admin/lessons")
def get_all_lessons_for_admin(
    date_from: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Returns a list of all lessons for the admin's campus, optionally filtered by date range.
    """
    try:
        # Convert user_id string to UUID for comparison
        user_uuid = uuid.UUID(user_id)
        
        # Get current admin's campus
        current_admin = db.query(Admin).filter(Admin.adminID == user_uuid).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
        
        admin_campus_id = current_admin.campusID
        
        # Let's start simple - just return empty list for now to test
        print(f"Admin campus ID: {admin_campus_id}")
        
        # Check if any lessons exist at all
        lesson_count = db.query(Lesson).count()
        print(f"Total lessons in database: {lesson_count}")
        
        if lesson_count == 0:
            print("No lessons found in database")
            return []
        
        # Try to get some basic lesson data first
        basic_lessons = db.query(Lesson.lessonID, Lesson.lessontype, Lesson.building, Lesson.room).limit(3).all()
        print(f"Sample lessons: {basic_lessons}")
        
        # Now try the full query step by step
        try:
            # Step 1: Get lessons with LecMod join
            lessons_with_lecmod = (
                db.query(Lesson, LecMod)
                .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                .limit(3)
                .all()
            )
            print(f"Lessons with LecMod: {len(lessons_with_lecmod)}")
            
            # Step 2: Add Module join
            lessons_with_module = (
                db.query(Lesson, LecMod, Module)
                .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                .join(Module, LecMod.moduleID == Module.moduleID)
                .limit(3)
                .all()
            )
            print(f"Lessons with Module: {len(lessons_with_module)}")
            
            # Step 3: Add Lecturer join
            lessons_with_lecturer = (
                db.query(Lesson, LecMod, Module, Lecturer)
                .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                .join(Module, LecMod.moduleID == Module.moduleID)
                .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
                .limit(3)
                .all()
            )
            print(f"Lessons with Lecturer: {len(lessons_with_lecturer)}")
            
            # Step 4: Filter by campus and get lecturer names
            try:
                # Since Lecturer inherits from User, we can directly access User fields from Lecturer
                # Build query with campus filter
                query = (
                    db.query(Lesson, LecMod, Module, Lecturer)
                    .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                    .join(Module, LecMod.moduleID == Module.moduleID)
                    .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
                    .filter(Lecturer.campusID == admin_campus_id)
                )
                
                # Add date filters if provided
                if date_from:
                    try:
                        start_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                        start_datetime = datetime.combine(start_date, time.min)
                        query = query.filter(Lesson.startDateTime >= start_datetime)
                    except ValueError:
                        raise HTTPException(status_code=400, detail="Invalid date_from format. Use YYYY-MM-DD.")
                
                if date_to:
                    try:
                        end_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                        end_datetime = datetime.combine(end_date, time.max)
                        query = query.filter(Lesson.startDateTime <= end_datetime)
                    except ValueError:
                        raise HTTPException(status_code=400, detail="Invalid date_to format. Use YYYY-MM-DD.")
                
                # Order by start date and execute query
                campus_lessons = query.order_by(Lesson.startDateTime.desc()).all()
                print(f"Lessons for campus {admin_campus_id}: {len(campus_lessons)}")
            except Exception as join_error:
                print(f"Error with query: {str(join_error)}")
                return []
            
            # If we have lessons for this campus, return the data
            if len(campus_lessons) > 0:
                result = []
                # Since Lecturer inherits from User, lecturer.name should work directly
                for lesson, lecmod, module, lecturer in campus_lessons:
                    result.append({
                        "lessonID": str(lesson.lessonID),
                        "moduleCode": module.moduleCode,
                        "moduleName": module.moduleName,
                        "lessonType": lesson.lessontype or "Unknown",
                        "startDateTime": lesson.startDateTime.isoformat() if lesson.startDateTime else None,
                        "endDateTime": lesson.endDateTime.isoformat() if lesson.endDateTime else None,
                        "building": lesson.building or "",
                        "room": lesson.room or "",
                        "lecturerName": lecturer.name or "Unknown"  # Direct access since Lecturer inherits from User
                    })
                return result
            else:
                print(f"No lessons found for campus {admin_campus_id}")
                return []
                
        except Exception as query_error:
            print(f"Query error: {str(query_error)}")
            print(f"Query traceback: {traceback.format_exc()}")
            return []
        
    except Exception as e:
        print(f"Error in get_all_lessons_for_admin: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/admin/lessons")
def create_lesson(
    lesson_data: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Create a new lesson (admin only, campus-restricted).
    """
    from datetime import datetime
    import uuid
    
    try:
        # Convert user_id string to UUID for comparison
        user_uuid = uuid.UUID(user_id)
        
        # Get current admin's campus
        current_admin = db.query(Admin).filter(Admin.adminID == user_uuid).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
        
        admin_campus_id = current_admin.campusID
        
        # Find the module and verify it exists
        module = db.query(Module).filter(Module.moduleCode == lesson_data["moduleCode"]).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Find the lecturer and verify they belong to admin's campus
        lecturer_uuid = uuid.UUID(lesson_data["lecturerID"])
        lecturer = (
            db.query(Lecturer)
            .filter(
                Lecturer.lecturerID == lecturer_uuid,
                Lecturer.campusID == admin_campus_id
            )
            .first()
        )
        
        if not lecturer:
            raise HTTPException(status_code=404, detail="Lecturer not found or access denied for your campus")
        
        # Find or create LecMod entry for this lecturer-module combination
        lecmod = (
            db.query(LecMod)
            .filter(
                LecMod.moduleID == module.moduleID,
                LecMod.lecturerID == lecturer_uuid
            )
            .first()
        )
        
        if not lecmod:
            # Create new LecMod entry
            lecmod = LecMod(
                moduleID=module.moduleID,
                lecturerID=lecturer_uuid
            )
            db.add(lecmod)
            db.commit()
            db.refresh(lecmod)
        
        # Create the lesson
        new_lesson = Lesson(
            lecModID=lecmod.lecModID,
            lessontype=lesson_data["lessonType"],
            startDateTime=datetime.fromisoformat(lesson_data["startDateTime"]) if lesson_data.get("startDateTime") else None,
            endDateTime=datetime.fromisoformat(lesson_data["endDateTime"]) if lesson_data.get("endDateTime") else None,
            building=lesson_data.get("building", ""),
            room=lesson_data.get("room", "")
        )
        
        db.add(new_lesson)
        db.commit()
        db.refresh(new_lesson)
        
        return {
            "message": "Lesson created successfully",
            "lessonID": new_lesson.lessonID,
            "moduleCode": module.moduleCode,
            "lecturerName": lecturer.name,
            "lessonType": new_lesson.lessontype,
            "building": new_lesson.building,
            "room": new_lesson.room
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")
    except Exception as e:
        print(f"Error creating lesson: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/admin/lessons/{lesson_id}")
def update_lesson(
    lesson_id: int,
    lesson_data: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Update a lesson (admin only, campus-restricted).
    """
    from datetime import datetime
    import uuid
    
    try:
        # Convert user_id string to UUID for comparison
        user_uuid = uuid.UUID(user_id)
        
        # Get current admin's campus
        current_admin = db.query(Admin).filter(Admin.adminID == user_uuid).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
        
        admin_campus_id = current_admin.campusID
        
        # Find the lesson and verify it belongs to admin's campus
        lesson = (
            db.query(Lesson)
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
            .filter(
                Lesson.lessonID == lesson_id,
                Lecturer.campusID == admin_campus_id
            )
            .first()
        )
        
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found or access denied")
        
        # Find the module and verify it exists
        module = db.query(Module).filter(Module.moduleCode == lesson_data["moduleCode"]).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Find the lecturer and verify they belong to admin's campus
        lecturer_uuid = uuid.UUID(lesson_data["lecturerID"])
        lecturer = (
            db.query(Lecturer)
            .filter(
                Lecturer.lecturerID == lecturer_uuid,
                Lecturer.campusID == admin_campus_id
            )
            .first()
        )
        
        if not lecturer:
            raise HTTPException(status_code=404, detail="Lecturer not found or access denied for your campus")
        
        # Find or create LecMod entry for this lecturer-module combination
        lecmod = (
            db.query(LecMod)
            .filter(
                LecMod.moduleID == module.moduleID,
                LecMod.lecturerID == lecturer_uuid
            )
            .first()
        )
        
        if not lecmod:
            # Create new LecMod entry
            lecmod = LecMod(
                moduleID=module.moduleID,
                lecturerID=lecturer_uuid
            )
            db.add(lecmod)
            db.commit()
            db.refresh(lecmod)
        
        # Update the lesson
        lesson.lecModID = lecmod.lecModID
        lesson.lessontype = lesson_data["lessonType"]
        lesson.startDateTime = datetime.fromisoformat(lesson_data["startDateTime"]) if lesson_data.get("startDateTime") else None
        lesson.endDateTime = datetime.fromisoformat(lesson_data["endDateTime"]) if lesson_data.get("endDateTime") else None
        lesson.building = lesson_data.get("building", "")
        lesson.room = lesson_data.get("room", "")
        
        db.commit()
        db.refresh(lesson)
        
        return {
            "message": "Lesson updated successfully",
            "lessonID": lesson.lessonID,
            "moduleCode": module.moduleCode,
            "lecturerName": lecturer.name,
            "lessonType": lesson.lessontype,
            "building": lesson.building,
            "room": lesson.room
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid data format: {str(e)}")
    except Exception as e:
        print(f"Error updating lesson: {str(e)}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/admin/lessons/{lesson_id}")
def delete_lesson(
    lesson_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Delete a lesson (admin only, campus-restricted).
    """
    # Get current admin's campus
    current_admin = db.query(Admin).filter(Admin.adminID == user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    
    admin_campus_id = current_admin.campusID
    
    # Find the lesson and verify it belongs to admin's campus
    lesson = (
        db.query(Lesson)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
        .filter(
            Lesson.lessonID == lesson_id,
            Lecturer.campusID == admin_campus_id
        )
        .first()
    )
    
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found or access denied")
    
    # Check if there are any attendance records for this lesson
    attendance_records = db.query(AttdCheck).filter(AttdCheck.lessonID == lesson_id).first()
    if attendance_records:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete lesson with existing attendance records"
        )
    
    db.delete(lesson)
    db.commit()
    
    return {"message": "Lesson deleted successfully"}