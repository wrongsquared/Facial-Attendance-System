 
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from database.db_config import get_db
from dependencies.deps import get_current_user_id
# Import the Pydantic schemas you just created
from schemas import PlatformManagerDashboard, DashboardStats, UniversityDisplay
# Import your SQLAlchemy model for University
from database.db import University

router = APIRouter(
    prefix="/platform-manager",  # All routes here will start with /platform-manager
    tags=["Platform Manager"]   # Group these endpoints in the API docs
)

@router.get("/dashboard", response_model=PlatformManagerDashboard)
def get_platform_manager_dashboard(
    db: Session = Depends(get_db), 
    current_user_id: str = Depends(get_current_user_id) # Enforces authentication
):
    """
    Retrieves the main dashboard data for the Platform Manager.
    
    This includes:
    - The total count of registered institutions.
    - A list of the 5 most recently subscribed institutions.
    """
    # Query for the total number of institutions
    total_institutions_count = db.query(University).count()
    
    # Query for the 5 most recent subscriptions
    recent_subscriptions = db.query(University).order_by(desc(University.subscriptionDate)).limit(5).all()
    
    # Assemble the data into the Pydantic response model
    dashboard_data = {
        "stats": {
            "total_institutions": total_institutions_count
        },
        "recent_subscriptions": recent_subscriptions
    }
    
    return dashboard_data

@router.get("/institutions", response_model=List[UniversityDisplay])
def get_all_institutions(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Retrieves a list of all institutions subscribed to the platform,
    ordered by name.
    """
    institutions = db.query(University).order_by(University.universityName).all()
    return institutions

@router.get("/institution/{university_id}", response_model=UniversityDisplay)
def get_institution_details(
    university_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Retrieves detailed information for a single institution by its ID.
    This corresponds to the 'View' action button.
    """
    institution = db.query(University).filter(University.universityID == university_id).first()
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institution with ID {university_id} not found."
        )
        
    return institution