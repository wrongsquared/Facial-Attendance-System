from pydantic import BaseModel
import datetime
from typing import List

class UniversityDisplay(BaseModel):
    universityID: int
    universityName: str
    subscriptionDate: datetime.datetime

    class Config:
        orm_mode = True # Helps Pydantic read data from ORM models

# Schema for the dashboard statistics card
class DashboardStats(BaseModel):
    total_institutions: int

# The final response model for the main dashboard endpoint
class PlatformManagerDashboard(BaseModel):
    stats: DashboardStats
    recent_subscriptions: List[UniversityDisplay]