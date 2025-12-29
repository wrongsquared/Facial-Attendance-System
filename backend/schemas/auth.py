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
    campus_id: int
    campus_name: str
    university_name: str
    
    studentNum: Optional[str] = None
    specialistIn: Optional[str] = None
    job: Optional[str] = None

