from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class StudentLessons(BaseModel):
    lessonID: int
    lessonType: str        
    start_time: datetime
    end_time: datetime
    
    class Config:
        from_attributes = True


class TodaysLessons(BaseModel):
    lessonID:int
    ModuleCode: str
    ModuleName: str
    lessonType: str
    start_time: datetime
    end_time: datetime
    location: str 
    class Config:
        from_attributes = True

class OverallLessonsResponse(BaseModel):
    total_lessons: int
    attended_lessons:int
    percentage: float


class EmergencyContactSchema(BaseModel):
    contactName: str
    relationship_type: str
    contactNumber: str
    
    class Config:
        from_attributes = True

class AttendancePerModule(BaseModel):
    subject: str
    attended: int
    total: int
    percentage: int

class PreviousAttendances(BaseModel):
    lessonID: int
    subject: str
    date: datetime
    status: str 
    class Config:
        from_attributes = True

class WeeklyLesson(BaseModel):
    lessonID: int
    module_code: str
    module_name: str
    lesson_type: str 
    start_time: datetime
    end_time: datetime
    location: str
    class Config:
        from_attributes = True

# Progress Tracker
class ModuleProgress(BaseModel):
    module_code: str
    module_name: str
    attendance_percentage: int
    goal_percentage: int
    status: str 

class StudentProgressResponse(BaseModel):
    quarter_label: str     
    overall_percentage: int
    modules: List[ModuleProgress]

#Attendance History
class AttendanceLogItem(BaseModel):
    lessonID: int
    module_code: str
    status: str       
    start_time: datetime

    class Config:
        from_attributes = True

# Profile Information
class StudentProfileDetails(BaseModel):
    name: str
    email: str
    studentNum: str
    
    # Optional fields (might be null in DB)
    contactNumber: Optional[str] = None
    address: Optional[str] = None
    
    # Emergency Contact
    emergencyContactName: Optional[str] = None
    emergencyContactRelationship: Optional[str] = None
    emergencyContactNumber: Optional[str] = None

    class Config:
        from_attributes = True

#Notifications

class NotificationItem(BaseModel):
    notificationID: int
    title: str
    message: str
    type: str
    isRead: bool
    generatedAt: datetime
    meta_data: Optional[Dict[str, Any]] = None 

    class Config:
        from_attributes = True