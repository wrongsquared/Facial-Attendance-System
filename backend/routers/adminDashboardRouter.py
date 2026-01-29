import uuid
import os
import csv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_ 
from database.db_config import get_db
from schemas import AdminDashboardStats, CourseAttentionItem, UserManagementItem,ReportHistoryEntry
from schemas.admin import AdminReportRequest, AdminProfileUpdateRequest, ModuleUpdateSchema
from dependencies.deps import get_current_user_id
from database.db import Lesson, AttdCheck, User, Student, StudentModules, Module, LecMod, Lecturer, UserProfile,GeneratedReport
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