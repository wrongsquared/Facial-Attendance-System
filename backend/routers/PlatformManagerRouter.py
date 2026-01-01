 
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from database.db_config import get_db
from dependencies.deps import get_current_user_id
# Import the Pydantic schemas you just created
from schemas import PlatformManagerDashboard, DashboardStats, UniversityDisplay, InstitutionProfile, InstitutionCreate, PaginatedInstitutionResponse
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

@router.get("", response_model=PaginatedInstitutionResponse)
def search_all_institution_profiles(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
    search: str = "",
    status_filter: Optional[bool] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100)
):
    """
    Get a paginated, searchable, and filterable list of all institution profiles.
    """
    query = db.query(University)

    # Apply search filter for ID or Name
    if search and len(search) > 0:
        # Check if search term is for a formatted ID like "INS005"
        query = query.filter(University.universityName.ilike(f"%{search}%"))

    # Apply status filter
    if status_filter:
        query = query.filter(University.isActive == status_filter)

    # Get total count for pagination
    total = query.count()

    # Apply pagination
    query = query.offset((page - 1) * size).limit(size)
    
    institutions = query.all()

    # Format the response data
    formatted_items = [
        InstitutionProfile(
            universityID=uni.universityID,
            universityAddress=uni.universityAddress,
            subscriptionDate=uni.subscriptionDate,
            universityName=uni.universityName,
            status=uni.isActive
        ) for uni in institutions
    ]

    return {
        "total": total,
        "page": page,
        "size": size,
        "institutions": formatted_items
    }

@router.post("", status_code=status.HTTP_201_CREATED, response_model=InstitutionProfile)
def create_institution_profile(
    institution: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Create a new institution profile.
    """
    new_university = University(
        universityName=institution.universityName,
        universityAddress=institution.universityAddress
        # Status defaults to 'Active' as defined in the model
    )
    db.add(new_university)
    db.commit()
    db.refresh(new_university)

    return InstitutionProfile(
        id_no=f"INS{new_university.universityID:04}",
        institutionName=new_university.universityName,
        status=new_university.status
    )

@router.delete("/{university_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_institution_profile(
    university_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Delete an institution profile.
    """
    university = db.query(University).filter(University.universityID == university_id).first()
    if not university:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    db.delete(university)
    db.commit()
    return None