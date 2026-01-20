
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy import func, distinct, case, literal, and_
from fastapi.middleware.cors import CORSMiddleware 

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, joinedload
from database.db_config import get_db #Gets the Initialized db session
from database.db import (InstitutionRegistration, UserProfile, #This was really long so I had to bracket it
                         User, 
                         Lecturer, 
                         Student,
                         Admin,
                         Campus,
                         University,
                        PlatformMgr
                         )

from uuid import UUID
from schemas import (UserSignUp, #This was really long so I had to bracket it
                     UserLogin, 
                     TokenResponse)

from dependencies.deps import get_current_user_id
from client import supabase, supabase_adm
from datetime import datetime
from routers import (adminDashboardRouter, 
                     studentDashboardRouter, 
                     lecturerDashboardRouter, 
                     lecturerInnardsRouter,
                     PlatformManagerRouter, 
                     studentInnardsRouter,
                     adminInnardsRouter)


app = FastAPI()

origins = [
    "http://localhost:3000",  # React Create App
]

app.add_middleware(
    CORSMiddleware,
    allow_origins= origins,
    allow_credentials = True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def read_root(db: Session= Depends(get_db)):
    response = (supabase_adm.table("users").select("*").execute())
    return {"Message": response}

@app.post("/register/institution", status_code=status.HTTP_201_CREATED)
def register_institution(
    form_data: InstitutionRegistration, 
    db: Session = Depends(get_db)
):
    try:
        # --- Step 1: Create University ---
        # new_uni = University(
        #     universityName=form_data.institutionName,
        #     universityAddress=form_data.address,
        #     subscriptionDate=datetime.now(),
        #     isActive=True

        # )
        # db.add(new_uni)
        # db.flush() # Generate ID

        # # --- Step 2: Create Main Campus ---
        # new_campus = Campus(
        #     campusName=f"{form_data.institutionName}",
        #     campusAddress=form_data.address,
        #     universityID=new_uni.universityID,
        #     created_at=datetime.now()
        # )
        # db.add(new_campus)
        # db.flush() # Generate ID

        # --- Step 3: Create Supabase Auth User ---
        # We use supabase_adm (Service Role) because we are creating an admin
        user_uuid = None
        try:
            user_payload = {
                "email": form_data.email,
                "password": form_data.password,
                "email_confirm": True,
                "user_metadata": { "name": form_data.fullName }
            }
            auth_response = supabase_adm.auth.admin.create_user(user_payload)
            user_uuid = auth_response.user.id
        except Exception as auth_error:
            print(f"Auth Error: {auth_error}")
            raise HTTPException(status_code=400, detail="Email already registered or invalid password.")

        # --- Step 4: Handle User Profile ---
        # Check/Create PManager Profile Type for this specific Campus
        pm_profile = db.query(UserProfile).filter_by(
            profileTypeName="PManager", 
            campusID=new_campus.campusID
        ).first()

        if not pm_profile:
            pm_profile = UserProfile(
                profileTypeName="PManager",
                campusID=new_campus.campusID
            )
            db.add(pm_profile)
            db.flush()

        # --- Step 5: Create Platform Manager Record ---
        new_manager = PlatformMgr(
            userID=UUID(str(user_uuid)),
            profileTypeID=pm_profile.profileTypeID, 
            role="Platform Manager",
            email=form_data.email,
            name=form_data.fullName,
            photo=None,
            address=form_data.address,
            phone=form_data.phoneNumber
        )
        
        db.add(new_manager)
        db.commit()

        return {
            "message": "Institution registered successfully",
            "uni_id": new_uni.universityID,
            "user_id": user_uuid
        }

    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        print(f"Registration Error: {str(e)}")
        # Optional: Delete auth user if DB failed to prevent ghost users
        if 'user_uuid' in locals() and user_uuid:
            try:
                supabase_adm.auth.admin.delete_user(user_uuid)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/createAcc", status_code=status.HTTP_201_CREATED)
def register_user(user: UserSignUp, db: Session = Depends(get_db)):
    # Create User in Supabase Auth
    try:
        # This contacts Supabase Cloud to create the login
        auth_response = supabase_adm.auth.admin.create_user({
            "email": user.email,
            "password": user.password,
            # Optional: Add metadata so it lives in the JWT
            "options": {
                "data": {
                    "name": user.name,
                    "role": user.role
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Signup failed (User already exists?)")
            
        # Capture the UUID generated by Supabase
        new_uuid = UUID(auth_response.user.id)

    except Exception as e:
        # Catch Supabase errors (like "Password too short" or "Email exists")
        raise HTTPException(status_code=400, detail=str(e))


    # Create Profile in Postgres
    try:
        new_db_user = None

        if user.role.lower() == "student":
            # Ensure course_id is provided for students
            if not user.course_id:
                raise HTTPException(status_code=400, detail="Student requires a course_id")

            new_db_user = Student(
                userID=new_uuid,  # LINKING THE UUID
                name=user.name,
                email=user.email,
                profileTypeID=user.profile_type_id,
                courseID=user.course_id,
                # Default values
                photo=None
            )
            
        elif user.role.lower() == "lecturer":
            new_db_user = Lecturer(
                userID=new_uuid, # <--- LINKING THE UUID
                name=user.name,
                email=user.email,
                profileTypeID=user.profile_type_id,
                photo=None
            )
        else:
            # If role is invalid, we have a problem. 
            # We created an Auth User but can't create a DB Profile.
            # We should technically delete the Auth User here to clean up.
            raise HTTPException(status_code=400, detail="Invalid Role")

        # Save to Database
        db.add(new_db_user)
        db.commit()
        db.refresh(new_db_user)

        return {"message": "User created successfully", "user_id": new_uuid}

    except Exception as e:
        # CRITICAL: If DB insert fails (e.g. Course ID doesn't exist), 
        # we have a "Ghost User" in Supabase Auth but no profile in DB.
        db.rollback()
        
        # Cleanup: Delete the Auth user so they can try again
        # Note: Requires Service Role Key to delete. If using Anon key, you can't cleanup easily.
        print(f"Database error: {e}") 
        raise HTTPException(status_code=500, detail="Profile creation failed. Please contact support.")

@app.delete("/delacc/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    

    # Check if user exists in Public DB
    # We query the Base 'User' table because it covers Students, Lecturers, etc.
    user_to_delete = db.query(User).filter(User.userID == user_id).first()
    
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User not found in database")

    # Delete from Public Database (SQLAlchemy)
    try:
        db.delete(user_to_delete)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete profile: {str(e)}")


    # Delete from Supabase Auth (Cloud)

    try:
        # returns an object with 'data' and 'error' (in older versions) 
        # or simply returns None/Data (in newer versions)
        response = supabase_adm.auth.admin.delete_user(str(user_id))
        
        # Note: If the user didn't exist in Auth (ghost user), this might throw an error 
        # or just work silently. We generally assume success if no exception raised.
        
    except Exception as e:
        # If Auth deletion fails, we have a problem: 
        # The profile is gone from DB, but the login remains.
        # Ideally, you should log this error heavily.
        print(f"CRITICAL: Profile deleted but Auth User {user_id} remains! Error: {e}")
        raise HTTPException(status_code=500, detail="Profile deleted, but Auth account cleanup failed.")

    return None

 #Student Login 
@app.post("/login", response_model = TokenResponse)
def login(credentials:UserLogin, db:Session = Depends(get_db)):
    try:
        # This sends email/password to Supabase. 
        # If valid, Supabase returns a Session object with tokens.
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        session = auth_response.session
        user = auth_response.user
        if not session or not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        # Supabase throws an exception if password is wrong or email not confirmed
        raise HTTPException(status_code=401, detail=str(e))

    # Identify Role from Postgres DB
    
    user_uuid = user.id
    
    # Query the 'users' table to get the profileTypeID
    result = (
        db.query(User, UserProfile)
        .join(UserProfile, User.profileTypeID == UserProfile.profileTypeID)
        .filter(User.userID == user_uuid)
        .first()
    )

    if not result:
        # This handles cases where the user exists in Auth but not DB, 
        # OR if the data integrity is broken (e.g. User exists but has no linked Campus)
        raise HTTPException(status_code=404, detail="User profile or campus data incomplete.")

    # Unpack the results
    db_user, db_profile = result
    role_name = db_profile.profileTypeName 
    studentNums = None
    specialistIns = None
    admin_role = None
    if role_name == "Student":
        student_row = db.query(Student).filter(Student.studentID == user_uuid).first()
        if student_row: studentNums = student_row.studentNum

    elif role_name == "Lecturer":
        lecturer_row = db.query(Lecturer).filter(Lecturer.lecturerID == user_uuid).first()
        if lecturer_row: specialistIns = lecturer_row.specialistIn
    elif role_name == "Admin": 
        # Query the Admin table
        admin_row = db.query(Admin).filter(Admin.adminID == user_uuid).first()
        if admin_row:
            # Get the specific 'role' column (e.g., "System Administrator")
            admin_role = admin_row.role 
    # Return the Bundle

    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "token_type": "bearer",
        "user_id": user_uuid,
        "role_id": db_profile.profileTypeID,
        "role_name": db_profile.profileTypeName,
        "name": db_user.name,
        # "campus_id": db_campus.campusID,
        # "campus_name": db_campus.campusName,
        # "university_name": db_uni.universityName,

        "studentNum": studentNums,
        "specialistIn": specialistIns,
        "job": admin_role
    }

@app.post("/logout", status_code=204)
def logout():
    """
    Logs out the user on the server side (invalidates refresh token).
    The Frontend MUST also delete the token from LocalStorage.
    """
    try:
        supabase.auth.sign_out()
        return None
    except Exception as e:
        # Even if it fails, we return 204 because the user wants to leave.
        return None
    
@app.get("/student/my-profile")
def read_my_student_profile(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    
    student_data = db.query(Student).filter(Student.studentID == user_id).first()
    return student_data

@app.get("/lecturer/my-profile")
def read_my_student_profile(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    
    lecturer_data = db.query(Lecturer).filter(Lecturer.lecturerID == user_id).first()
    return lecturer_data

@app.get("/admin/my-profile")
def read_my_student_profile(
    user_id: str = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    
    admin_data = db.query(Admin).filter(Admin.adminID == user_id).first()
    return admin_data

#Important to keep this
app.include_router(studentDashboardRouter.router, tags=['student'])
app.include_router(adminDashboardRouter.router, tags=['admin'])
app.include_router(lecturerDashboardRouter.router, tags=['lecturer'])
app.include_router(PlatformManagerRouter.router)
app.include_router(studentInnardsRouter.router)
app.include_router(lecturerInnardsRouter.router)
app.include_router(adminInnardsRouter.router)

