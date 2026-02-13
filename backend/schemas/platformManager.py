import uuid
from pydantic import BaseModel, ConfigDict
import datetime
from typing import List, Optional

class UniversityDisplay(BaseModel):
    universityID: int
    universityName: str
    campusID: int   
    campusName: str
    campusAddress: Optional[str] = None      
    subscriptionDate: datetime.datetime
    isActive: bool

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

# Schema for paginated institution responses
class PaginatedInstitutionResponse(BaseModel):
    total: int
    page: int
    size: int
    institutions: List[InstitutionProfile] 

    class Config:
        from_attributes = True

class AdminUserDisplay(BaseModel):
    userID: uuid.UUID
    name: str
    email: str
    phone: Optional[str] = None # We will map contactNumber to this
    type: str
    isActive: bool
    
    model_config = ConfigDict(from_attributes=True)

class campusDisplay(BaseModel):
    campusID: int
    campusName: str
    campusAddress: str
    created_at: datetime.date

    model_config = ConfigDict(from_attributes=True)

# The response model for the Profile View
class InstitutionFullProfile(BaseModel):
    details: campusDisplay
    admins: List[AdminUserDisplay]       


# Schema for updating an existing institution/campus
class InstitutionUpdate(BaseModel):
    campusName: str
    campusAddress: str

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel, EmailStr

class CampusCreate(BaseModel):
    campusName: str
    campusAddress: str

class UserStatusUpdate(BaseModel):
    isActive: bool

class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    contactNumber: Optional[str] = None
    password: str