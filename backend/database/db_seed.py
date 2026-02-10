import shutil
import os
import uuid
import random

from sqlalchemy import func
from faker import Faker
from sqlalchemy.orm import Session
from db_config import SessionLocal, DATABASE_URL
from db_clear import clear_db
from db import (University, PlatformMgr, Campus, User, 
                Courses, UserProfile, Admin, Lecturer, 
                Student, EntLeave, AttdCheck, Module, 
                Lesson, LecMod, StudentModules, Courses,
                TutorialsGroup, StudentTutorialGroup)
from datetime import timedelta, datetime
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client
import traceback
load_dotenv()

def upload_default_assets(supabase: Client) -> str:
    """
    Uploads the default profile picture once to a shared folder.
    Returns the storage path to be used by all seeded users.
    """
    local_path = "./genericimage/gaiusgenericus.png"
    storage_path = "defaults/gaius_genericus.png"
    bucket_name = "avatars"

    try:
        with open(local_path, 'rb') as f:
            file_data = f.read()

        supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=file_data,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        print(f"   [+] Shared default photo uploaded to: {storage_path}")
        return storage_path
    except Exception as e:
        print(f"   [!] Note: Default photo already exists or: {e}")
        return storage_path 
    
def upload_photo(user_uuid: str, local_file_path: str, supabase: Client) -> str:
    """
    Reads a local file and uploads it to Supabase Storage 
    in a folder named after the user UUID.
    Returns the storage path string.
    """
    try:    

        file_ext = local_file_path.split('.')[-1]
        storage_path = f"{user_uuid}/profile.{file_ext}"
        bucket_name = "avatars"

        #  Read the local file as binary
        with open(local_file_path, 'rb') as f:
            file_data = f.read()

        response = supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=file_data,
            file_options={"content-type": "image/jpeg", "upsert": "true"}
        )
        return storage_path

    except Exception as e:
        print(f"   [!] Error uploading photo for {user_uuid}: {e}")
        return None
def createAccountgetuuid(email: str , password: str, email_confirmed: bool):
    try:
        user_payload = {
            "email": email,
            "password": password,
            "email_confirm": email_confirmed
        }
        auth_response = spbse.auth.admin.create_user(user_payload)
        user_uuid = auth_response.user.id
    except Exception:
        users = spbse.auth.admin.list_users()
        user_uuid = next((u.id for u in users if u.email == email), None)

    return user_uuid

def uniCampusSeed(dbSessionLocalInstance:Session, spbase: Client):
    print(f"Seeding Unis: \n")
    twoUnis = [{"name":"University of Wollongong", "address":"123 Happy Street",
                "campuses":[{"name":"UOW Wollongong", "address":"123 Happy Street"}, {"name":"UOW Neverland", "address":"456 Rogers Road"}]},
               {"name":"University of Neverland", "address":"123 Joyful Avenue",
                "campuses":[{"name":"UON Neverland", "address":"123 Joyful Avenue"}, {"name":"UON Canberra", "address":"146 Funland Road"}]}]

    for uni in twoUnis:
        newuni = University(
            universityName = uni["name"], 
            universityAddress = uni["address"], 
            subscriptionDate = Faker().date_this_decade()
        )
        dbSessionLocalInstance.add(newuni)
        dbSessionLocalInstance.flush()  # Ensure newuni gets its ID

        for campus in uni["campuses"]:
            dbSessionLocalInstance.add(
                Campus(
                    campusName = campus["name"], 
                    campusAddress = campus["address"], 
                    university = newuni,
                    created_at = Faker().date_this_decade()
                ))
    
    dbSessionLocalInstance.commit()
    return None

def seedCoursesOSS(dbSessionLocalInstance: Session, spbase: Client): 
    #No Primary Keys
    print(f"Seeding Courses: \n")
    campuses = dbSessionLocalInstance.query(Campus).all()

    courseCodeHeader = ['ISIT', 'CSIT', 'CSCI']
    courseNames = ["Bsc in Ba in B in Technology","Bsc in Advanced Programming","Bsc in Big Data Application", "Bsc in Cybersecurity", "Bsc in Game Development", "Bachelor in Computer Science", "Bsc in Information Technology", "Bsc in Computer Science", "Bc in Science Computer","Bs in Computer Arts"]
    i= 0
    loc = []
    while i < 10:
        head = random.choice(courseCodeHeader)
        tail = str(random.randint(1, 999)).zfill(3) 
        # Generate a Random List of Courses.
        randomCourse = head + tail
        campus = random.choice(campuses)
        if randomCourse in loc:
            continue
        else:
            dbSessionLocalInstance.add(Courses(courseCode = randomCourse, campus = campus))
            loc.append(randomCourse)
            i+=1

    dbSessionLocalInstance.commit()
    return None

def userProfileSeeder(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding User Profiles for all campuses...\n")
    
    campuses = dbSessionLocalInstance.query(Campus).all()
    
    if not campuses:
        print("No campuses found. Please seed campuses before running the UserProfile seeder.")
        return None

    profileTypeList = ['Pmanager', 'Admin', 'Student', 'Lecturer']

    for campus in campuses:
        print(f"Processing roles for Campus: {campus.campusName} (ID: {campus.campusID})")
        
        for role_name in profileTypeList:
            # Check if this specific role already exists
            exists = dbSessionLocalInstance.query(UserProfile).filter_by(
                profileTypeName=role_name, 
                campusID=campus.campusID 
            ).first()
            
            if not exists:
                new_profile = UserProfile(
                    profileTypeName=role_name,
                    campusID=campus.campusID
                )
                dbSessionLocalInstance.add(new_profile)
            else:
                print(f" - Role '{role_name}' already exists for {campus.campusName}, skipping.")

    try:
        dbSessionLocalInstance.commit()
        print("\nUser Profile seeding completed successfully.")
    except Exception as e:
        dbSessionLocalInstance.rollback()
        print(f"An error occurred while seeding User Profiles: {e}")

    return None

def platSeed(dbSessionLocalInstance: Session, spbase: Client, defphotopath: str):
    print(f"Seeding Platform Managers: \n")
    fake = Faker()

    # Get all Universities
    universities = dbSessionLocalInstance.query(University).all()
    if not universities:
        print("No universities found. Please seed universities first.")
        return None

    # Ensure a GLOBAL PManager profile exists (campusID is None)
    # This role is used system-wide for all Platform Managers
    pm_profile = dbSessionLocalInstance.query(UserProfile).filter_by(
        profileTypeName="PManager",
        campusID=None
    ).first()

    if not pm_profile:
        print("Creating Global UserProfile: PManager...")
        pm_profile = UserProfile(
            profileTypeName="PManager",
            campusID=None # not tied to a specific campus
        )
        dbSessionLocalInstance.add(pm_profile)
        # Commit immediately so we have the ID for the managers
        dbSessionLocalInstance.commit() 
        dbSessionLocalInstance.refresh(pm_profile)

    # Iterate through each University to create one Manager
    for u in universities:
        safe_name = u.universityName.replace(" ", "").lower()
        email = f"manager@{safe_name}.edu"
        password = "password123"
        name = f"Manager of {u.universityName}"

        # Check if this specific Manager (by email) already exists in our User table
        existing_user = dbSessionLocalInstance.query(User).filter_by(email=email).first()
        if existing_user:
            print(f"  - Manager for {u.universityName} already exists ({email}). Skipping.")
            continue

        # Create User in Supabase Auth
        try:
            auth_response = spbase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            user_uuid = uuid.UUID(auth_response.user.id)
        except Exception as e:
            print(f"  - Error creating Supabase Auth user for {email}: {e}")
            continue

        # Create the PlatformMgr record linked to THIS University (u)
        new_manager = PlatformMgr(
            userID=user_uuid,
            profileTypeID=pm_profile.profileTypeID, 
            role="Platform Manager",
            email=email,
            name=name,
            creationDate = datetime.today(),
            contactNumber = random.randint(81111111, 99999999),
            photo=defphotopath,
            address=fake.address(),
            universityID=u.universityID, # Explicitly link to the current university in the loop
            emergencyContactName = fake.name(),
            emergencyContactRelationship = "Spouse",
            emergencyContactNumber = random.randint(81111111, 99999999)
        )
        
        dbSessionLocalInstance.add(new_manager)
        print(f"  + Successfully created Manager for: {u.universityName}")

    # Final commit for all created PlatformMgr records
    try:
        dbSessionLocalInstance.commit()
        print("\nPlatform Manager seeding completed successfully.")
    except Exception as e:
        dbSessionLocalInstance.rollback()
        print(f"Error during final database commit: {e}")

    return None

def studentSeed(dbSessionLocalInstance: Session, spbase: Client, defphotopath: str): 
    print(f"Seeding Students: \n")
    studentProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Student').first()
    specialNames = []
    #password is the same as the usernames
    userNames = []
    numRandStudent = 100 #Number of Random Students to Generate
    fake = Faker()
    
    #Random Students - 10
    i=0
    while i < numRandStudent:
        fakeName = fake.name()
        nameSplit = fakeName.split()
        userName = ""
        for j in nameSplit:
            userName += j[0]
        if fakeName in specialNames or userName in userNames:
            continue
        else:
            userNames.append(userName)
            specialNames.append(fakeName)
            i+=1
    #Courses
    courseobjs = dbSessionLocalInstance.query(Courses).all()
    rCourse = random.choice(courseobjs)
    studNums = []
    #student@uow.edu.au
    #Valid123
    baseemail = "student@uow.edu.au"
    basepass = "Valid123"
    user_uuid = createAccountgetuuid(baseemail, basepass, True)
    address = fake.address()
    all_campus = dbSessionLocalInstance.query(Campus).all()
    dbSessionLocalInstance.add(Student(userID = uuid.UUID(str(user_uuid)),
                                       profileType = studentProfile,
                                       email = baseemail,
                                       name= "Allison Lang",
                                       studentNum = "190036",
                                       creationDate = datetime.today(),
                                       attendanceMinimum = 75.0,
                                       course = rCourse,
                                        photo=defphotopath,
                                        address= address,
                                        contactNumber = random.randint(81111111, 99999999),
                                        campusID=random.choice(all_campus).campusID,
                                        emergencyContactName = fake.name(),
                                        emergencyContactRelationship = "Parent",
                                        emergencyContactNumber = random.randint(81111111, 99999999)
                                        ))
    studNums.append("190036")
    while len(specialNames) > 0:
        name = specialNames.pop()
        username = userNames.pop()
        rCourse = random.choice(courseobjs)
        email = username + "@uow.edu.au"
        #For Simplicity sake, username is the password!
        user_uuid = createAccountgetuuid(email, "Valid123", True)
        while True:
            studNumGen = random.randint(100001,999999)
            studNumGenstr = str(studNumGen)
            if studNumGenstr in studNums:
                continue
            else:
                studNums.append(studNumGenstr)
                break
        if not user_uuid:
            print(f" Skipping {name} ({email}): Auth creation failed (User might exist or error).")
            continue # Skip to next loop
        address = fake.address()
        dbSessionLocalInstance.add(Student(
                                        userID = uuid.UUID(str(user_uuid)),
                                        profileType = studentProfile,
                                        email = email,
                                        name = name,
                                        creationDate = datetime.today(),
                                        studentNum = studNumGenstr,
                                        attendanceMinimum = 75.0,
                                        course = rCourse,
                                        contactNumber = random.randint(81111111, 99999999),
                                        photo=defphotopath,
                                        address= address ,
                                        campusID=random.choice(all_campus).campusID,
                                        emergencyContactName = fake.name(),
                                        emergencyContactRelationship = "Parent",
                                        emergencyContactNumber = random.randint(81111111, 99999999)
                                    ))

    dbSessionLocalInstance.commit()

    return None

def adminSeed(dbSessionLocalInstance: Session, spbase: Client, defphotopath: str): 
    print(f"Seeding Admins: \n")
    
    # Setup Dependencies
    fake = Faker()
    AdminProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Admin').first()
    all_campus = dbSessionLocalInstance.query(Campus).all()
    
    if not AdminProfile or not all_campus:
        print("Error: Missing Admin Profile or Campuses. Seed those first.")
        return

    # Define the list of Admins to create
    admins_to_create = [
        {
            "name": "James Looker",
            "email": "Admin@uow.edu.au",
            "password": "Valid123"
        }
    ]

    numRandAdmins = 4
    i = 0
    generated_names = {"James Looker"} 
    
    while i < numRandAdmins:
        fakeName = fake.name()
        if fakeName in generated_names: 
            continue
            
        nameSplit = fakeName.split()
        userName = "".join([j[0] for j in nameSplit]) + str(random.randint(1,99))
        
        admins_to_create.append({
            "name": fakeName,
            "email": f"{userName}@uow.edu.au",
            "password": "Valid123" 
        })
        generated_names.add(fakeName)
        i += 1

    for admin_data in admins_to_create:
        email = admin_data["email"]
        password = admin_data["password"]
        name = admin_data["name"]

        user_uuid = createAccountgetuuid(email, password, True)
        
        if not user_uuid:
            print(f"   - User {email} might exist, fetching ID from Supabase...")
            try:
                users = spbase.auth.admin.list_users()
                existing_user = next((u for u in users if u.email == email), None)
                if existing_user:
                    user_uuid = existing_user.id
            except Exception as e:
                print(f"Critical Auth Error for {email}: {e}")
                continue 

        if not user_uuid:
            print(f"Could not resolve UUID for {email}. Skipping.")
            continue

        existing_profile = dbSessionLocalInstance.query(Admin).filter(Admin.adminID == user_uuid).first()

        if not existing_profile:
            try:

                new_admin = Admin(
                    userID=uuid.UUID(str(user_uuid)),
                    profileType=AdminProfile, 
                    name=name,
                    role="System Administrator",
                    email=email,
                    creationDate=datetime.today(),
                    photo=defphotopath,
                    address=fake.address(),
                    campusID=random.choice(all_campus).campusID,
                    contactNumber=str(random.randint(81111111, 99999999)),
                    emergencyContactName=fake.name(),
                    emergencyContactRelationship="Parent",
                    emergencyContactNumber=str(random.randint(81111111, 99999999))
                )
                dbSessionLocalInstance.add(new_admin)
            except Exception as e:
                print(f" DB Error adding {name}: {e}")
        else:
            print(f"Admin profile already exists: {name}")

    dbSessionLocalInstance.commit()
    return None

def lecturerSeed(dbSessionLocalInstance: Session, spbase: Client, defphotopath: str): 
        print(f"Seeding Lecturers: \n")

        # Setup Dependencies
        fake = Faker()
        LecturerProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Lecturer').first()
        all_campi = dbSessionLocalInstance.query(Campus).all()

        if not LecturerProfile or not all_campi:
            print("Error: Missing Lecturer Profile or Campuses. Seed those first.")
            return

        # Define the list of Lecturers to create
        lecturers_to_create = [
            {
                "name": "Agnes Lam",
                "email": "lecturer@uow.edu.au",
                "password": "Valid123",
                "specialistIn": "Computer Science"
            }
        ]

        # Generate Random Lecturers and add to the list
        numRandLecturer = 10
        i = 0
        generated_names = {"Agnes Lam"} # Track to avoid duplicates

        while i < numRandLecturer:
            fakeName = fake.name()
            if fakeName in generated_names: 
                continue

            # Generate username
            nameSplit = fakeName.split()
            userName = "".join([j[0] for j in nameSplit]) + str(random.randint(1,99))

            lecturers_to_create.append({
                "name": fakeName,
                "email": f"{userName}@uow.edu.au",
                "password": "Valid123",
                "specialistIn": random.choice(['Computer Science', 'Marketing', 'Engineering'])
            })
            generated_names.add(fakeName)
            i += 1

        #Loop through list and Insert into DB
        for lec_data in lecturers_to_create:
            email = lec_data["email"]
            password = lec_data["password"]
            name = lec_data["name"]
            specialist = lec_data["specialistIn"]

            # Create from Supabase Auth
            user_uuid = createAccountgetuuid(email, password, True)

            # Handle case where user already exists in Auth but function returned None
            if not user_uuid:
                print(f"   - User {email} might exist, fetching ID from Supabase...")
                try:
                    users = spbase.auth.admin.list_users()
                    existing_user = next((u for u in users if u.email == email), None)
                    if existing_user:
                        user_uuid = existing_user.id
                except Exception as e:
                    print(f" Critical Auth Error for {email}: {e}")
                    continue 
            if not user_uuid:
                print(f"Could not resolve UUID for {email}. Skipping.")
                continue

            # Check if exists in Database (Prevent Duplicates)
            existing_profile = dbSessionLocalInstance.query(Lecturer).filter(Lecturer.lecturerID == user_uuid).first()

            if not existing_profile:
                try:

                    # Create DB Record
                    new_lecturer = Lecturer(
                        userID=uuid.UUID(str(user_uuid)),
                        profileType=LecturerProfile, 
                        name=name,
                        specialistIn=specialist,
                        email=email, 
                        creationDate=datetime.today(),
                        photo=defphotopath,
                        address=fake.address(),
                        campusID=random.choice(all_campi).campusID,
                        contactNumber=str(random.randint(81111111, 99999999)),
                        emergencyContactName=fake.name(),
                        emergencyContactRelationship="Parent",
                        emergencyContactNumber=str(random.randint(81111111, 99999999))    
                    )
                    dbSessionLocalInstance.add(new_lecturer)
                except Exception as e:
                    print(f" DB Error adding {name}: {e}")
            else:
                print(f" Lecturer profile already exists: {name}")

        # Commit all changes
        dbSessionLocalInstance.commit()
        return None

def modulesSeed(dbSessionLocalInstance: Session, spbase: Client):
    #No Primary Keys
    print(f"Seeding Modules: \n")
    modNames = ["Big Data Management", "Web Development", "Advanced Programming"]
    modCodes = ["CSIT100", "ISIT100", "CSIT420"]

    for i in range(len(modNames)):
        dbSessionLocalInstance.add(Module(moduleName =modNames[i], 
                                            moduleCode = modCodes[i]))
    return None

def lecModSeed(dbSessionLocalInstance: Session, spbase: Client): 
    #No Primary Keys
    print(f"Seeding LecMods: \n")
    lecturerobjs = dbSessionLocalInstance.query(Lecturer).all()
    moduleobjs = dbSessionLocalInstance.query(Module).all()

    # Use a set to track pairs (LecturerID, ModuleID) to prevent duplicates
    existing_pairs = set()


    # Ensure EVERY Lecturer teaches at least one module
    for lecturer in lecturerobjs:
        # Decide how many modules this lecturer teaches (e.g., 1 to 2)
        num_modules_to_teach = random.randint(1, min(2, len(moduleobjs)))
        
        # Pick random modules
        picked_modules = random.sample(moduleobjs, num_modules_to_teach)

        for module in picked_modules:
            # Create the relationship
            # We check existing_pairs just in case, though logically unique here
            if (lecturer.lecturerID, module.moduleID) not in existing_pairs:
                dbSessionLocalInstance.add(LecMod(lecturers=lecturer, modules=module))
                existing_pairs.add((lecturer.lecturerID, module.moduleID))

    #  Ensure EVERY Module has at least one Lecturer
    for module in moduleobjs:
        # Check if this module ID is already in our set of assigned pairs
        # pair[1] is the moduleID
        is_assigned = any(pair[1] == module.moduleID for pair in existing_pairs)

        if not is_assigned:
            # If module has no teacher, assign a random lecturer
            random_lecturer = random.choice(lecturerobjs)
            
            dbSessionLocalInstance.add(LecMod(lecturers=random_lecturer, modules=module))
            existing_pairs.add((random_lecturer.lecturerID, module.moduleID))
    
    dbSessionLocalInstance.commit()
    return None

def studentModulesSeed(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding studentModules: \n")
    studentobjs = dbSessionLocalInstance.query(Student).all()
    moduleobjs = dbSessionLocalInstance.query(Module).all()

    # Track existing pairs to avoid duplicate entries (StudentID, ModuleID)
    existing_enrollments = set()
    #Ensure EVERY Student has at least 1 module

    for student in studentobjs:
        num_courses = random.randint(1, min(3, len(moduleobjs)))
        
        # Pick random modules
        picked_modules = random.sample(moduleobjs, num_courses)

        for module in picked_modules:
            dbSessionLocalInstance.add(StudentModules(student=student, modules=module))
            existing_enrollments.add((student.studentID, module.moduleID))


    # Ensure EVERY Module has at least 1 Student
    for module in moduleobjs:
        # Check if this module ID is in our set
        is_populated = any(pair[1] == module.moduleID for pair in existing_enrollments)

        if not is_populated:
            # If module is empty, force-add a random student
            random_student = random.choice(studentobjs)
            
            # Check if pair exists (unlikely given logic, but safe)
            if (random_student.studentID, module.moduleID) not in existing_enrollments:
                dbSessionLocalInstance.add(StudentModules(student=random_student, modules=module))
                existing_enrollments.add((random_student.studentID, module.moduleID))
    
    dbSessionLocalInstance.commit()
    return None

def lessonsSeed(dbSessionLocalInstance: Session, spbase: Client): 
    #No Primary Keys
    tutorial_groups = dbSessionLocalInstance.query(TutorialsGroup).all()
    fake = Faker()
    print(f"Seeding Lessons: \n")
    lessontypes = ["Practical", "Lecture"]

    for group in tutorial_groups:
        for lessontype in lessontypes:
            for _ in range(2):
                start_dt = fake.date_time_this_year()
                #Assume every lesson is 3 hours
                duration = timedelta(hours=3)
                end_dt  = start_dt + duration

                dbSessionLocalInstance.add(Lesson(lessontype = lessontype,
                                                  lecMod = group.lecMod,
                                                  tutorialGroupID = group.tutorialGroupsID,
                                                  building = random.randint(1,5),
                                                  room = random.randint(100, 600),
                                                  startDateTime = start_dt,
                                                  endDateTime = end_dt))
    dbSessionLocalInstance.commit()
    return None

def entLeaveSeed(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding EntLeave (Camera Detections): \n")
    
    lessons = dbSessionLocalInstance.query(Lesson).all()
    
    #  Pre-fetch Valid Enrollments to avoid random data noise
    # Map: ModuleID -> Set of StudentIDs
    enrollment_map = defaultdict(set)
    enrollments = dbSessionLocalInstance.query(StudentModules).all()
    for enroll in enrollments:
        enrollment_map[enroll.modulesID].add(enroll.studentID)

    # Pre-fetch Lesson -> Module mapping
    # We need to know which module a lesson belongs to
    # Map: LessonID -> ModuleID
    lec_mods = dbSessionLocalInstance.query(LecMod).all()
    lesson_module_map = {}
    for lm in lec_mods:
        for lesson in lm.lessons: # Assuming relationship exists
            lesson_module_map[lesson.lessonID] = lm.moduleID

    detections = []

    for lesson in lessons:
        module_id = lesson_module_map.get(lesson.lessonID)
        if not module_id: continue

        valid_students = enrollment_map.get(module_id, set())

        for student_id in valid_students:
            # Simulate Attendance Logic
            if random.random() < 0.10:
                continue

            # Simulate Punctuality
            is_late = random.random() < 0.20
            
            start_offset = 0
            if is_late:
                start_offset = random.randint(16, 40)
            else:
                # Arrive 0-10 mins after start
                start_offset = random.randint(0, 10)

            # Generate Snapshots
            num_detections = random.randint(3, 8)
            
            current_time = lesson.startDateTime + timedelta(minutes=start_offset)
            
            for _ in range(num_detections):

                if current_time > lesson.endDateTime:
                    break

                detections.append(EntLeave(
                    lessonID=lesson.lessonID,
                    studentID=student_id,
                    detectionTime=current_time 
                ))


                current_time += timedelta(minutes=random.randint(15, 30))

    if detections:
        print(f"Adding {len(detections)} camera detections...")
        dbSessionLocalInstance.add_all(detections)
        dbSessionLocalInstance.commit()
    
    return None

def attdCheckSeed(dbSessionLocalInstance: Session, spbase: Client):
    print(f"Seeding attdCheck (Processing Summaries): \n")
    
    #Get Lesson Start Times for 'Late' calculation
    lessons = dbSessionLocalInstance.query(Lesson).all()
    lesson_time_map = {l.lessonID: l.startDateTime for l in lessons}

    # Aggregate Raw Detections
    results = (
        dbSessionLocalInstance.query(
            EntLeave.studentID,
            EntLeave.lessonID,
            func.min(EntLeave.detectionTime).label("first_seen"),
            func.max(EntLeave.detectionTime).label("last_seen"),
            func.count(EntLeave.entLeaveID).label("count")
        )
        .group_by(EntLeave.studentID, EntLeave.lessonID)
        .all()
    )

    new_checks = []

    for student_id, lesson_id, first_seen, last_seen, count in results:
        
        start_time = lesson_time_map.get(lesson_id)
        if not start_time: continue

        # Determine Status
        # Grace period of 15 minutes
        status = "Present"
        late_threshold = start_time + timedelta(minutes=15)
        
        if first_seen > late_threshold:
            status = "Late"

        # Create Record
        new_checks.append(AttdCheck(
            lessonID=lesson_id,
            studentID=student_id,
            status=status,
            firstDetection=first_seen, # New Column
            lastDetection=last_seen,   # New Column
            remarks=f"Camera Capture ({count} detections)"
        ))

    if new_checks:
        print(f"Adding {len(new_checks)} verified attendance summaries.")
        dbSessionLocalInstance.add_all(new_checks)
        dbSessionLocalInstance.commit()
    
    return None

def seedLazyStudent(db: Session, spbase: Client, defphotopath: str):
    print("\nSeeding Lazy Student")
    fake = Faker()
    
    email = "lazy@uow.edu.au"
    password = "Valid123"
    lazy_uuid = None

    try:
        auth_user = spbase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        lazy_uuid = auth_user.user.id
    except Exception:
        # User exists in Auth, fetch ID
        users = spbase.auth.admin.list_users()
        lazy_uuid = next((u.id for u in users if u.email == email), None)
        if lazy_uuid:
            # Force reset password to ensure we can log in
            spbase.auth.admin.update_user_by_id(lazy_uuid, {"password": password})

    if not lazy_uuid:
        return

    # Check Duplicate
    existing_student = db.query(Student).filter(Student.studentID == lazy_uuid).first()
    if existing_student:
        print("   - lazy student already exists in DB. Skipping creation.")
        return lazy_uuid

    #  Get Dependencies
    student_profile = db.query(UserProfile).filter_by(profileTypeName='Student').first()
    lecturer = db.query(Lecturer).first()
    random_course = db.query(Courses).first()
    random_campus = db.query(Campus).first()

    if not lecturer or not random_course:
        print("Error: Seed Lecturers, Courses, and Campuses first.")
        return

    # Create/Get the specific Test Module
    target_module = db.query(Module).filter_by(moduleCode="CSIT420").first()
    if not target_module:
        print("Error: Module CSIT420 not found. Seed modulesSeed first.")
        return
        
        # Link Lecturer to this new module
    lec_mod = db.query(LecMod).filter_by(moduleID=target_module.moduleID).first()

    
    test_group = db.query(TutorialsGroup).filter_by(lecModID=lec_mod.lecModID).first()
    if not test_group:
        test_group = TutorialsGroup(lecModID=lec_mod.lecModID)
        db.add(test_group)
        db.flush()
    # Upload the photo to supabase bucket

    # Create Student Profile
    lazy_student = Student(
        userID=uuid.UUID(str(lazy_uuid)),
        profileType=student_profile,
        name="Albert Zweistein",
        email=email,
        studentNum="000000",
        attendanceMinimum=80.0, 
        courseID=random_course.courseID,
        campusID=random_campus.campusID,
        photo=defphotopath,
        creationDate= datetime.today(),
        # New required fields
        address=fake.address(),
        contactNumber="0400000000",
        emergencyContactName=fake.name(),
        emergencyContactRelationship="Parent",
        emergencyContactNumber="0411111111"
    )
    db.add(lazy_student)
    #Student-Module Link
    enrollment = StudentModules(student=lazy_student, modules=target_module)
    db.add(enrollment)
    db.flush() 

    assignment = StudentTutorialGroup(
    studentModulesID=enrollment.studentModulesID,
    tutorialGroupID=test_group.tutorialGroupsID # Linking Albert to the group
    )
    db.add(assignment)
    # Fake Lessons
    past_lessons = []
    for i in range(1, 11):
        start = datetime.now() - timedelta(days=i)
        end = start + timedelta(hours=2)
        
        lesson = Lesson(
            lecMod=lec_mod,
            lessontype="Lecture",
            startDateTime=start,
            endDateTime=end,
            building="B1",
            room="101"
        )
        db.add(lesson)
        past_lessons.append(lesson)
    
    db.flush() 

    # Mark Attendance for ONLY 1 Lesson (10% Rate)
    attended_lesson = past_lessons[0]
    dt_in = attended_lesson.startDateTime + timedelta(minutes=5)
    
    db.add(EntLeave(lesson=attended_lesson, student=lazy_student, detectionTime=dt_in))
    db.add(AttdCheck(
        lesson=attended_lesson, student=lazy_student, status="Present",
        firstDetection=dt_in, lastDetection=attended_lesson.endDateTime,
        remarks="Camera Capture"
    ))

    db.commit()
    print(f"   + Albert Zweistein is now enrolled in {target_module.moduleName} (Group ID: {test_group.tutorialGroupsID})")
    return lazy_uuid

def tutorialGroupsSeed(dbSessionLocalInstance: Session):
    print(f"Seeding Tutorial Groups: \n")
    

    lec_mods = dbSessionLocalInstance.query(LecMod).all()
    
    if not lec_mods:
        print(" [!] No LecMods found. Seed lecModSeed first.")
        return

    for lm in lec_mods:

        for suffix in ["A", "B"]:
            new_group = TutorialsGroup(
                lecModID = lm.lecModID
            )
            dbSessionLocalInstance.add(new_group)
    
    dbSessionLocalInstance.commit()
    print(f"   + Successfully created {len(lec_mods) * 2} Tutorial Groups.")
    return None

def studentTutorialAssignmentSeed(dbSessionLocalInstance: Session):
    print(f"Assigning Students to Tutorial Groups: \n")
    
    enrollments = dbSessionLocalInstance.query(StudentModules).all()
    
    assignments_count = 0

    for enrollment in enrollments:
        available_groups = (
            dbSessionLocalInstance.query(TutorialsGroup)
            .join(LecMod)
            .filter(LecMod.moduleID == enrollment.modulesID)
            .all()
        )

        if not available_groups:
            continue

        selected_group = random.choice(available_groups)

        new_assignment = StudentTutorialGroup(
            studentModulesID = enrollment.studentModulesID,
            tutorialGroupID = selected_group.tutorialGroupsID
        )
        dbSessionLocalInstance.add(new_assignment)
        assignments_count += 1

    dbSessionLocalInstance.commit()
    return None
if __name__ == "__main__":  
    db_session: Session = SessionLocal()

    try:
        spbse: Client = create_client(os.getenv("SPBASE_URL"), os.getenv("SPBASE_SKEY"))
        faker = Faker()

        
        clear_db(db_session, spbse)
        shared_photo = upload_default_assets(spbse)
        uniCampusSeed(db_session, spbse)
        seedCoursesOSS(db_session, spbse)
        userProfileSeeder(db_session, spbse)
        modulesSeed(db_session, spbse)
        # Users
        lecturerSeed(db_session, spbse, shared_photo)
        adminSeed(db_session, spbse, shared_photo)
        platSeed(db_session,spbse, shared_photo)
        studentSeed(db_session, spbse, shared_photo)

        lecModSeed(db_session, spbse)
        tutorialGroupsSeed(db_session)
        studentModulesSeed(db_session, spbse)
        studentTutorialAssignmentSeed(db_session)
        lessonsSeed(db_session, spbse)
        entLeaveSeed(db_session, spbse)
        attdCheckSeed(db_session, spbse)

        print("\nSpecial Cases: Student that does not attend lessons\n")
        seedLazyStudent(db_session,spbse, shared_photo)

        # Initialize defaults
        print("Finished seeding the database")
    except Exception as e:
        print(f"Exception occurred while seeding database: {e}")
        print(traceback.format_exc())
    finally:
        db_session.close()