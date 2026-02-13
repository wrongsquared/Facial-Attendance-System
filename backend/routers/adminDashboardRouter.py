import uuid
import os
import csv
import traceback
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, aliased, joinedload
from sqlalchemy import func, extract, and_, or_ , case
from database.db_config import get_db
from schemas import AdminDashboardStats, CourseAttentionItem, UserManagementItem
from schemas.admin import AdminReportRequest, AdminProfileUpdateRequest
from dependencies.deps import get_current_user_id
from database.db import TutorialsGroup, Lesson, StudentTutorialGroup, AttdCheck, User, Student, StudentModules, Module, LecMod, Lecturer, UserProfile, GeneratedReport, Admin, Courses
from datetime import datetime, time
import os
import csv
import uuid

router = APIRouter()
# Use absolute path for reports directory
REPORT_DIR = os.path.join(os.getcwd(), "generated_reports_files")
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

    # Overall Attendance Rate (Numerator: Actual sessions)
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

    # Monthly Trend Calculation 
    possible_this_month = (
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

    # Total attended this month
    attended_this_month = (
        db.query(func.count(AttdCheck.AttdCheckID))
        .join(Student, AttdCheck.studentID == Student.studentID)
        .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)
        .filter(
            Student.campusID == my_campus_id,
            extract('month', Lesson.startDateTime) == current_month,
            extract('year', Lesson.startDateTime) == current_year,
            Lesson.endDateTime < now
        )
        .scalar()
    ) or 0

    monthly_rate = 0.0
    if possible_this_month > 0:
        monthly_rate = round((min(attended_this_month, possible_this_month) / possible_this_month) * 100, 1)

    return {
        "overall_attendance_rate": attendance_rate,
        "total_active_users": total_users,
        "monthly_attendance_rate": monthly_rate
    }
@router.get("/admin/courses/attention", response_model=list[CourseAttentionItem])
def get_courses_requiring_attention(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Verify Admin and Get Campus
    current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    my_campus_id = current_admin.campusID
    now = datetime.now()
    LecUser = aliased(User)

    # Get all Modules at this Campus with their Lecturer Names
    modules_query = (
        db.query(
            Module.moduleID,
            Module.moduleCode,
            Module.moduleName,
            Module.campusID,
            Module.startDate,
            Module.endDate,
            LecUser.name.label("lecturer_name"),
            func.count(Lesson.lessonID).label("lesson_count")
        )
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
        .join(LecUser, Lecturer.lecturerID == LecUser.userID)
        .outerjoin(Lesson, LecMod.lecModID == Lesson.lecModID)
        .filter(Module.campusID == my_campus_id)
        .group_by(
            Module.moduleID,
            Module.moduleCode,
            Module.moduleName,
            Module.campusID,
            Module.startDate,
            Module.endDate,
            LecUser.name
        )
        .order_by(Module.moduleID, func.count(Lesson.lessonID).desc())
    ).all()

    results = []
    
    # Group by module to ensure we only get one lecturer per module (the one with most lessons)
    modules_dict = {}
    for module_id, module_code, module_name, campus_id, start_date, end_date, lecturer_name, lesson_count in modules_query:
        if module_id not in modules_dict:
            # Create a module object-like structure
            module_obj = type('Module', (), {
                'moduleID': module_id,
                'moduleCode': module_code,
                'moduleName': module_name,
                'campusID': campus_id,
                'startDate': start_date,
                'endDate': end_date
            })()
            modules_dict[module_id] = (module_obj, lecturer_name)
    
    for mod, lecturer_name in modules_dict.values():
        total_expected = (
            db.query(func.count(Lesson.lessonID))
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .join(StudentModules, LecMod.moduleID == StudentModules.modulesID)
            .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
            .filter(
                LecMod.moduleID == mod.moduleID,
                Lesson.endDateTime < now,
                or_(
                    Lesson.tutorialGroupID == None, 
                    Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID 
                )
            )
            .scalar()
        ) or 0

        if total_expected == 0:
            continue

        actual_attended = (
            db.query(func.count(AttdCheck.AttdCheckID))
            .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .filter(
                LecMod.moduleID == mod.moduleID,
                Lesson.endDateTime < now
            )
            .scalar()
        ) or 0

        rate = round((min(actual_attended, total_expected) / total_expected) * 100)

        # Get lesson types and tutorial groups for this module
        lesson_with_attendance_result = (
            db.query(
                Lesson.lessontype,
                Lesson.tutorialGroupID,
                func.count(Lesson.lessontype).label('count')
            )
            .join(LecMod, Lesson.lecModID == LecMod.lecModID)
            .outerjoin(AttdCheck, Lesson.lessonID == AttdCheck.lessonID)
            .filter(
                LecMod.moduleID == mod.moduleID,
                Lesson.endDateTime < now
            )
            .group_by(Lesson.lessontype, Lesson.tutorialGroupID)
            .order_by(func.count(Lesson.lessontype).desc())
            .first()
        )
        
        lesson_type = lesson_with_attendance_result.lessontype if lesson_with_attendance_result else None
        
        # Get the tutorial group associated with the lesson that has attendance issues
        tutorial_group = None
        student_count = 0
        
        if lesson_with_attendance_result and lesson_with_attendance_result.tutorialGroupID:
            # Get tutorial group name
            tutorial_group_result = (
                db.query(TutorialsGroup.groupName)
                .filter(TutorialsGroup.tutorialGroupsID == lesson_with_attendance_result.tutorialGroupID)
                .first()
            )
            tutorial_group = tutorial_group_result.groupName if tutorial_group_result else None
            
            # Get student count specifically for this tutorial group
            student_count = (
                db.query(func.count(StudentTutorialGroup.sTutorialGroupsID))
                .filter(StudentTutorialGroup.tutorialGroupID == lesson_with_attendance_result.tutorialGroupID)
                .scalar() or 0
            )
        else:
            # For lectures count all students in the module
            student_count = db.query(func.count(StudentModules.studentModulesID)).filter(
                StudentModules.modulesID == mod.moduleID
            ).scalar() or 0

        # Filter for modules below 80%
        if rate < 80:
            # Check if module-lecturer combination already exists in results
            existing_entry = next((item for item in results if item["module_code"] == mod.moduleCode and item["lecturer_name"] == lecturer_name), None)
            if not existing_entry:
                results.append({
                    "module_code": mod.moduleCode,
                    "module_name": mod.moduleName,
                    "lecturer_name": lecturer_name,
                    "student_count": student_count,
                    "attendance_rate": rate,
                    "lesson_type": lesson_type,
                    "tutorial_group": tutorial_group
                })

    return sorted(results, key=lambda x: x['attendance_rate'])


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
    current_admin = db.query(Admin).filter(Admin.adminID == user_id).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
    
    my_campus_id = current_admin.campusID



    modules = (
        db.query(Module)
        .options(
            joinedload(Module.lecMod)
            .joinedload(LecMod.lecturers)
        )
        .filter(Module.campusID == my_campus_id)
        .all()
    )

    result = []
    
    for module in modules:
        lecturer_names = []
        lecturer_assignments = []
        group_headers = []

        if module.lecMod:
            for lm in module.lecMod:
                if lm.lecturers:
                    lecturer_names.append(lm.lecturers.name)
                

                lecturer_assignments.append({
                    "lecModID": lm.lecModID,
                    "lecturerID": str(lm.lecturerID)
                })
                for g in lm.tutorial_groups:
                    group_headers.append(g.groupName)

        result.append({
            "moduleID": module.moduleID,
            "moduleCode": module.moduleCode, 
            "moduleName": module.moduleName,
            "lecturerName": ", ".join(lecturer_names) if lecturer_names else "Unassigned",
            "lecMod": lecturer_assignments, 
            "tutorialGroups": list(set(group_headers)),
            "startDate": module.startDate.isoformat() if module.startDate else None,
            "endDate": module.endDate.isoformat() if module.endDate else None,
        })
    
    return result

@router.post("/admin/modules")
def create_module(
    module_data: dict,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    try:
        current_admin = db.query(Admin).filter(Admin.adminID == user_id).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
        my_campus_id = current_admin.campusID
        new_module = Module(
            moduleName=module_data["moduleName"],
            moduleCode=module_data["moduleCode"],
            startDate=datetime.fromisoformat(module_data["startDate"]) if module_data.get("startDate") else None,
            endDate=datetime.fromisoformat(module_data["endDate"]) if module_data.get("endDate") else None,
            campusID = my_campus_id
        )
        
        db.add(new_module)
        db.flush() 
        lecturer_ids = module_data.get("lecturerIDs", [])
        if not isinstance(lecturer_ids, list):
            if isinstance(lecturer_ids, str) and lecturer_ids:
                lecturer_ids = [lecturer_ids]
            else:
                lecturer_ids = []

        # Create LecMod relationships first
        lec_mods = []
        for lec_id_str in lecturer_ids:
            try:
                lecturer_uuid = uuid.UUID(lec_id_str)
                lecturer_module = LecMod(
                    lecturerID=lecturer_uuid,
                    moduleID=new_module.moduleID
                )
                db.add(lecturer_module)
                db.flush()  # Get the lecModID
                lec_mods.append(lecturer_module)
                
            except ValueError:
                # If one UUID is invalid, we rollback the whole creation
                db.rollback()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid lecturer ID format: {lec_id_str}. Expected a valid UUID.")

        # Create tutorial groups distributed evenly across lecturers
        tutorial_groups_count = module_data.get("tutorialGroupsCount", 3)  # Default to 3 if not specified
        if tutorial_groups_count and tutorial_groups_count > 0 and lec_mods:
            groups_per_lecturer = tutorial_groups_count // len(lec_mods)
            extra_groups = tutorial_groups_count % len(lec_mods)
            
            group_number = 1
            for i, lec_mod in enumerate(lec_mods):
                # Calculate how many groups this lecturer gets
                groups_for_this_lecturer = groups_per_lecturer
                if i < extra_groups:  # Distribute remaining groups to first lecturers
                    groups_for_this_lecturer += 1
                
                # Create tutorial groups for this lecturer
                for j in range(groups_for_this_lecturer):
                    tutorial_group = TutorialsGroup(
                        lecModID=lec_mod.lecModID,
                        groupName=f"Tutorial Group {group_number}"
                    )
                    db.add(tutorial_group)
                    group_number += 1
        
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
        
        # Get all LecMod records for this module
        lecmods = db.query(LecMod).filter(LecMod.moduleID == module_id_int).all()
        
        # Delete tutorial groups first (they reference LecMod)
        for lecmod in lecmods:
            # Delete StudentTutorialGroup records first (they reference TutorialsGroup)
            tutorial_groups = db.query(TutorialsGroup).filter(TutorialsGroup.lecModID == lecmod.lecModID).all()
            for group in tutorial_groups:
                # Delete student assignments to tutorial groups
                db.query(StudentTutorialGroup).filter(StudentTutorialGroup.tutorialGroupID == group.tutorialGroupsID).delete()
                # Delete the tutorial group itself
                db.delete(group)
            
            # Delete the LecMod record (this will cascade delete lessons)
            db.delete(lecmod)
        
        # Delete student module enrollments
        db.query(StudentModules).filter(StudentModules.modulesID == module_id_int).delete()
        
        # Finally delete the module itself
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
    module_id: int, 
    module_data: dict, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    try:
        module = db.query(Module).filter(Module.moduleID == module_id).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        
        module.moduleName = module_data.get("moduleName", module.moduleName)
        module.moduleCode = module_data.get("moduleCode", module.moduleCode)
        
        if "startDate" in module_data:
            module.startDate = datetime.fromisoformat(module_data["startDate"])
        if "endDate" in module_data:
            module.endDate = datetime.fromisoformat(module_data["endDate"])

        incoming_lec_ids_raw = module_data.get("lecturerIDs") or module_data.get("lecturerids") or []
        incoming_lec_ids = set(str(lid) for lid in incoming_lec_ids_raw)
        current_assignments = db.query(LecMod).filter(LecMod.moduleID == module_id).all()
        current_lec_map = {str(a.lecturerID): a for a in current_assignments}
        current_lec_ids = set(current_lec_map.keys())

        to_add = incoming_lec_ids - current_lec_ids
        for lec_id in to_add:
            new_lecmod = LecMod(
                lecturerID=uuid.UUID(lec_id),
                moduleID=module_id
            )
            db.add(new_lecmod)

        to_remove = current_lec_ids - incoming_lec_ids
        for lec_id in to_remove:
            lecmod_to_del = current_lec_map[lec_id]
            
            lesson_count = db.query(Lesson).filter(Lesson.lecModID == lecmod_to_del.lecModID).count()
            group_count = db.query(TutorialsGroup).filter(TutorialsGroup.lecModID == lecmod_to_del.lecModID).count()

            if lesson_count > 0 or group_count > 0:
                lec_name = db.query(User.name).filter(User.userID == uuid.UUID(lec_id)).scalar()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot remove {lec_name}. They have {lesson_count} lessons and {group_count} groups assigned. Delete those first."
                )
            
            db.delete(lecmod_to_del)

        db.commit()
        
        return {
            "message": "Module and assignments updated successfully",
            "moduleID": module.moduleID,
            "assigned_count": len(incoming_lec_ids)
        }
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Update failed: {str(e)}")

@router.post("/admin/enroll-students")
def enroll_students_in_module(
    request: dict,  # {"moduleID": str, "studentIDs": List[str]}
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Enroll students in a module with automatic assignment to tutorial groups.
    Distributes students evenly across available tutorial groups for the module.
    """
    try:
        # Verify admin access
        current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")

        module_id = request.get("moduleID")
        student_ids = request.get("studentIDs", [])
        
        if not module_id or not student_ids:
            raise HTTPException(status_code=400, detail="moduleID and studentIDs are required")

        # Verify module exists and is on admin's campus
        module = db.query(Module).filter(
            Module.moduleID == module_id,
            Module.campusID == current_admin.campusID
        ).first()
        
        if not module:
            raise HTTPException(status_code=404, detail="Module not found or access denied")

        # Get available tutorial groups for this module
        tutorial_groups = db.query(TutorialsGroup).join(
            LecMod, TutorialsGroup.lecModID == LecMod.lecModID
        ).filter(LecMod.moduleID == module_id).all()

        enrolled_count = 0
        tutorial_assignments = []

        for student_id in student_ids:
            # Verify student exists and is on same campus
            student = db.query(Student).filter(
                Student.studentID == student_id,
                Student.campusID == current_admin.campusID
            ).first()
            
            if not student:
                continue  # Skip invalid students

            # Check if already enrolled
            existing_enrollment = db.query(StudentModules).filter(
                StudentModules.studentID == student_id,
                StudentModules.modulesID == module_id
            ).first()

            if existing_enrollment:
                continue  # Skip already enrolled students

            # Create student module enrollment
            new_enrollment = StudentModules(
                studentID=student_id,
                modulesID=module_id
            )
            db.add(new_enrollment)
            db.flush()  # Get the studentModulesID
            
            enrolled_count += 1

            # Auto-assign to tutorial group if available
            if tutorial_groups:
                # Round-robin assignment based on current student count
                group_assignments = {}
                for group in tutorial_groups:
                    count = db.query(StudentTutorialGroup).filter(
                        StudentTutorialGroup.tutorialGroupID == group.tutorialGroupsID
                    ).count()
                    group_assignments[group.tutorialGroupsID] = count

                # Find group with least students
                min_count = min(group_assignments.values())
                target_groups = [gid for gid, count in group_assignments.items() if count == min_count]
                
                # Use modulo for consistent assignment
                selected_group_id = target_groups[enrolled_count % len(target_groups)]
                
                # Create tutorial group assignment
                tutorial_assignment = StudentTutorialGroup(
                    studentModulesID=new_enrollment.studentModulesID,
                    tutorialGroupID=selected_group_id
                )
                db.add(tutorial_assignment)
                tutorial_assignments.append({
                    "studentID": student_id,
                    "tutorialGroupID": selected_group_id
                })

        db.commit()

        return {
            "message": f"Successfully enrolled {enrolled_count} students",
            "enrolled_count": enrolled_count,
            "total_requested": len(student_ids),
            "tutorial_assignments": tutorial_assignments
        }

    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

@router.get("/admin/modules/{module_id}/tutorial-groups")
def get_tutorial_groups_for_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Get tutorial groups for a specific module with student counts.
    """
    try:
        # Verify admin access
        current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")

        # Verify module exists and is on admin's campus
        module = db.query(Module).filter(
            Module.moduleID == module_id,
            Module.campusID == current_admin.campusID
        ).first()
        
        if not module:
            raise HTTPException(status_code=404, detail="Module not found or access denied")

        # Get tutorial groups with student counts
        tutorial_groups = db.query(TutorialsGroup).join(
            LecMod, TutorialsGroup.lecModID == LecMod.lecModID
        ).filter(LecMod.moduleID == module_id).all()

        result = []
        for group in tutorial_groups:
            student_count = db.query(StudentTutorialGroup).filter(
                StudentTutorialGroup.tutorialGroupID == group.tutorialGroupsID
            ).count()
            
            result.append({
                "tutorialGroupsID": group.tutorialGroupsID,
                "groupName": group.groupName,
                "studentCount": student_count
            })

        return result

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to fetch tutorial groups: {str(e)}")

@router.get("/admin/modules/{module_id}/students")
def get_students_with_enrollment_status(
    module_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Get all campus students with their enrollment status for a specific module.
    """
    try:
        # Verify admin access
        current_admin = db.query(Admin).filter(Admin.adminID == current_user_id).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")

        # Verify module exists and is on admin's campus
        module = db.query(Module).filter(
            Module.moduleID == module_id,
            Module.campusID == current_admin.campusID
        ).first()
        
        if not module:
            raise HTTPException(status_code=404, detail="Module not found or access denied")

        # Get all students from the same campus with enrollment status for THIS SPECIFIC MODULE
        students_query = db.query(
            Student.studentID,
            Student.studentNum,
            Student.name,
            Student.active,
            StudentModules.studentModulesID.label("enrollment_record_id")  # More explicit than isnot(None)
        ).select_from(Student)\
        .outerjoin(
            StudentModules, 
            (StudentModules.studentID == Student.studentID) & 
            (StudentModules.modulesID == module_id)  # Only for THIS specific module
        ).filter(
            Student.campusID == current_admin.campusID
        )

        students = students_query.all()

        result = []
        for student in students:
            # Convert active boolean to status string 
            status = "Active" if student.active else "Inactive"
            # Student is enrolled in THIS module if they have an enrollment record
            is_enrolled_in_this_module = student.enrollment_record_id is not None
            
            result.append({
                "uuid": str(student.studentID),
                "user_display_id": student.studentNum,
                "name": student.name,
                "role": "Student",
                "status": status,
                "isEnrolled": is_enrolled_in_this_module
            })

        return result

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")

@router.get("/admin/reports/history")
def get_report_history(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):

    user_uuid = uuid.UUID(current_user_id)

    reports = (
        db.query(GeneratedReport)
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
    user_uuid = uuid.UUID(current_user_id)
    
    current_admin = db.query(Admin).filter(Admin.userID == user_uuid).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    existing_count = db.query(func.count(GeneratedReport.reportID))\
        .filter(GeneratedReport.lecturerID == user_uuid)\
        .filter(GeneratedReport.reportType == req.report_type)\
        .scalar() or 0
    next_number = existing_count + 1
    new_report_title = f"{req.report_type} - Report {next_number}"

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_mod = req.course_id.replace(" ", "_")
    safe_type = req.report_type.replace(" ", "_")
    filename = f"Report_{safe_type}_{safe_mod}_{timestamp}.csv"
    
    filepath = os.path.join(REPORT_DIR, filename)

    csv_data = []

    if req.report_type == "Module Performance":
        csv_data.append(["Date", "Module Code", "Lecturer", "Lesson Type", "Total Students", "Present", "Attendance Rate (%)"])
        
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

    elif req.report_type == "Low Attendance Rate":
        csv_data.append(["Student ID", "Student Name", "Module Code", "Total Lessons", "Attended", "Attendance Rate (%)", "Status"])

        enrollment_query = db.query(Student, Module)\
            .join(StudentModules, Student.studentID == StudentModules.studentID)\
            .join(Module, StudentModules.modulesID == Module.moduleID)\
            .filter(Student.campusID == current_admin.campusID)
            
        if req.course_id != "All":
            enrollment_query = enrollment_query.filter(Module.moduleCode == req.course_id)
        
        enrollments = enrollment_query.all()

        for student, module in enrollments:
            # Count total lessons only from lecturers in the same campus
            total_lessons = db.query(func.count(Lesson.lessonID))\
                .join(LecMod)\
                .join(Lecturer, LecMod.lecturerID == Lecturer.userID)\
                .filter(Lecturer.campusID == current_admin.campusID)\
                .filter(LecMod.moduleID == module.moduleID)\
                .filter(Lesson.startDateTime >= req.date_from)\
                .filter(Lesson.endDateTime <= req.date_to)\
                .scalar() or 0
            
            if total_lessons == 0: continue

            # Count attended lessons only from lecturers in the same campus
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
            
            # Only include students with low attendance 
            if rate <= 75:
                status = "Critical" if rate < 50 else "Warning"
                csv_data.append([
                    student.studentNum, student.name, module.moduleCode,
                    total_lessons, attended_count, f"{round(rate, 1)}%", status
                ])
    try:
        with open(filepath, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            if not csv_data:
                writer.writerow(["No data found for the selected criteria."])
            else:
                writer.writerows(csv_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file to disk: {str(e)}")

    # Save Record
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

@router.get("/admin/reports/download/{reportID}")
def download_report(
    reportID: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Verify admin access and get admin's campus
    user_uuid = uuid.UUID(current_user_id)
    current_admin = db.query(Admin).filter(Admin.userID == user_uuid).first()
    if not current_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Only allow downloading reports created by current admin
    report = db.query(GeneratedReport).filter(
        GeneratedReport.reportID == reportID,
        GeneratedReport.lecturerID == user_uuid  # Ensure report belongs to this admin
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied")

    # Generate CSV data dynamically from database instead of reading files
    try:
        csv_data = []
        
        # Recreate the report data based on the stored report type and parameters
        if report.reportType == "Module Performance":
            csv_data.append(["Date", "Module Code", "Lecturer", "Lesson Type", "Total Students", "Present", "Attendance Rate (%)"])
            
            # Get lessons for the module (using stored moduleCode)
            query = db.query(Lesson)\
                .join(LecMod)\
                .join(Lecturer, LecMod.lecturerID == Lecturer.userID)\
                .filter(Lecturer.campusID == current_admin.campusID)
            
            if report.moduleCode != "All":
                query = query.join(Module, LecMod.moduleID == Module.moduleID).filter(Module.moduleCode == report.moduleCode)
            
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

        elif report.reportType == "Low Attendance Rate":
            csv_data.append(["Student ID", "Student Name", "Module Code", "Total Lessons", "Attended", "Attendance Rate (%)", "Status"])

            # Get student enrollments
            enrollment_query = db.query(Student, Module)\
                .join(StudentModules, Student.studentID == StudentModules.studentID)\
                .join(Module, StudentModules.modulesID == Module.moduleID)\
                .filter(Student.campusID == current_admin.campusID)
                
            if report.moduleCode != "All":
                enrollment_query = enrollment_query.filter(Module.moduleCode == report.moduleCode)
            
            enrollments = enrollment_query.all()

            for student, module in enrollments:
                total_lessons = db.query(func.count(Lesson.lessonID))\
                    .join(LecMod)\
                    .join(Lecturer, LecMod.lecturerID == Lecturer.userID)\
                    .filter(Lecturer.campusID == current_admin.campusID)\
                    .filter(LecMod.moduleID == module.moduleID).scalar() or 0

                attended_lessons = db.query(func.count(AttdCheck.AttdCheckID))\
                    .join(Lesson, AttdCheck.lessonID == Lesson.lessonID)\
                    .join(LecMod, Lesson.lecModID == LecMod.lecModID)\
                    .filter(AttdCheck.studentID == student.studentID)\
                    .filter(LecMod.moduleID == module.moduleID).scalar() or 0

                attendance_rate = round((attended_lessons / total_lessons * 100), 2) if total_lessons > 0 else 0
                status = "Below 75%" if attendance_rate < 75 else "Good"

                csv_data.append([
                    student.studentNum, student.name, module.moduleCode,
                    total_lessons, attended_lessons, f"{attendance_rate}%", status
                ])

        # Convert CSV data to string
        from io import StringIO
        import csv as csv_module
        
        output = StringIO()
        writer = csv_module.writer(output)
        if not csv_data:
            writer.writerow(["No data found for the selected criteria."])
        else:
            writer.writerows(csv_data)
        
        csv_content = output.getvalue()
        output.close()

        # Return CSV content as downloadable response
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type='text/csv',
            headers={
                "Content-Disposition": f"attachment; filename={report.fileName}"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

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
        
        
        # Check if any lessons exist at all
        lesson_count = db.query(Lesson).count()
        
        if lesson_count == 0:
            print("No lessons found in database")
            return []
        
        # Try to get some basic lesson data first
        basic_lessons = db.query(Lesson.lessonID, Lesson.lessontype, Lesson.building, Lesson.room).limit(3).all()
        
        # Now try the full query step by step
        try:
            lessons_with_lecmod = (
                db.query(Lesson, LecMod)
                .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                .limit(3)
                .all()
            )
            
            # Module join
            lessons_with_module = (
                db.query(Lesson, LecMod, Module)
                .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                .join(Module, LecMod.moduleID == Module.moduleID)
                .limit(3)
                .all()
            )
            
            # Lecturer join
            lessons_with_lecturer = (
                db.query(Lesson, LecMod, Module, Lecturer)
                .join(LecMod, Lesson.lecModID == LecMod.lecModID)
                .join(Module, LecMod.moduleID == Module.moduleID)
                .join(Lecturer, LecMod.lecturerID == Lecturer.lecturerID)
                .limit(3)
                .all()
            )
            
            try:
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
                        "tutorialGroupID": str(lesson.tutorialGroupID) if lesson.tutorialGroupID else None,
                        "startDateTime": lesson.startDateTime.isoformat() if lesson.startDateTime else None,
                        "endDateTime": lesson.endDateTime.isoformat() if lesson.endDateTime else None,
                        "building": lesson.building or "",
                        "room": lesson.room or "",
                        "lecturerName": lecturer.name or "Unknown"  
                    })
                return result
            else:
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
        user_uuid = uuid.UUID(user_id)
        
        current_admin = db.query(Admin).filter(Admin.adminID == user_uuid).first()
        if not current_admin:
            raise HTTPException(status_code=403, detail="Access restricted to Campus Admins")
        
        admin_campus_id = current_admin.campusID
        
        module = db.query(Module).filter(
            Module.moduleCode == lesson_data["moduleCode"],
            Module.campusID == admin_campus_id
        ).first()
        if not module:
            raise HTTPException(status_code=404, detail="Module not found or access denied for your campus")
        
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
        
        if not lesson_data.get("startDateTime") or not lesson_data.get("endDateTime"):
            raise HTTPException(status_code=400, detail="Start date/time and end date/time are required")
        
        tutorial_group_id = None
        if lesson_data.get("tutorialGroupID"):
            try:
                tutorial_group_id = int(lesson_data["tutorialGroupID"])
                

                all_module_groups = (
                    db.query(TutorialsGroup)
                    .join(LecMod, TutorialsGroup.lecModID == LecMod.lecModID)
                    .filter(LecMod.moduleID == module.moduleID)
                    .all()
                )
                for group in all_module_groups:
                    print(f"  Group ID: {group.tutorialGroupsID}, Name: {group.groupName}, LecModID: {group.lecModID}")
                
                tutorial_group = (
                    db.query(TutorialsGroup)
                    .join(LecMod, TutorialsGroup.lecModID == LecMod.lecModID)
                    .filter(
                        TutorialsGroup.tutorialGroupsID == tutorial_group_id,
                        LecMod.moduleID == module.moduleID
                    )
                    .first()
                )
                
                if not tutorial_group:
                    raise HTTPException(status_code=400, detail="Invalid tutorial group for this module")
                    
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid tutorial group ID format")
        
        new_lesson = Lesson(
            lecModID=lecmod.lecModID,
            lessontype=lesson_data["lessonType"],
            tutorialGroupID=tutorial_group_id,
            startDateTime=datetime.fromisoformat(lesson_data["startDateTime"]),
            endDateTime=datetime.fromisoformat(lesson_data["endDateTime"]),
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
        
        # Update only the editable fields (time and location)
        if lesson_data.get("startDateTime"):
            lesson.startDateTime = datetime.fromisoformat(lesson_data["startDateTime"])
        if lesson_data.get("endDateTime"):
            lesson.endDateTime = datetime.fromisoformat(lesson_data["endDateTime"])
        if "building" in lesson_data:
            lesson.building = lesson_data["building"]
        if "room" in lesson_data:
            lesson.room = lesson_data["room"]
        
        db.commit()
        db.refresh(lesson)
        
        # Get module and lecturer info for response
        lecmod = db.query(LecMod).filter(LecMod.lecModID == lesson.lecModID).first()
        module = db.query(Module).filter(Module.moduleID == lecmod.moduleID).first()
        lecturer = db.query(Lecturer).filter(Lecturer.lecturerID == lecmod.lecturerID).first()
        
        return {
            "message": "Lesson updated successfully",
            "lessonID": lesson.lessonID,
            "moduleCode": module.moduleCode if module else None,
            "lecturerName": lecturer.name if lecturer else None,
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