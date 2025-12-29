from pydantic import BaseModel

class AdminDashboardStats(BaseModel):
    overall_attendance_rate: float
    monthly_absences: int
    total_active_users: int
    total_records: int
    # Optional trends (You can calculate these or hardcode "0" for MVP)
    trend_attendance: str 
    trend_absences: str
    trend_users: str
    trend_records: "str"

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