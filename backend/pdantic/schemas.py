from pydantic import BaseModel, EmailStr
from database.db import Lesson, Courses, Module
from datetime import datetime

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
    profile_type_id: int
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: str
    role_id: int   # e.g., 1 for Student, 2 for Lecturer
    role_name: str

#-------------------------------------#
# Lecturer Dashboard Summary Schemas  #
#-------------------------------------#
class LecturerDashboardSummary(BaseModel):
    """High-level summary for the lecturer's main dashboard view."""
    total_modules: int
    total_students: int
    overall_attendance_rate: float # 0.0 to 100.0
    students_at_risk_count: int

class StudentLessons(BaseModel):
    lessonID: int
    lessonType: str        
    start_time: datetime
    end_time: datetime
    
    class Config:
        from_attributes = True

class RecentSessionsCardData(BaseModel):
    Recent_sessions_record: int    # The big number (e.g., 4)
    label: str    # The text (e.g., "Recent sessions recorded")


class AttendanceOverviewCard(BaseModel):
    Average_attendance: float  # The percentage (e.g., 92.5)
    label: str    # The text (e.g., "Across all courses")
   
class timetableEntry(BaseModel):
    module_code: str
    day_of_week: str
    start_time: str  # "14:00"
    end_time: str    # "15:30"
    location: str
   
class TodaysLessons(BaseModel):
    lessonID:int
    ModuleCode: str
    ModuleName: str
    lessonType: str
    start_time: datetime
    end_time: datetime
    location: str #Building + Room stringed
    class Config:
        from_attributes = True

class OverallLessonsResponse(BaseModel):
    total_lessons: int
    attended_lessons:int
    percentage: float
