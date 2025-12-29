from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc
from datetime import datetime, timedelta
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from schemas import( StudentLessons, 
                            TodaysLessons, 
                            OverallLessonsResponse,
                            AttendancePerModule, 
                            PreviousAttendances, 
                            WeeklyLesson)
from database.db import  Lesson, Module,  StudentModules, LecMod, AttdCheck


router = APIRouter()    

@router.get("/student/timetable", response_model=list[StudentLessons])
def get_student_timetable(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
) -> list[StudentLessons]:
    
    # Perform the Join
    results = (
        db.query(
            Lesson,             # Index 0
            Module.moduleCode,  # Index 1
            Module.moduleName   # Index 2
        )
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        .join(StudentModules, Module.moduleID == StudentModules.modulesID)
        .filter(StudentModules.studentID == user_id)
        .order_by(Lesson.startDateTime.asc())
        .all()
    )
    
    timetable_data = []


    for lesson_obj, mod_code, mod_name in results:
        
        timetable_data.append(
            StudentLessons(
                # Use lesson_obj (the object)
                lessonID=lesson_obj.lessonID,
                lessonType=lesson_obj.lessontype,
                start_time=lesson_obj.startDateTime,
                end_time=lesson_obj.endDateTime,
                
            )
        )
        
    return timetable_data

@router.get("/student/todayslesson", response_model=list[TodaysLessons])
def get_todays_lessons(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    # Calculate Today's Date range
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)


    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName
        )
        .join(LecMod, Lesson.lecModID == LecMod.lecModID)
        .join(Module, LecMod.moduleID == Module.moduleID)
        .join(StudentModules, Module.moduleID == StudentModules.modulesID)
        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.startDateTime >= today_start)
        .filter(Lesson.startDateTime <= today_end)
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
            lessonType = lesson.lessontype,
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
    total_count = (db.query(func.count(Lesson.lessonID))
               .join(LecMod, Lesson.lecModID == LecMod.lecModID)
               .join(Module, LecMod.moduleID == Module.moduleID)
               .join(StudentModules, Module.moduleID == StudentModules.modulesID)
               .filter(StudentModules.studentID == user_id).scalar()) or 0
    
    attended_count = (
        db.query(func.count(AttdCheck.AttdCheckID))
        .filter(AttdCheck.studentID == user_id)
        .scalar()
    ) or 0 
    percentage = 0.0
    if total_count > 0:
        percentage = round((attended_count/total_count)* 100 , 1)
    return {"total_lessons": total_count, "attended_lessons": attended_count, "percentage": percentage}

@router.get("/student/stats/by-module", response_model=list[AttendancePerModule])
def get_stats_by_module(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """
    Returns grouped statistics:
    [
      {"subject": "CSCI334 - Database Systems", "total": 12, "attended": 11, "percentage": 92},
      ...
    ]
    """
    results = (
        db.query(
            Module.moduleCode,
            Module.moduleName,
            func.count(Lesson.lessonID).label("total_lessons"),
            func.count(AttdCheck.AttdCheckID).label("attended_lessons")
        )
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        
        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.endDateTime < datetime.now()) 
        

        .group_by(Module.moduleCode, Module.moduleName)
        .all()
    )


    output = []
    for code, name, total, attended in results:
        pct = 0
        if total > 0:
            pct = round((attended / total) * 100)
            
        output.append({
            "subject": f"{code} - {name}",
            "attended": attended,
            "total": total,
            "percentage": pct
        })

    return output


@router.get("/student/history/recent", response_model=list[PreviousAttendances])
def get_recent_attendance_history(
    limit: int = 5, # Default to showing top 5
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """
    Fetches the most recent past lessons and their attendance status.
    """
    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName,
            AttdCheck.AttdCheckID # If this is not None, they were present
        )
        .select_from(StudentModules)
        
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        
        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        

        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.endDateTime < datetime.now()) # Only PAST lessons
        
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
    """
    Fetches lessons for the NEXT 7 DAYS only.
    Includes status (upcoming/present/absent).
    """
    # Define the Window (Today -> Next 7 Days)
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    next_week = today + timedelta(days=7)

    results = (
        db.query(
            Lesson,
            Module.moduleCode,
            Module.moduleName,
            AttdCheck.AttdCheckID
        )
        # Establish Base: Student's Enrolled Modules
        .select_from(StudentModules)
        .join(Module, StudentModules.modulesID == Module.moduleID)
        .join(LecMod, Module.moduleID == LecMod.moduleID)
        .join(Lesson, LecMod.lecModID == Lesson.lecModID)
        

        .outerjoin(AttdCheck, (AttdCheck.lessonID == Lesson.lessonID) & (AttdCheck.studentID == user_id))
        

        .filter(StudentModules.studentID == user_id)
        .filter(Lesson.startDateTime >= today)     # Starts Today or later
        .filter(Lesson.startDateTime < next_week)  # Ends within 7 days
        
        # Sort by Date (Earliest first)
        .order_by(Lesson.startDateTime.asc())
        .all()
    )

    output = []
    current_time = datetime.now()

    for lesson, mod_code, mod_name, attd_id in results:
        # Determine Status
        loc_string = f"Building {lesson.building}, Room {lesson.room}"

        output.append({
            "lessonID": lesson.lessonID,
            "module_code": mod_code,
            "module_name": mod_name,
            "lesson_type": lesson.lessontype,
            "start_time": lesson.startDateTime,
            "end_time": lesson.endDateTime,
            "location": loc_string, 
        })

    return output