from pydantic import BaseModel
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

    class Config:
        from_attributes = True