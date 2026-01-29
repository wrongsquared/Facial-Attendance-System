import uuid
import os
import csv
import traceback
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_ 
from database.db_config import get_db
from schemas import AdminDashboardStats, CourseAttentionItem, UserManagementItem,ReportHistoryEntry
from schemas.admin import AdminReportRequest, AdminProfileUpdateRequest, ModuleUpdateSchema
from dependencies.deps import get_current_user_id
from database.db import Lesson, AttdCheck, User, Student, StudentModules, Module, LecMod, Lecturer, UserProfile, GeneratedReport, Admin
from datetime import datetime, timedelta
import os
import csv
import uuid

router = APIRouter()
REPORT_DIR = "generated_reports_files"
os.makedirs(REPORT_DIR, exist_ok=True)
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
    total_possible_slots = (
        db.query(func.count(StudentModules.studentID))
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        .filter(Lesson.endDateTime < now) # Only count lessons that have finished
        .scalar()
    ) or 0

    # Count Actual Presents (All time)
    
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
    modules = db.query(Module).all()
    result = []
    
    for module in modules:
        # Get the lecturer assigned to this module
        lecmod = db.query(LecMod).filter(LecMod.moduleID == module.moduleID).first()
        lecturer_id = str(lecmod.lecturerID) if lecmod else None
        
        print(f"Module {module.moduleID}: lecmod found: {lecmod is not None}, lecturerID: {lecturer_id}")
        
        result.append({
            "moduleID": module.moduleID, 
            "moduleCode": module.moduleCode, 
            "moduleName": module.moduleName,
            "startDate": module.startDate.isoformat() if module.startDate else None,
            "endDate": module.endDate.isoformat() if module.endDate else None,
            "lecturerID": lecturer_id  # Convert UUID to string
        })
    
    return result

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
        # First, check if the module exists
        module = db.query(Module).filter(Module.moduleID == module_id).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        # Delete related lecturer-module relationships
        db.query(LecMod).filter(LecMod.moduleID == module_id).delete()
        
        # Delete the module
        db.query(Module).filter(Module.moduleID == module_id).delete()
        
        db.commit()
        
        return {"message": f"Module {module_id} deleted successfully"}
        
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
        
        db.commit()
        
        return {
            "message": "Module updated successfully",
            "moduleID": module.moduleID,
            "moduleCode": module.moduleCode,
            "moduleName": module.moduleName,
            "startDate": module.startDate.isoformat() if module.startDate else None,
            "endDate": module.endDate.isoformat() if module.endDate else None
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
        
        query = db.query(Lesson).filter(Lesson.startDateTime >= req.date_from, Lesson.endDateTime <= req.date_to)
        if req.course_id != "All":
            query = query.join(LecMod).join(Module).filter(Module.moduleCode == req.course_id)
        
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

        enrollment_query = db.query(Student, Module).join(StudentModules, Student.studentID == StudentModules.studentID).join(Module, StudentModules.modulesID == Module.moduleID)
        if req.course_id != "All":
            enrollment_query = enrollment_query.filter(Module.moduleCode == req.course_id)
        
        enrollments = enrollment_query.all()

        for student, module in enrollments:
            total_lessons = db.query(func.count(Lesson.lessonID)).join(LecMod).filter(LecMod.moduleID == module.moduleID).filter(Lesson.startDateTime >= req.date_from).filter(Lesson.endDateTime <= req.date_to).scalar() or 0
            
            if total_lessons == 0: continue

            attended_count = db.query(func.count(AttdCheck.AttdCheckID)).join(Lesson).join(LecMod).filter(LecMod.moduleID == module.moduleID).filter(AttdCheck.studentID == student.studentID).filter(Lesson.startDateTime >= req.date_from).filter(Lesson.endDateTime <= req.date_to).scalar() or 0

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
    report = db.query(GeneratedReport).filter(GeneratedReport.reportID == report_id).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

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
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Returns a list of all lessons for the admin's campus.
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
                campus_lessons = (
                    db.query(Lesson, LecMod, Module, Lecturer)
                    .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                    .join(Module, LecMod.moduleID == Module.moduleID)
                    .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
                    .filter(Lecturer.campusID == admin_campus_id)
                    .all()
                )
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