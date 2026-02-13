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
    print(f"Seeding Unis:")
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
    print(f"Seeding Courses:")
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
    print(f"Seeding User Profiles")
    
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

    try:
        dbSessionLocalInstance.commit()
    except Exception as e:
        dbSessionLocalInstance.rollback()
        print(f"An error occurred while seeding User Profiles: {e}")

    return None

def platSeed(dbSessionLocalInstance: Session, spbase: Client, defphotopath: str):
    print(f"Seeding Platform Managers:")
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
            photo=None,
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
    print(f"Seeding Students:")
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
                                        photo=None,
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
                                        photo=None,
                                        address= address ,
                                        campusID=random.choice(all_campus).campusID,
                                        emergencyContactName = fake.name(),
                                        emergencyContactRelationship = "Parent",
                                        emergencyContactNumber = random.randint(81111111, 99999999)
                                    ))

    dbSessionLocalInstance.commit()

    return None

def adminSeed(dbSessionLocalInstance: Session, spbase: Client, defphotopath: str): 
    print(f"Seeding Admins:")
    
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
                    photo=None,
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
    print(f"Seeding Lecturers:")

    # Setup Dependencies
    fake = Faker()
    LecturerProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Lecturer').first()
    all_campi = dbSessionLocalInstance.query(Campus).all()

    if not LecturerProfile or not all_campi:
        print("Error: Missing Lecturer Profile or Campuses. Seed those first.")
        return

    used_emails = set()

    special_lec_email = "lecturer@uow.edu.au"
    user_uuid = createAccountgetuuid(special_lec_email, "Valid123", True)
    
    if user_uuid:
        existing = dbSessionLocalInstance.get(Lecturer, uuid.UUID(str(user_uuid)))
        if not existing:
            dbSessionLocalInstance.add(Lecturer(
                userID=uuid.UUID(str(user_uuid)),
                profileType=LecturerProfile, 
                name="Agnes Lam",
                specialistIn="Computer Science",
                email=special_lec_email, 
                creationDate=datetime.today(),
                photo=None,
                address=fake.address(),
                campusID=all_campi[0].campusID,
                contactNumber="04" + str(random.randint(10000000, 99999999)),
                emergencyContactName=fake.name(),
                emergencyContactRelationship="Parent",
                emergencyContactNumber="04" + str(random.randint(10000000, 99999999))    
            ))
            used_emails.add(special_lec_email)

    num_lecturers_per_campus = 3 

    for campus in all_campi:
        
        for _ in range(num_lecturers_per_campus):
            fake_name = fake.name()
            email_prefix = "".join([j[0] for j in fake_name.split()]).lower() + str(random.randint(10, 99))
            email = f"{email_prefix}@{campus.campusName.replace(' ', '').lower()}.edu"
            
            if email in used_emails:
                continue

            user_uuid = createAccountgetuuid(email, "Valid123", True)

            if not user_uuid:
                try:
                    users = spbase.auth.admin.list_users()
                    existing_user = next((u for u in users if u.email == email), None)
                    if existing_user:
                        user_uuid = existing_user.id
                except:
                    continue

            if not user_uuid:
                continue

            existing_profile = dbSessionLocalInstance.get(Lecturer, uuid.UUID(str(user_uuid)))
            if not existing_profile:
                try:
                    dbSessionLocalInstance.add(Lecturer(
                        userID=uuid.UUID(str(user_uuid)),
                        profileType=LecturerProfile, 
                        name=fake_name,
                        specialistIn=random.choice(['Computer Science', 'Data Science', 'AI', 'Cybersecurity']),
                        email=email, 
                        creationDate=datetime.today(),
                        photo=None,
                        address=fake.address(),
                        campusID=campus.campusID,
                        contactNumber="04" + str(random.randint(10000000, 99999999)),
                        emergencyContactName=fake.name(),
                        emergencyContactRelationship="Spouse",
                        emergencyContactNumber="04" + str(random.randint(10000000, 99999999))    
                    ))
                    used_emails.add(email)
                except Exception as e:
                    print(f" DB Error adding {fake_name}: {e}")

    dbSessionLocalInstance.commit()
    print(f"Successfully seeded lecturers for all {len(all_campi)} campuses.")

def modulesSeed(dbSessionLocalInstance: Session, spbase: Client):
    campuses = dbSessionLocalInstance.query(Campus).all()
    sem_start = datetime(2026, 1, 5) # Monday, Jan 5
    sem_end = datetime(2026, 3, 30)   # End of March
    
    modules_to_create = [
        {"name": "Big Data Management", "code": "CSIT100"},
        {"name": "Web Development", "code": "ISIT100"},
        {"name": "Advanced Programming", "code": "CSIT420"}
    ]
    for campus in campuses:
        for mod in modules_to_create:
            dbSessionLocalInstance.add(Module(
                moduleName = mod["name"], 
                moduleCode = mod["code"],
                campusID = campus.campusID,
                startDate = sem_start, 
                endDate = sem_end      
            ))
    
    dbSessionLocalInstance.commit()
    return None

def lecModSeed(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding LecMods: ")
    campuses = dbSessionLocalInstance.query(Campus).all()
    for campus in campuses:

        campus_lecturers = dbSessionLocalInstance.query(Lecturer).filter_by(campusID=campus.campusID).all()
        campus_modules = dbSessionLocalInstance.query(Module).filter_by(campusID=campus.campusID).all()

        if not campus_lecturers or not campus_modules:
            continue

        for module in campus_modules:
            random_lec = random.choice(campus_lecturers)
            
            dbSessionLocalInstance.add(LecMod(
                lecturerID=random_lec.lecturerID,
                moduleID=module.moduleID
            ))

    
    dbSessionLocalInstance.commit()
    return None

def studentModulesSeed(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding studentModules:")
    studentobjs = dbSessionLocalInstance.query(Student).all()

    for student in studentobjs:
        campus_modules = (
            dbSessionLocalInstance.query(Module)
            .filter(Module.campusID == student.campusID)
            .all()
        )

        if not campus_modules:
            continue

        num_to_enroll = random.randint(1, min(2, len(campus_modules)))
        picked_modules = random.sample(campus_modules, num_to_enroll)

        for module in picked_modules:
            dbSessionLocalInstance.add(StudentModules(student=student, modules=module))
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
    print(f"Seeding Detections (EntLeave)")
    
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
        dbSessionLocalInstance.bulk_save_objects(detections)
        dbSessionLocalInstance.commit()
    
    return None

def attdCheckSeed(dbSessionLocalInstance: Session, spbase: Client):
    print(f"Seeding attdCheck:")

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
    
    return None

def seedLazyStudent(db: Session, spbase: Client, defphotopath: str):
    print("Seeding Lazy Student")
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
    random_course = db.query(Courses).first()
    target_campus = db.query(Campus).first()
    target_module = db.query(Module).filter_by(
        moduleCode="CSIT420", 
        campusID=target_campus.campusID
    ).first()
    lec_mod = db.query(LecMod).filter_by(moduleID=target_module.moduleID).first()
    albert_group = db.query(TutorialsGroup).filter_by(lecModID=lec_mod.lecModID).first()
    

    # Create Student Profile
    lazy_student = Student(
        userID=uuid.UUID(str(lazy_uuid)),
        profileType=student_profile,
        name="Albert Zweistein",
        email=email,
        studentNum="000000",
        attendanceMinimum=80.0, 
        courseID=random_course.courseID,
        campusID=target_campus.campusID,
        photo=None,
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
    print(f"Seeding Tutorial Groups:")
    

    lec_mods = dbSessionLocalInstance.query(LecMod).all()
    
    if not lec_mods:
        print(" No LecMods found. Seed lecModSeed first.")
        return
    for lm in lec_mods:
        
        for i in range(1, 4):
            new_group = TutorialsGroup(
                lecModID = lm.lecModID,
                groupName = f"Tutorial Group {i}"
            )
            dbSessionLocalInstance.add(new_group)
    dbSessionLocalInstance.commit()
    return None

def studentTutorialAssignmentSeed(dbSessionLocalInstance: Session):
    print(f"Assigning Students to Tutorial Groups:")
    enrollments = dbSessionLocalInstance.query(StudentModules).all()
    
    for enrollment in enrollments:
        student = enrollment.student
        
        available_groups = (
            dbSessionLocalInstance.query(TutorialsGroup)
            .join(LecMod)
            .join(Lecturer)
            .filter(
                LecMod.moduleID == enrollment.modulesID,
                Lecturer.campusID == student.campusID
            )
            .all()
        )

        if available_groups:
            selected_group = random.choice(available_groups)
            dbSessionLocalInstance.add(StudentTutorialGroup(
                studentModulesID = enrollment.studentModulesID,
                tutorialGroupID = selected_group.tutorialGroupsID
            ))

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

        print("Special Cases: Student that does not attend lessons\n")
        seedLazyStudent(db_session,spbse, shared_photo)

        # Initialize defaults
        print("Finished seeding the database")
    except Exception as e:
        print(f"Exception occurred while seeding database: {e}")
        print(traceback.format_exc())
    finally:
        db_session.close()