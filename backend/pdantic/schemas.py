from pydantic import BaseModel, EmailStr
from database.db import Lesson, Courses, Module
from typing import Literal,List
from datetime import date, datetime

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

class courseoverviewcard(BaseModel):
   module_code: str
   module_name: str
   overall_attendance_rate: float
   students_enrolled: int
   class Config:
        from_attributes = True
    
class ClassToday(BaseModel):
    module_code: str
    module_name: str
    time_range: str
    location: str
    
    # Status can be 'Completed', 'Pending', or 'Live'
    status: Literal['Completed', 'Pending', 'Live'] 
    
    # Attendance fields only needed for 'Completed' or 'Live' status
    present_count: int
    total_enrolled: int
    attendance_display: str # e.g., "42/45 present"
    
    class Config:
        from_attributes = True

class RecentSessionRecord(BaseModel):
    subject: str        # e.g., "CSCI334 - Database Systems"
    date: str           # e.g., "28 Oct 2025"
    time: str           # e.g., "9:00 AM" (Start Time)
    attended: int       # e.g., 42 (Count of check-ins)
    total: int          # e.g., 45 (Count of enrolled students)
    percentage: float   # e.g., 93.0
    
    class Config:
        from_attributes = True

class EmergencyContactSchema(BaseModel):
    contactName: str
    relationship_type: str
    contactNumber: str
    
    class Config:
        from_attributes = True
class viewUserProfile(BaseModel):
    name: str
    email: EmailStr
    contactNumber: str | None
    address: str | None
    
    emergencyContactName: str | None
    emergencyContactRelationship: str | None
    emergencyContactNumber: str | None
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    # Personal Info Fields
    name: str | None = None
    email: EmailStr | None = None
    contactNumber: str | None = None
    address: str | None = None
    
    # Emergency Contact Fields
    emergencyContactName: str | None = None
    emergencyContactRelationship: str | None = None
    emergencyContactNumber: str | None = None