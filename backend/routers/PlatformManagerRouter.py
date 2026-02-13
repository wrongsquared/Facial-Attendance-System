import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime

import supabase 


# Ensure Campus is imported here
from database.db import Admin, Campus, University, User, UserProfile
from database.db_config import get_db
from dependencies.deps import get_current_user_id


# Import schemas
from schemas import (
    PlatformManagerDashboard, 
    DashboardStats, 
    UniversityDisplay, 
    InstitutionProfile, 
    InstitutionCreate, 
    PaginatedInstitutionResponse
)
from schemas.platformManager import AdminCreate, InstitutionFullProfile, InstitutionUpdate, campusDisplay, CampusCreate, UserStatusUpdate

router = APIRouter(
    prefix="/platform-manager",
    tags=["Platform Manager"]
)


@router.get("/dashboard", response_model=PlatformManagerDashboard)
def get_platform_manager_dashboard(
    db: Session = Depends(get_db), 
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Retrieves dashboard data showing ONLY Campuses linked to the 
    current Platform Manager's University.
    """
    
    # Identify the Current User and their University
    pm_user = db.query(User).filter(User.userID == current_user_id).first()
    
    # Ensure the user exists and is linked to a campus/university
    if not pm_user or not pm_user.profileType:
        raise HTTPException(
            status_code=404, 
            detail="Platform Manager is not associated with a valid university."
        )

    # Get the ID of the University this manager is responsible for
    target_university_id = pm_user.universityID

    # Count Total Campuses for this University
    total_institutions_count = db.query(Campus).filter(
        Campus.universityID == target_university_id
    ).count()
    
    # Query Recent Campuses for this University
    recent_campuses = (
        db.query(Campus)
        .join(University)
        .filter(Campus.universityID == target_university_id)  
        .order_by(Campus.campusID) 
        .limit(10)
        .all()
    )

   
    # Map the data
    formatted_subscriptions = []
    
    for campus in recent_campuses:
        formatted_subscriptions.append({
            "universityID": campus.universityID,
            "universityName": campus.university.universityName,
            "campusID": campus.campusID,
            "campusName": campus.campusName,
            "campusAddress": campus.campusAddress,
            "subscriptionDate": campus.created_at,
            "isActive": campus.university.isActive
        })
    
    return {
        "stats": {
            "total_institutions": total_institutions_count
        },
        "recent_subscriptions": formatted_subscriptions
    }


@router.get("/institutions", response_model=List[campusDisplay])
def get_manager_campuses(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Identify User
    pm_user = db.query(User).filter(User.userID == current_user_id).first()
    
    if not pm_user or not hasattr(pm_user, 'profileType'):
        raise HTTPException(
            status_code=404, 
            detail="Platform Manager's primary university association not found."
        )

    target_university_id = pm_user.universityID

    # Query Campuses
    campuses = db.query(Campus).filter(
        Campus.universityID == target_university_id
    ).order_by(Campus.campusName).all()

    # Format the response to match the 'campusDisplay' schema keys
    formatted_campuses = []
    for campus in campuses:
        formatted_campuses.append({
            "campusID": campus.campusID,
            "campusName": campus.campusName,
            "campusAddress": campus.campusAddress ,
            "created_at": campus.created_at.date() if campus.created_at else None 
        })
    
    return formatted_campuses

@router.get("/institution/{campus_id}", response_model=InstitutionFullProfile)
def get_institution_details(
    campus_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Load the university
    uni = db.query(Campus).options(
        joinedload(Campus.university) 
    ).filter(Campus.campusID == campus_id).first()

    if not uni:
        raise HTTPException(status_code=404, detail="Campus not found")

    # Fetch admins
    admins = db.query(Admin).filter(
        Admin.campusID == campus_id
    ).all()

    admin_list = []
    for a in admins:
        admin_list.append({
            "userID": str(a.userID),
            "name": a.name,
            "email": a.email,
            "phone": a.contactNumber if a.contactNumber else None, 
            "type": a.type,
            "isActive": True if a.active is True else False
        })

    return {
        "details": {
            "campusID": uni.campusID,
            "campusName": uni.campusName,
            "campusAddress": uni.campusAddress,
            "created_at": uni.created_at.date() if uni.created_at else None
        },
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

@router.put("/institution/{campus_id}")
def update_institution_profile(
    campus_id: int,
    update_data: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Updates the name and address of a specific campus.
    """
    # Search for the campus by ID
    db_campus = db.query(Campus).filter(Campus.campusID == campus_id).first()

    if not db_campus:
        raise HTTPException(
            status_code=404, 
            detail="Campus not found"
        )

    # Update the fields
    db_campus.campusName = update_data.campusName
    db_campus.campusAddress = update_data.campusAddress

    try:
        # Commit the changes to the database
        db.commit()
        db.refresh(db_campus)
        
        return {
            "status": "success",
            "message": "Institution profile updated successfully",
            "data": {
                "campusID": db_campus.campusID,
                "campusName": db_campus.campusName,
                "campusAddress": db_campus.campusAddress
            }
        }
    except Exception as e:
        db.rollback()
        print(f"Update Error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="An error occurred while updating the database."
        )

@router.post("/campus", status_code=status.HTTP_201_CREATED)
def create_campus_only(
    payload: CampusCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Identify the Platform Manager's University
    pm_user = db.query(User).filter(User.userID == current_user_id).first()
    
    if not pm_user or not pm_user.profileType:
         raise HTTPException(status_code=404, detail="Manager university not found")
         
    university_id = pm_user.universityID

    try:
        # Create the Campus
        new_campus = Campus(
            campusName=payload.campusName,
            campusAddress=payload.campusAddress,
            universityID=university_id,
            
            created_at=datetime.now() 
        )
        db.add(new_campus)

        db.commit()
        db.refresh(new_campus)

        return new_campus
    
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Campus name already exists")

    except Exception as e:
        db.rollback()
        print(f"Full Error: {e}") 
        raise HTTPException(status_code=500, detail=f"Failed to create campus: Campus name already exists")
 
@router.delete("/campus/{campus_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campus_profile(
    campus_id: int,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Deletes a specific Campus profile. 
    Also removes the association (UserProfile) for any admins linked to this campus.
    """
    
    # Identify the Platform Manager's University
    pm_user = db.query(User).filter(User.userID == current_user_id).first()
    
    if not pm_user or not pm_user.profileType:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    my_university_id = pm_user.universityID

    # Find the Campus to delete
    campus_to_delete = db.query(Campus).filter(Campus.campusID == campus_id).first()

    if not campus_to_delete:
        raise HTTPException(status_code=404, detail="Campus not found")

    # Ensure the campus belongs to the Manager's University
    if campus_to_delete.universityID != my_university_id:
        raise HTTPException(
            status_code=403, 
            detail="You are not authorized to delete this campus."
        )
    
    try:
        # Remove UserProfiles linked to this campus first
        db.query(Admin).filter(Admin.campusID == campus_id).delete(synchronize_session=False)

        # Delete the Campus
        db.delete(campus_to_delete)
        
        db.commit()
        return None
    
    except IntegrityError:
        
        db.rollback()
        print(f"Delete Failed: Campus {campus_id}.")
        # Return a 400 Bad Request so the frontend displays the error message properly
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete this Campus."
        )

    except Exception as e:
        db.rollback()
        print(f"Delete Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete campus")
    
@router.put("/admin/{user_id}/status")
def update_admin_status(
    user_id: str,
    status_update: UserStatusUpdate, 
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id)
):
    # Find the user by ID
    user = db.query(User).filter(User.userID == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Update the Database column 'active' using the Schema field 'isActive'
    user.active = status_update.isActive 
    
    try:
        db.commit()
        return {"message": "Status updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update database")

def getsupabaseclient():
    spbse: supabase.Client = supabase.create_client(os.getenv("SPBASE_URL"), os.getenv("SPBASE_SKEY")) 
    return spbse

@router.post("/campus/{campus_id}/add-admin", status_code=status.HTTP_201_CREATED)
def add_admin_to_campus(
    campus_id: int, 
    payload: AdminCreate, 
    db: Session = Depends(get_db),
    supabase_client: supabase.Client = Depends(getsupabaseclient)
):
    # Check Supabase Config
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured in backend.")

    # Check Local DB for duplicates
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered locally.")

    # Create in Supabase Auth
    new_uuid = None
    try:
        auth_user = supabase_client.auth.admin.create_user({
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True
        })
        new_uuid = auth_user.user.id
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg or "unique constraint" in error_msg:
            raise HTTPException(status_code=400, detail="Email already registered in Auth system.")
        
        raise HTTPException(status_code=400, detail=f"{error_msg}")
        

    try:
        new_profile_object = UserProfile(
            profileTypeName="Admin"
        )

        # Create the User Object
        new_user = Admin(
            userID=new_uuid,
            profileType=new_profile_object, 
            email=payload.email,
            name=payload.name,
            role="System Administrator",
            contactNumber=payload.contactNumber,
            type="admin",
            active=True,
            campusID = campus_id
        )

        db.add(new_user)
        db.commit()

        return {"message": "Admin added successfully"}

    except Exception as e:
        db.rollback()
        # Cleanup Supabase if DB fails
        if new_uuid:
            try:
                supabase_client.auth.admin.delete_user(new_uuid)
            except:
                pass
        msg = str(e)
        if "unique constraint" in msg.lower():
            raise HTTPException(status_code=400, detail="This user already exists in the system.")
    
        raise HTTPException(status_code=500, detail=f"System Error: {msg}")