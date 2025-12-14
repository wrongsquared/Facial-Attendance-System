from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func
from datetime import datetime
from database.db_config import get_db
from dependencies.deps import get_current_user_id
from pdantic.schemas import StudentLessons, TodaysLessons, OverallLessonsResponse
from database.db import  Lesson, Module,  StudentModules, LecMod, AttdCheck


router = APIRouter()    

@router.get("/student/timetable", response_model=list[StudentLessons])
def get_student_timetable(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
) -> list[StudentLessons]:
    
    # 1. Perform the Join
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

    # FIX: Unpack the tuple here
    for lesson_obj, mod_code, mod_name in results:
        
        timetable_data.append(
            StudentLessons(
                # Use lesson_obj (the object), not lesson (the tuple)
                lessonID=lesson_obj.lessonID,
                lessonType=lesson_obj.lessontype,
                start_time=lesson_obj.startDateTime,
                end_time=lesson_obj.endDateTime,
                
                # If your StudentLessons schema expects a subject name, 
                # you can use mod_code and mod_name here:
                # subject=f"{mod_code} - {mod_name}" 
            )
        )
        
    return timetable_data

@router.get("/student/todayslesson", response_model=list[TodaysLessons])
def get_todays_lessons(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    # 1. Calculate Today's Date range
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

    # 2. Query
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
        # FILTER FOR TODAY ONLY
        .filter(Lesson.startDateTime >= today_start)
        .filter(Lesson.startDateTime <= today_end)
        .order_by(Lesson.startDateTime.asc())
        .all()
    )

    output_list = []
    
    for lesson, mod_code, mod_name in results:
        # Create the location string manually if you don't have a column for it
        # Or fetch it from a joined Room table if you have one
        loc_string = f"Building {lesson.building}, Room {lesson.room}"
        # Example: loc_string = f"Bldg {lesson.buildingID} - Rm {lesson.roomID}"

        output_list.append(TodaysLessons(
            lessonID=lesson.lessonID,
            ModuleCode=mod_code,
            ModuleName=mod_name,
            lessonType = lesson.lessontype, # Make sure column name matches DB
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
    ) or 0 # or 0 means reutrn 0
    #Calculate percentage.
    percentage = 0.0
    if total_count > 0:
        percentage = round((attended_count/total_count)* 100 , 1)
    return {"total_lessons": total_count, "attended_lessons": attended_count, "percentage": percentage}
