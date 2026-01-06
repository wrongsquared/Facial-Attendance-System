 
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from schemas.platformManager import InstitutionFullProfile, campusDisplay
from database.db_config import get_db
from dependencies.deps import get_current_user_id
# Import the Pydantic schemas you just created
from schemas import PlatformManagerDashboard, DashboardStats, UniversityDisplay, InstitutionProfile, InstitutionCreate, PaginatedInstitutionResponse
# Import your SQLAlchemy model for University
from database.db import Campus, University, User, UserProfile

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

@router.get("/institutions", response_model=List[campusDisplay])
def get_manager_campuses(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Fetches all campuses belonging to the University associated 
    with the current Platform Manager.
    """
    
    # 1. Find the current Platform Manager's profile 
    # and the specific campus they are registered under
    pm_user = db.query(User).filter(User.userID == current_user_id).first()
    
    if not pm_user or not pm_user.profileType or not pm_user.profileType.campus:
        raise HTTPException(
            status_code=404, 
            detail="Platform Manager's primary campus association not found."
        )

    # 2. Identify the University ID from the manager's campus
    target_university_id = pm_user.profileType.campus.universityID

    # 3. Fetch all campuses that belong to that University
    campuses = db.query(Campus).filter(
        Campus.universityID == target_university_id
    ).order_by(Campus.campusName).all()

    return campuses

@router.get("/institution/{campus_id}", response_model=InstitutionFullProfile)
def get_institution_details(
    campus_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # 1. Fetch University Details
    uni = db.query(Campus).filter(Campus.campusID == campus_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")

    # 2. Fetch all Admins tied to any campus belonging to this University
    # Logic: User -> UserProfile -> Campus -> University
    admins = db.query(User).join(UserProfile).join(Campus).filter(
        Campus.campusID == campus_id,
        User.type == "admin"
    ).all()

    # 3. Format data (Mapping 'contactNumber' from DB to 'phone' in Schema)
    admin_list = []
    for a in admins:
        admin_list.append({
            "userID": a.userID,
            "name": a.name,
            "email": a.email,
            "phone": a.contactNumber if a.contactNumber else "Not provided",
            "type": a.type
        })

    return {
        "details": uni,
        "admins": admin_list
    }

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