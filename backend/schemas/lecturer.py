from pydantic import BaseModel, EmailStr
from typing import Literal, List
from datetime import date

class timetableEntry(BaseModel):
    module_code: str
    day_of_week: str
    start_time: str  # "14:00"
    end_time: str    # "15:30"
    location: str

class RecentSessionRecord(BaseModel):
    subject: str        
    date: str           
    time: str           
    attended: int       # count of check-ins
    total: int          # count of enrolled students
    percentage: float   
    
    class Config:
        from_attributes = True


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

class LecturerDashboardSummary(BaseModel):
    """High-level summary for the lecturer's main dashboard view."""
    total_modules: int
    total_students: int
    overall_attendance_rate: float # 0.0 to 100.0
    students_at_risk_count: int

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
    class Config:
        from_attributes = True

class ReportCriteria(BaseModel):
    """Defines the input parameters for generating an attendance report."""
    report_type: Literal['Daily', 'Monthly']
    date_from: date
    date_to: date
    module_code: str 
    attendance_status: Literal['All', 'Present', 'Absent']


class AttendanceLogEntry(BaseModel):
    user_id: str               
    student_name: str          
    module_code: str           
    status: Literal['Present', 'Absent', 'Late'] 
    date: str                 
    lesson_id: int             
    
    class Config:
        from_attributes = True

class DetailedAttendanceRecord(BaseModel):
    # Top Section
    student_name: str
    user_id: str
    module_code: str
    date: str
    
    # Details Section (Left Column)
    attendance_status: Literal['Present', 'Absent', 'Late']
    live_check: Literal['Passed', 'Failed', 'N/A']
    timestamp: str 
    virtual_tripwire: Literal['Triggered', 'Untriggered', 'N/A']
    
    # Details Section (Right Column)
    attendance_method: str
    camera_location: str
    verification_type: str
    
    class Config:
        from_attributes = True

class DailyTimetable(BaseModel):
    module_code: str
    module_name: str
    lesson_type: str
    start_time: str  # "14:00"
    end_time: str    # "15:30"
    location: str
   
    class Config:
        from_attributes = True

class Weeklytimetable(BaseModel):
    day_of_week: str
    date_of_day: str  
    module_code: str
    module_name: str
    lesson_type: str
    start_time: str  # "14:00"
    end_time: str    # "15:30"
    location: str
    class Config:
        from_attributes = True  

class MonthlyTimetable(BaseModel):
    date_of_month: date 
    module_code: str
    class Config:
        from_attributes = True

# Attendance Detail for the class
class AttendanceDetailRow(BaseModel):
    user_id: str               # S1001
    student_name: str          # John Smith
    check_in_time: str | None  # 09:00 AM (from EntLeave)
    status: Literal['Present', 'Absent', 'Late']
    
    class Config:
        from_attributes = True

class OverallClassAttendanceDetails(BaseModel):
    # Header Information
    subject_details: str       # CSCI334 - Database Systems
    lesson_details: str        # 28 Oct 2025 · 9:00 AM · Lab 2 (Room 3-05)
    
    # Metrics
    attended_count: int        # 42
    total_enrolled: int        # 45
    attendance_rate: float     # 93.0
    Present_count: int        # 36
    late_arrivals: int         # 3
    absentees: int             # 3

    # The Data Table
    attendance_log: List[AttendanceDetailRow]
    
    class Config:
        from_attributes = True

class RecentSessionsCardData(BaseModel):
    Recent_sessions_record: int    

class AttendanceOverviewCard(BaseModel):
    Average_attendance: float  