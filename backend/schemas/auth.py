from pydantic import BaseModel, EmailStr
from typing import Optional

# User Login
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
    name: str
    photo: Optional[str] = None    
    studentNum: Optional[str] = None
    specialistIn: Optional[str] = None
    job: Optional[str] = None

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
    name: str | None = None
    email: EmailStr | None = None
    contactNumber: str | None = None
    address: str | None = None

    emergencyContactName: str | None = None
    emergencyContactRelationship: str | None = None
    emergencyContactNumber: str | None = None
    class Config:
        from_attributes = True
