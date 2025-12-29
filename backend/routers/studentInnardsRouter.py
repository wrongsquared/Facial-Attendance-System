from fastapi import APIRouter, Depends, HTTPException
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

