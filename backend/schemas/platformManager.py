from pydantic import BaseModel
import datetime
from typing import List

class UniversityDisplay(BaseModel):
    universityID: int
    universityName: str
    subscriptionDate: datetime.datetime

    class Config:
        from_attributes = True # Helps Pydantic read data from ORM models

# Schema for the dashboard statistics card
class DashboardStats(BaseModel):
    total_institutions: int

# The final response model for the main dashboard endpoint
class PlatformManagerDashboard(BaseModel):
    stats: DashboardStats
    recent_subscriptions: List[UniversityDisplay]

# Schema for creating a new institution
class InstitutionCreate(BaseModel):
    universityName: str
    universityAddress: str
    status: str  # e.g., "Active" or "Inactive"

# Schema for detailed institution profile
class InstitutionProfile(BaseModel):
    universityID: int
    universityName: str
    universityAddress: str
    subscriptionDate: datetime.datetime
    status: bool

    class Config:
        from_attributes = True 
# Helps Pydantic read data from ORM models    

# Schema for paginated institution responses
class PaginatedInstitutionResponse(BaseModel):
    total: int
    page: int
    size: int
    institutions: List[InstitutionProfile] 

    class Config:
        from_attributes = True