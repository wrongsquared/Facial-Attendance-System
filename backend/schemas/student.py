from pydantic import BaseModel
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