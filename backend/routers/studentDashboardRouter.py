from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc, or_, distinct
from datetime import datetime, timedelta
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from schemas import( StudentLessons, 
                            TodaysLessons, 
                            OverallLessonsResponse,
                            AttendancePerModule, 
                            PreviousAttendances, 
                            WeeklyLesson)
from database.db import  Lesson, Module,  StudentModules, LecMod, AttdCheck, StudentTutorialGroup


router = APIRouter()    

@router.get("/student/todayslesson", response_model=list[TodaysLessons])
def get_todays_lessons(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName
        )
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        .join(StudentModules, Module.moduleID == StudentModules.modulesID)
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        .filter(
            StudentModules.studentID == user_id,
            Lesson.startDateTime >= today_start,
            Lesson.startDateTime <= today_end,
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .order_by(Lesson.startDateTime.asc())
        .all()
    )

    output_list = []
    for lesson, mod_code, mod_name in results:
        loc_string = f"Building {lesson.building}, Room {lesson.room}"

        output_list.append(TodaysLessons(
            lessonID=lesson.lessonID,
            ModuleCode=mod_code,
            ModuleName=mod_name,
            lessonType=lesson.lessontype,
            start_time=lesson.startDateTime,
            end_time=lesson.endDateTime,
            location=loc_string
        ))

    return output_list

@router.get("/student/overrall", response_model=OverallLessonsResponse)
def get_total_lessons(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    now = datetime.now()

    base_query = (
        db.query(Lesson.lessonID)
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(StudentModules, LecMod.moduleID == StudentModules.modulesID)
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        .filter(
            StudentModules.studentID == user_id,
            Lesson.startDateTime <= now,
            or_(
                Lesson.tutorialGroupID == None, # It's a general Lecture
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID # It's their specific Group
            )
        )
    )

    total_count = base_query.distinct().count()

    attended_count = (
        db.query(func.count(distinct(AttdCheck.lessonID)))
        .filter(
            AttdCheck.studentID == user_id,
            AttdCheck.lessonID.in_(base_query) # Only count if it's an assigned lesson
        )
        .scalar()
    ) or 0

    percentage = 0.0
    if total_count > 0:
        actual_attended = min(attended_count, total_count)
        percentage = round((actual_attended / total_count) * 100, 1)

    return {
        "total_lessons": total_count, 
        "attended_lessons": attended_count, 
        "percentage": percentage
    }
@router.get("/student/stats/by-module", response_model=list[AttendancePerModule])
def get_stats_by_module(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    now = datetime.now()

    results = (
        db.query(
            Module.moduleCode,
            Module.moduleName,
            func.count(distinct(Lesson.lessonID)).label("total_lessons"),
            func.count(distinct(AttdCheck.AttdCheckID)).label("attended_lessons")
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        
        .filter(
            StudentModules.studentID == user_id,
            Lesson.endDateTime < now, 
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .group_by(Module.moduleCode, Module.moduleName)
        .all()
    )

    output = []
    for code, name, total, attended in results:
        pct = 0
        if total > 0:
            actual_total = total or 0
            actual_attended = attended or 0
            
            pct = round((min(actual_attended, actual_total) / actual_total) * 100)
            
        output.append({
            "subject": f"{code} - {name}",
            "attended": attended or 0,
            "total": total or 0,
            "percentage": pct
        })

    return output

@router.get("/student/history/recent", response_model=list[PreviousAttendances])
def get_recent_attendance_history(
    limit: int = 5, # Default to showing top 5
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    now = datetime.now()

    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName,
            AttdCheck.AttdCheckID # If not None, they were present
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        # --- THE FIX: Join to find the student's specific group ---
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
        
        # --- Join to Attendance ---
        # We use and_ to ensure we only look at attendance for THIS student
        .outerjoin(AttdCheck, and_(
            AttdCheck.lessonID == Lesson.lessonID, 
            AttdCheck.studentID == user_id
        ))

        .filter(
            StudentModules.studentID == user_id,
            Lesson.endDateTime < now, # Only PAST lessons
            # --- THE FILTER FIX: Lectures OR the student's specific Group ---
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .order_by(desc(Lesson.startDateTime))
        .limit(limit)
        .all()
    )

    output = []
    for lesson, mod_code, mod_name, attd_id in results:
        # Determine Status
        status = "present" if attd_id else "absent"
        
        output.append({
            "lessonID": lesson.lessonID,
            "subject": f"{mod_code} - {mod_name}",
            "date": lesson.startDateTime,
            "status": status
        })

    return output

@router.get("/student/timetable/weekly", response_model=list[WeeklyLesson])
def get_weekly_timetable(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    next_week = today + timedelta(days=7)

    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName,
            AttdCheck.AttdCheckID
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)

        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        
        .filter(
            StudentModules.studentID == user_id,
            Lesson.startDateTime >= today,
            Lesson.startDateTime < next_week,
            
            or_(
                Lesson.tutorialGroupID == None, 
                Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
            )
        )
        .order_by(Lesson.startDateTime.asc())
        .all()
    )

    output = []
    for lesson, mod_code, mod_name, attd_id in results:
        loc_string = f"Building {lesson.building}, Room {lesson.room}"

        output.append({
            "lessonID": lesson.lessonID,
            "module_code": mod_code,
            "module_name": mod_name,
            "lesson_type": lesson.lessontype,
            "start_time": lesson.startDateTime,
            "end_time": lesson.endDateTime,
            "location": loc_string,
            "is_attended": attd_id is not None # Added for UI utility
        })

    return output