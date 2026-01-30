from pydantic import BaseModel, EmailStr
from typing import Literal, List, Optional
from datetime import date
from uuid import UUID
class AdminDashboardStats(BaseModel):
    overall_attendance_rate: float
    monthly_absences: int
    total_active_users: int
    total_records: int
    # Optional trends (You can calculate these or hardcode "0" for MVP)
    trend_attendance: str 
    trend_absences: str
    trend_users: str
    trend_records: str

class CourseAttentionItem(BaseModel):
    module_code: str
    module_name: str
    lecturer_name: str
    student_count: int
    attendance_rate: int

class UserManagementItem(BaseModel):
    user_id: str # UUID
    name: str
    email: str
    role: str    # "Student", "Lecturer"
    status: str  # "active", "pending"
    joined_date: str # Formatted date string or datetime

    class Config:
        from_attributes = True

class AdminReportRequest(BaseModel):
    report_type: Literal["Module Performance", "Low Attendance Rate"]
    date_from: date
    date_to: date
    course_id: Optional[str] = "All"

class UserListItem(BaseModel):
    uuid: UUID
    user_display_id: str 
    name: str
    role: str
    status: str
    attendanceMinimum: Optional[float] = None 

    class Config:
        from_attributes = True

class AdminProfileUpdateRequest(BaseModel):
    contactNumber: str
    address: str
    emergencyContactName: str
    emergencyContactRelationship: str
    emergencyContactNumber: str

class AttendanceUpdateRequest(BaseModel):
    user_id: str
    date: str  # Format: "DD MMM YYYY" like "01 Dec 2025" 
    new_status: Literal["Present", "Absent", "Late"]
    reason: Optional[str] = None
    admin_notes: Optional[str] = None
    lesson_id: Optional[int] = None  # Specific lesson ID to update

class UserManageSchema(BaseModel):
    uuid: UUID
    name: str
    email: str
    role: str
    studentNum: Optional[str] = "-" # This will hold ID for students, Job for admins
    status: str

    class Config:
        from_attributes = True

class CreateUserSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str # "student", "lecturer", "admin"
    courseID: Optional[int] = None 
    # These are missing from the Form.
    studentNum: Optional[str] = None 
    specialistIn: Optional[str] = None # For lecturers
    jobTitle: Optional[str] = None     # For admins

class ModuleUpdateSchema(BaseModel):
    moduleName: str
    moduleCode: str
    startDate: str
    endDate: str
    lecturerID: Optional[str] = None

class UpdateUserSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None # Optional password reset
    # Role specific fields
    studentNum: Optional[str] = None
    courseID: Optional[int] = None
    specialistIn: Optional[str] = None
    jobTitle: Optional[str] = None

class UpdateProfileSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    fulladdress: Optional[str] = None
    roleName: Optional[str] = None # e.g., "Lecturer"
    status: Optional[str] = None   # "Active" or "Inactive"
    attendanceMinimum: Optional[float] = None