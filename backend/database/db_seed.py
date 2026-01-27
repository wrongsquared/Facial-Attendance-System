import shutil
import os
import uuid
import random


from faker import Faker
from sqlalchemy.orm import Session
from db_config import SessionLocal, DATABASE_URL
from db_clear import clear_db
from db import University, PlatformMgr, Campus, User, Courses, UserProfile, Admin, Lecturer, Student, EntLeave, AttdCheck, Module, Lesson, LecMod, StudentModules, Courses
from datetime import timedelta, datetime
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client
import traceback
load_dotenv()

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

        # Upload to Supabase (upsert=True overwrites if exists)
        # content-type is important for browser rendering!
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

    courseCodeHeader = ['ISIT', 'CSIT']
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
    print(f"Seeding User Profiles: \n")
    campuses = dbSessionLocalInstance.query(Campus).all()
    profileTypeList = ['Pmanager', 'Admin', 'Student', 'Lecturer']
    for campus in campuses:
        
        for role_name in profileTypeList:
            # Check if it already exists to prevent duplicates
            exists = dbSessionLocalInstance.query(UserProfile).filter_by(
                profileTypeName=role_name, 
                # campusID=campus.campusID
            ).first()
            
            if not exists:
                new_profile = UserProfile(
                    profileTypeName=role_name,
                    # campus=campus
                )
                dbSessionLocalInstance.add(new_profile)
    dbSessionLocalInstance.commit()
    return None

def platSeed(dbSessionLocalInstance: Session, spbase: Client):
    print(f"Seeding Platform Managers: \n")

    uni = dbSessionLocalInstance.query(University).all()
    fake = Faker()
    for u in uni:
        # grab the first campus found for a university.
        target_campus = dbSessionLocalInstance.query(Campus).filter_by(universityID=u.universityID).first()

        pm_profile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName="PManager").first()
        if not pm_profile:
            pm_profile = UserProfile(
                profileTypeName="PManager"
            )
            dbSessionLocalInstance.add(pm_profile)
            dbSessionLocalInstance.commit() 
        safe_name = u.universityName.replace(" ", "").lower()
        email = f"manager@{safe_name}.edu"
        password = "password123"
        name = f"Manager of {u.universityName}"

        if dbSessionLocalInstance.query(User).filter_by(email=email).first():
            print(f"  - Manager for {u.universityName} already exists.")
            continue
        try:
            # Assuming you have a helper or use the raw client
            auth_user = spbase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            user_uuid = uuid.UUID(auth_user.user.id)
        except Exception as e:
            print(f"  - Error creating Auth user for {email}: {e}")
            # Optional: Try to fetch existing UID if create failed
            continue
        address = fake.address()
        # Create the PManager
        all_unis = dbSessionLocalInstance.query(University).all()
        gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
        new_manager = PlatformMgr(
            userID=uuid.UUID(str(user_uuid)),
            profileTypeID=pm_profile.profileTypeID, 
            role = "Platform Manager",
            email=email,
            name=name,
            photo = gaiusgenericusPath,
            address = address,
            university=random.choice(all_unis)
        )
        
        dbSessionLocalInstance.add(new_manager)
    
    dbSessionLocalInstance.commit()
    return None

def studentSeed(dbSessionLocalInstance: Session, spbase: Client): 
    print(f"Seeding Students: \n")
    studentProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Student').first()
    specialNames = []
    #password is the same as the usernames
    userNames = []
    numRandStudent = 10 #Number of Random Students to Generate
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
    gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
    all_campus = dbSessionLocalInstance.query(Campus).all()

    dbSessionLocalInstance.add(Student(userID = uuid.UUID(str(user_uuid)),
                                       profileType = studentProfile,
                                       email = baseemail,
                                       name= "Allison Lang",
                                       studentNum = "190036",
                                       attendanceMinimum = 75.0,
                                       course = rCourse,
                                        photo=gaiusgenericusPath,
                                        address= address,
                                        campusID=random.choice(all_campus).campusID
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
        gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
        dbSessionLocalInstance.add(Student(
                                        userID = uuid.UUID(str(user_uuid)),
                                        profileType = studentProfile,
                                        email = email,
                                        name = name,
                                        studentNum = studNumGenstr,
                                        attendanceMinimum = 75.0,
                                        course = rCourse,
                                        photo=gaiusgenericusPath,
                                        address= address ,
                                        campusID=random.choice(all_campus).campusID
                                    ))

    dbSessionLocalInstance.commit()

    return None

def adminSeed(dbSessionLocalInstance: Session, spbase: Client): 
    #No Primary Keys
    print(f"Seeding Admins: \n")
    AdminProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Admin').first()
    fake = Faker()
    #Base Admin
    #email:Admin@uow.edu.au
    #Password: Valid123
    baseemail = "Admin@uow.edu.au"
    basepass = "Valid123"
    user_uuid = createAccountgetuuid(baseemail, basepass, True)
    address = fake.address()
    all_campus = dbSessionLocalInstance.query(Campus).all()
    gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
    dbSessionLocalInstance.add(Admin(userID = uuid.UUID(str(user_uuid)),
                                    profileType = AdminProfile, 
                                    name = "James Looker",
                                    role = "System Administrator",
                                    email = baseemail,
                                    photo = gaiusgenericusPath,
                                    address= address ,
                                    campusID=random.choice(all_campus).campusID
                                    ))


    userNames = []
    specialNames = []
    numRandAdmins = 2 #Number of Admins to Generate
    fake = Faker()
    i = 0
    while i < numRandAdmins:
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

    all_campus = dbSessionLocalInstance.query(Campus).all()
    while len(specialNames) > 0:
        name = specialNames.pop()
        username = userNames.pop()
        email = username + "@uow.edu.au"
        # For simplicity's sake username is the password.
        user_uuid = createAccountgetuuid(email, "Valid123", True)
        address = fake.address()
        gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
        # Ghost Users that can not be logged in to
        dbSessionLocalInstance.add(Admin(userID = uuid.UUID(str(user_uuid)),
                                        profileType = AdminProfile,
                                        email = email,
                                        role = "System Administrator",
                                        name = name, 
                                        photo = gaiusgenericusPath,
                                        address= address,
                                        campusID=random.choice(all_campus).campusID
                                        ))

    dbSessionLocalInstance.commit()

    return None

def lecturerSeed(dbSessionLocalInstance: Session, spbase: Client): 
    #No Primary Keys
    print(f"Seeding Lecturers: \n")
    LecturerProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Lecturer').first()
    #Base Lecturer
    #lecturer@uow.edu.au
    #Valid123
    baseemail = "lecturer@uow.edu.au"
    basepass = "Valid123"

    fake = Faker()
    user_uuid = createAccountgetuuid(baseemail, basepass, True)
    address = fake.address()
    all_campi = dbSessionLocalInstance.query(Campus).all()
    gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
    dbSessionLocalInstance.add(Lecturer(userID = uuid.UUID(str(user_uuid)),
                                        profileType = LecturerProfile, 
                                        name = "Agnes Lam",
                                        specialistIn = "Computer Science",
                                        email = baseemail, 
                                        photo = gaiusgenericusPath,
                                        address = address,
                                        campusID=random.choice(all_campi).campusID
                                        ))
    
    userNames = []
    specialNames = []
    numRandLecturer = 3 #number of random Lecturers to Generate
    i = 0
    while i < numRandLecturer:
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
    # Ghost Users that can not be logged in to
        while len(specialNames) > 0:
            name = specialNames.pop()
            username = userNames.pop()
            email = username + "@uow.edu.au"
            spec = random.choice(['Computer Science', 'Business'])
            #For simplicity, Username is the password!
            user_uuid = createAccountgetuuid(email, "Valid123", True)
            address = fake.address()
            gaiusgenericusPath = upload_photo(user_uuid, "./genericimage/gaiusgenericus.png",spbase)
            dbSessionLocalInstance.add(Lecturer(userID = uuid.UUID(str(user_uuid)),
                                                profileType = LecturerProfile, 
                                                name = name,
                                                specialistIn = spec,
                                                email = email,
                                                photo = gaiusgenericusPath,
                                                address = address,
                                                campusID=random.choice(all_campi).campusID
                                                ))
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
    lecModobjs = dbSessionLocalInstance.query(LecMod).all()
    fake = Faker()
    print(f"Seeding Lessons: \n")
    lessontypes = ["Practical", "Lecture"]

    for lecmod in lecModobjs:
        for lessontype in lessontypes:
            for _ in range(5):
                start_dt = fake.date_time_this_year()
                #Assume every lesson is 3 hours
                duration = timedelta(hours=3)
                end_dt  = start_dt + duration
                building = random.randint(1,5)
                room = random.randint(100, 600)

                dbSessionLocalInstance.add(Lesson(lessontype = lessontype,
                                                  lecMod = lecmod,
                                                  building = building,
                                                  room = room,
                                                  startDateTime = start_dt,
                                                  endDateTime = end_dt))
    dbSessionLocalInstance.commit()
    return None

def entLeaveSeed(dbSessionLocalInstance: Session, spbase: Client): 
    #No Primary Keys
    print(f"Seeding EntLeave: \n")
    lessonobjs = dbSessionLocalInstance.query(Lesson).all()
    studentobjs = dbSessionLocalInstance.query(Student).all()


    for lesson in lessonobjs:
        for student in studentobjs:
            #lesson, student, enter, leave
            timerandomness = random.randint(0,30) # minutes
            duration = timedelta(minutes = timerandomness)
            ud = ['up', 'down']
            upordown = random.choice(ud)
            if upordown == 'up':
                entDateTime = lesson.startDateTime + duration
            else:
                entDateTime = lesson.startDateTime - duration
            timerandomness = random.randint(0,30) # minutes
            duration = timedelta(minutes = timerandomness)
            upordown = random.choice(ud)
            LeaveDateTime = lesson.endDateTime - duration


            dbSessionLocalInstance.add(EntLeave(lesson = lesson,
                                                student = student,
                                                enter = entDateTime,
                                                leave = LeaveDateTime
                                                ))
    dbSessionLocalInstance.commit()
    return None

def attdCheckSeed(dbSessionLocalInstance: Session, spbase: Client):
    print(f"Seeding attdCheck: \n")
    
    lessonobjs = dbSessionLocalInstance.query(Lesson, LecMod.moduleID).\
        join(LecMod, Lesson.lecModID == LecMod.lecModID).all()
        
    lesson_durations = {}
    lesson_module_map = {} # map: LessonID -> ModuleID
    
    for lesson, module_id in lessonobjs:
        duration = lesson.endDateTime - lesson.startDateTime
        lesson_durations[lesson.lessonID] = duration
        lesson_module_map[lesson.lessonID] = module_id

    # Get all Valid Enrollments (Student -> Module)
    # Format: Set of (studentID, moduleID) tuples
    valid_enrollments = set()
    enrollment_objs = dbSessionLocalInstance.query(StudentModules).all()
    for enroll in enrollment_objs:
        valid_enrollments.add((enroll.studentID, enroll.modulesID))

    # Calculate time spent based on Ent/Leave logs
    EntLeaveobjs = dbSessionLocalInstance.query(EntLeave).all()
    attendance_map = defaultdict(lambda: timedelta(0))
    
    for entL in EntLeaveobjs:
        key = (entL.studentID, entL.lessonID)
        duration = entL.leave - entL.enter
        attendance_map[key] += duration

    # Generate Checks
    new_checks = []
    
    # Iterating through (Student, Lesson) pairs
    for (student_id, lesson_id), total_time in attendance_map.items():
        
        lesson_length = lesson_durations.get(lesson_id)
        
        if not lesson_length:
            continue

        # NEW: Check if Student is actually enrolled in this lesson's module, if not skip
        module_id = lesson_module_map.get(lesson_id)
        if (student_id, module_id) not in valid_enrollments:
            continue

        # Calculate Ratio
        ratio = total_time / lesson_length
        if ratio > 0.5:
            new_checks.append(AttdCheck(lessonID=lesson_id, studentID=student_id, remarks = "Camera Capture")) 

    # Commit
    if new_checks:
        print(f"Adding {len(new_checks)} verified attendance checks.")
        dbSessionLocalInstance.add_all(new_checks)
        dbSessionLocalInstance.commit()
    
    return None
def seedLazyStudent(db:Session, spbase:Client):
    email = "lazy@uow.edu.au"
    password = "Valid123"
    
    # Try to get existing user or create new
    try:
        auth_user = spbase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        lazy_uuid = auth_user.user.id
    except Exception:
        # If already exists, fetch ID (simplified logic)
        users = spbase.auth.admin.list_users()
        lazy_uuid = next((u.id for u in users if u.email == email), None)
        if lazy_uuid:
            spbase.auth.admin.update_user_by_id(
                lazy_uuid, 
                {"password": password} # Ensure it is 'Valid123'
            )
    student_profile = db.query(UserProfile).filter_by(profileTypeName='Student').first()
    # We need a Lecturer to assign to the module
    lecturer = db.query(Lecturer).first() 
    
    # Create a Specific Module for this test
    test_module = Module(
        moduleCode="TEST101",
        moduleName="Skipping Class 101"
    )
    db.add(test_module)
    db.flush() # Flush to get moduleID

    # Link Lecturer to Module (LecMod)
    lec_mod = LecMod(lecturers=lecturer, modules=test_module)
    db.add(lec_mod)
    db.flush() # Flush to get lecModID
    # assign to a degree (e.g. Computer Science) and a location
    random_course = db.query(Courses).first()
    random_campus = db.query(Campus).first()
    gaiusgenericusPath = upload_photo(lazy_uuid, "./genericimage/gaiusgenericus.png",spbase)
    # Create the Student Profile
    lazy_student = Student(
        userID=uuid.UUID(lazy_uuid),
        profileType=student_profile,
        name="Lazy Larry",
        email=email,
        studentNum="000000",
        attendanceMinimum=80.0, # High standard
        # Link to a generic course/campus if required by your schema
        # courseID=..., campusID=... 
        courseID=random_course.courseID,
        campusID=random_campus.campusID,
        photo=gaiusgenericusPath
    )
    db.add(lazy_student)
    
    # Enroll Student in the Module
    enrollment = StudentModules(student=lazy_student, modules=test_module)
    db.add(enrollment)

    # We create lessons that happened 1 to 10 days ago
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
    
    db.flush() # Get Lesson IDs

    # Mark Attendance for 1 Lesson (10% Attendance)
    # We add an attendance check for the first lesson only
    attendance = AttdCheck(
        lesson=past_lessons[0],
        student=lazy_student,
        remarks="Present"
    )
    db.add(attendance)

    db.commit()
    
    return lazy_uuid
if __name__ == "__main__":  
    db_session: Session = SessionLocal()

    try:
        spbse: Client = create_client(os.getenv("SPBASE_URL"), os.getenv("SPBASE_SKEY"))
        faker = Faker()
        clear_db(db_session, spbse)
        uniCampusSeed(db_session, spbse)
        seedCoursesOSS(db_session, spbse)
        userProfileSeeder(db_session, spbse)
        modulesSeed(db_session, spbse)
        lecturerSeed(db_session, spbse)
        adminSeed(db_session, spbse)
        platSeed(db_session,spbse)
        studentSeed(db_session, spbse)
        lecModSeed(db_session, spbse)
        studentModulesSeed(db_session, spbse)
        lessonsSeed(db_session, spbse)
        entLeaveSeed(db_session, spbse)
        attdCheckSeed(db_session, spbse)
        print("\nPrinting Special User: Student that does not attend lessons\n")
        seedLazyStudent(db_session,spbse)

        # Initialize defaults
        print("Finished seeding the database")
    except Exception as e:
        print(f"Exception occurred while seeding database: {e}")
        print(traceback.format_exc())
    finally:
        db_session.close()