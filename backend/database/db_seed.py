import shutil
import os
import uuid
import random

from sqlalchemy import func, or_, text
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
        return storage_path
    except Exception as e:
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
    courseNames = ["Bsc in Technology","Bsc in Advanced Programming","Bsc in Big Data Application", "Bsc in Cybersecurity", "Bsc in Game Development", "Bachelor in Computer Science", "Bsc in Information Technology", "Bsc in Computer Science", "Bc in Science Computer","Bs in Computer Arts"]
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
            dbSessionLocalInstance.add(Courses(courseCode = randomCourse, campus = campus, courseName = courseNames[i]))
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

    universities = dbSessionLocalInstance.query(University).all()
    if not universities:
        print("No universities found. Please seed universities first.")
        return None

    pm_profile = dbSessionLocalInstance.query(UserProfile).filter_by(
        profileTypeName="PManager",
        campusID=None
    ).first()

    if not pm_profile:
        print("Creating Global UserProfile: PManager...")
        pm_profile = UserProfile(
            profileTypeName="PManager",
            campusID=None 
        )
        dbSessionLocalInstance.add(pm_profile)
        dbSessionLocalInstance.commit() 
        dbSessionLocalInstance.refresh(pm_profile)

    for u in universities:
        safe_name = u.universityName.replace(" ", "").lower()
        email = f"manager@{safe_name}.edu"
        password = "password123"
        name = f"Manager of {u.universityName}"

        existing_user = dbSessionLocalInstance.query(User).filter_by(email=email).first()
        if existing_user:
            print(f"  - Manager for {u.universityName} already exists ({email}). Skipping.")
            continue


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


    try:
        dbSessionLocalInstance.commit()
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

    sem_start = datetime(2026, 1, 5) # Monday, Jan 5
    sem_end = datetime(2026, 3, 30)   # End of March
    
    modules_to_create = [
        {"name": "Big Data Management", "code": "CSIT100"},
        {"name": "Web Development", "code": "ISIT100"},
        {"name": "Advanced Programming", "code": "CSIT420"}
    ]

    for mod in modules_to_create:
        dbSessionLocalInstance.add(Module(
            moduleName = mod["name"], 
            moduleCode = mod["code"],
            startDate = sem_start, # Added
            endDate = sem_end      # Added
        ))
    
    dbSessionLocalInstance.commit()
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

    #  Ensure Modules has at least one Lecturer
    for module in moduleobjs:
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

    existing_enrollments = set()

    for student in studentobjs:

        num_courses = random.randint(1, min(2, len(moduleobjs)))
        
        picked_modules = random.sample(moduleobjs, num_courses)

        for module in picked_modules:
            dbSessionLocalInstance.add(StudentModules(student=student, modules=module))
            existing_enrollments.add((student.studentID, module.moduleID))

    dbSessionLocalInstance.commit()
    return None

def lessonsSeed(dbSessionLocalInstance: Session, spbase: Client): 
    semester_start = datetime(2026, 1, 5)
    weeks_in_semester = 12

    rooms = [f"Room {i}" for i in range(101, 111)]
    days = [0, 1, 2, 3, 4] 
    hours = [8, 11, 14] 
    
    slot_pool = []
    for b in range(1, 6):
        for r in rooms:
            for d in days:
                for h in hours:
                    slot_pool.append({"b": str(b), "r": r, "d": d, "h": h})
    
    random.shuffle(slot_pool)

    module_lecture_times = {} 

    lec_mods = dbSessionLocalInstance.query(LecMod).all()
    processed_modules = set()
    
    for lm in lec_mods:
        if lm.moduleID in processed_modules: continue
        
        slot = slot_pool.pop() 
        module_lecture_times[lm.moduleID] = (slot['d'], slot['h']) # Store the time

        for week in range(weeks_in_semester):
            start_dt = (semester_start + timedelta(weeks=week, days=slot['d'])).replace(hour=slot['h'], minute=0)
            dbSessionLocalInstance.add(Lesson(
                lessontype="Lecture", lecModID=lm.lecModID, tutorialGroupID=None,
                building=slot['b'], room=slot['r'],
                startDateTime=start_dt, endDateTime=start_dt + timedelta(hours=3)
            ))
        processed_modules.add(lm.moduleID)

    tutorial_groups = dbSessionLocalInstance.query(TutorialsGroup).all()
    for group in tutorial_groups:
        lec_day, lec_hour = module_lecture_times.get(group.lecMod.moduleID, (None, None))

        slot = next(s for s in slot_pool if not (s['d'] == lec_day and s['h'] == lec_hour))
        slot_pool.remove(slot)
        
        for week in range(weeks_in_semester):
            start_dt = (semester_start + timedelta(weeks=week, days=slot['d'])).replace(hour=slot['h'], minute=0)
            dbSessionLocalInstance.add(Lesson(
                lessontype="Practical", lecModID=group.lecModID, tutorialGroupID=group.tutorialGroupsID,
                building=slot['b'], room=slot['r'],
                startDateTime=start_dt, endDateTime=start_dt + timedelta(hours=3)
            ))

    dbSessionLocalInstance.commit()

def entLeaveSeed(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding Detections \n")
    
    now = datetime.now()
    lessons = dbSessionLocalInstance.query(Lesson).filter(
        Lesson.startDateTime <= now
    ).all()
    
    detections = []

    for lesson in lessons:
        if lesson.tutorialGroupID is None:
            eligible_students = (
                dbSessionLocalInstance.query(StudentModules.studentID)
                .filter(StudentModules.modulesID == lesson.lecMod.moduleID)
                .all()
            )
        else:
            eligible_students = (
                dbSessionLocalInstance.query(StudentModules.studentID)
                .join(StudentTutorialGroup, 
                      StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
                .filter(StudentTutorialGroup.tutorialGroupID == lesson.tutorialGroupID)
                .all()
            )

        for (student_id,) in eligible_students:
            # Skip 10% for realistic absence
            if random.random() < 0.10: 
                continue 

            arrival_offset = random.randint(-5, 10)
            arrival_time = lesson.startDateTime + timedelta(minutes=arrival_offset)
            
            detections.append(EntLeave(
                lessonID=lesson.lessonID,
                studentID=student_id,
                detectionTime=arrival_time
            ))

    if detections:
        print(f"   + Marking {len(detections)} past logical attendance events...")
        dbSessionLocalInstance.bulk_save_objects(detections)
        dbSessionLocalInstance.commit()
    
    return None

def attdCheckSeed(dbSessionLocalInstance: Session, spbase: Client):
    print(f"Seeding attdCheck: \n")

    lesson_map = defaultdict(set)
    
    lectures = dbSessionLocalInstance.execute(text("""
        SELECT l."lessonID", sm."studentID"
        FROM lessons l
        JOIN lecmods lm ON l."lecModID" = lm."lecModID"
        JOIN studentmodules sm ON lm."moduleID" = sm."modulesID"
        WHERE l."tutorialGroupID" IS NULL
    """)).all()
    
    tutorials = dbSessionLocalInstance.execute(text("""
        SELECT l."lessonID", sm."studentID"
        FROM lessons l
        JOIN studenttutorialgroups stg ON l."tutorialGroupID" = stg."tutorialGroupID"
        JOIN studentmodules sm ON stg."studentModulesID" = sm."studentModulesID"
        WHERE l."tutorialGroupID" IS NOT NULL
    """)).all()

    for row in (lectures + tutorials):
        lesson_map[row[0]].add(row[1])

    lessons = dbSessionLocalInstance.query(Lesson.lessonID, Lesson.startDateTime).all()
    time_map = {l.lessonID: l.startDateTime for l in lessons}

    raw_detections = (
        dbSessionLocalInstance.query(
            EntLeave.studentID,
            EntLeave.lessonID,
            func.min(EntLeave.detectionTime).label("first_seen"),
            func.max(EntLeave.detectionTime).label("last_seen")
        )
        .group_by(EntLeave.studentID, EntLeave.lessonID)
        .all()
    )

    new_checks = []
    
    for student_id, lesson_id, first_seen, last_seen in raw_detections:
        if student_id in lesson_map.get(lesson_id, set()):
            start_time = time_map.get(lesson_id)
            
            status = "Present"
            if start_time and first_seen > start_time + timedelta(minutes=15):
                status = "Late"

            new_checks.append(AttdCheck(
                lessonID=lesson_id,
                studentID=student_id,
                status=status,
                firstDetection=first_seen,
                lastDetection=last_seen,
                remarks="Camera Capture"
            ))

    if new_checks:
        dbSessionLocalInstance.bulk_save_objects(new_checks)
        dbSessionLocalInstance.commit()
        print(f"   + Successfully processed {len(new_checks)} records.")
    
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
    target_module = db.query(Module).filter_by(moduleCode="CSIT420").first()
    lec_mod = db.query(LecMod).filter_by(moduleID=target_module.moduleID).first()
    albert_group = db.query(TutorialsGroup).filter_by(lecModID=lec_mod.lecModID).first()
    
    student_profile = db.query(UserProfile).filter_by(profileTypeName='Student').first()
    random_course = db.query(Courses).first()
    random_campus = db.query(Campus).first()

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
    db.flush() 
    #Student-Module Link
    enrollment = StudentModules(student=lazy_student, modules=target_module)
    db.add(enrollment)
    db.flush() 

    assignment = StudentTutorialGroup(
    studentModulesID=enrollment.studentModulesID,
    tutorialGroupID=albert_group.tutorialGroupsID
    )
    db.add(assignment)

    scheduled_lessons = (
    db.query(Lesson)
    .join(LecMod, Lesson.lecModID == LecMod.lecModID)
    .join(StudentModules, LecMod.moduleID == StudentModules.modulesID)
    .outerjoin(StudentTutorialGroup, StudentModules.studentModulesID == StudentTutorialGroup.studentModulesID)
    .filter(
        StudentModules.studentID == lazy_student.studentID,
        or_(
            Lesson.tutorialGroupID == None,
            Lesson.tutorialGroupID == StudentTutorialGroup.tutorialGroupID
        )
    )
    .all()
)

    attended_lessons = scheduled_lessons[:3] 
    
    for lesson in attended_lessons:
        check_in = lesson.startDateTime + timedelta(minutes=20)
        
        db.add(EntLeave(lessonID=lesson.lessonID, studentID=lazy_student.studentID, detectionTime=check_in))
        db.add(AttdCheck(
            lessonID=lesson.lessonID,
            studentID=lazy_student.studentID,
            status="Late",
            firstDetection=check_in,
            lastDetection=lesson.endDateTime,
            remarks="Late arrival"
        ))

    db.commit()
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