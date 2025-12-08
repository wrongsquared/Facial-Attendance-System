from faker import Faker
from sqlalchemy.orm import Session
from db_config import SessionLocal, DATABASE_URL
from db_clear import clear_db
from db import Courses, UserProfile, Admin, Lecturer, Student, EntLeave, AttdCheck, Module, Lesson, LecMod, StudentModules, Courses
import random
from datetime import timedelta
from collections import defaultdict
import shutil
import os

def seedCoursesOSS(dbSessionLocalInstance: Session): #done
    #No Primary Keys
    print(f"Seeding Courses: \n")
    courseCodeHeader = ['ISIT', 'CSIT']
    i= 0
    loc = []
    while i != 10:
        head = random.choice(courseCodeHeader)
        tail = random.randint(1,999)
        tail = str(tail)
        if len(tail) <3:
            ohs = 3 - len(tail)
            ohs = "0" * ohs
            tail = tail+ohs
        # Generate a Random List of Courses.
        randomCourse = head + tail
        if randomCourse in loc:
            continue
        else:
            dbSessionLocalInstance.add(Courses(courseCode = randomCourse))
            loc.append(randomCourse)
            i+=1

    dbSessionLocalInstance.commit()
    return None
def userProfileSeeder(dbSessionLocalInstance: Session): #done
    #No Primary Keys
    print(f"Seeding User Profiles: \n")
    #User Profile Types - Are Fixed
    profileTypeList = ['Admin', 'Student', 'Lecturer']
    for i in profileTypeList:
        dbSessionLocalInstance.add(UserProfile(profileTypeName = i))
    dbSessionLocalInstance.commit()
    return None
def studentSeed(dbSessionLocalInstance: Session): #done
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
    dbSessionLocalInstance.add(Student(profileType = studentProfile,
                                       email = "al123@outlook.com",
                                       name="Allison Lang",
                                       password = 'al123',
                                       attendanceMinimum = 75.0,
                                       course = rCourse,
                                        photo = None))
    while len(specialNames) > 0:
        name = specialNames.pop()
        username = userNames.pop()
        rCourse = random.choice(courseobjs)
        dbSessionLocalInstance.add(Student(profileType = studentProfile,
                                           email = username + "@outlook.com",
                                           name = name,
                                           password = username,
                                           attendanceMinimum = 75.0,
                                           course = rCourse,
                                        photo = None))
                                        #EntLeave
                                        #StudentModules
    dbSessionLocalInstance.commit()

    return None
def adminSeed(dbSessionLocalInstance: Session): # done
    #No Primary Keys
    print(f"Seeding Admins: \n")
    AdminProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Admin').first()

    #Base Admin
    #Username: ab01
    #Password: 123
    dbSessionLocalInstance.add(Admin(profileType = AdminProfile, 
                                     name = "James Looker",
                                     email = "JL123@outlook.com",
                                     password = '123',
                                        photo = None))


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

    while len(specialNames) > 0:
        name = specialNames.pop()
        username = userNames.pop()
        dbSessionLocalInstance.add(Admin(profileType = AdminProfile,
                                         email = username + "@outlook.com",
                                         name = name, 
                                         password = username,
                                        photo = None))

    dbSessionLocalInstance.commit()

    return None
def lecturerSeed(dbSessionLocalInstance: Session): # done
    #No Primary Keys
    print(f"Seeding Lecturers: \n")
    LecturerProfile = dbSessionLocalInstance.query(UserProfile).filter_by(profileTypeName='Lecturer').first()
    #Base Lecturer
    #Username: al01
    #Password: 123
    dbSessionLocalInstance.add(Lecturer(profileType = LecturerProfile, 
                                        name = "Agnes Lam", 
                                        email = "al01@outlook.com", 
                                        password = '123',
                                        photo = None))
    
    userNames = []
    specialNames = []
    fake = Faker()
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
    i = 0
    while len(specialNames) > 0:
        name = specialNames.pop()
        username = userNames.pop()
        dbSessionLocalInstance.add(Lecturer(profileType = LecturerProfile, 
                                            name = name, 
                                            email = username + "@outlook.com",
                                            password = username,
                                            photo = None))
    dbSessionLocalInstance.commit()

    return None
def modulesSeed(dbSessionLocalInstance: Session): # done
    #No Primary Keys
    print(f"Seeding Modules: \n")
    modNames = ["Big Data Mismanagement", "Web Development", "Advanced Programming"]
    modCodes = ["CSIT100", "ISIT100", "CSIT420"]

    for i in range(len(modNames)):
        dbSessionLocalInstance.add(Module(moduleName =modNames[i], 
                                            moduleCode = modCodes[i]))
    return None
def lecModSeed(dbSessionLocalInstance: Session): #done
    #No Primary Keys
    print(f"Seeding LecMods: \n")
    lecturerobjs = dbSessionLocalInstance.query(Lecturer).all()
    moduleobjs = dbSessionLocalInstance.query(Module).all()

    for module in moduleobjs:
        numLectsGen = random.randint(1, len(lecturerobjs))
        lecturerssample = random.sample(lecturerobjs, numLectsGen)
        for lecturer in lecturerssample:
            dbSessionLocalInstance.add(LecMod(lecturers = lecturer, modules = module))
    
    dbSessionLocalInstance.commit()
    return None
def studentModulesSeed(dbSessionLocalInstance: Session): #done
    #No Primary Keys
    print(f"Seeding studentModules: \n")
    studentobjs = dbSessionLocalInstance.query(Student).all()
    moduleobjs = dbSessionLocalInstance.query(Module).all()

    for module in moduleobjs:
        numStudentsGen = random.randint(1, len(studentobjs))
        studentssample = random.sample(studentobjs, numStudentsGen)
        for student in studentssample:
            dbSessionLocalInstance.add(StudentModules(student = student, modules = module))
    
    dbSessionLocalInstance.commit()
    return None
def lessonsSeed(dbSessionLocalInstance: Session): #done
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

                dbSessionLocalInstance.add(Lesson(lessontype = lessontype,
                                                  lecMod = lecmod, 
                                                  startDateTime = start_dt,
                                                  endDateTime = end_dt))
    dbSessionLocalInstance.commit()
    return None
def entLeaveSeed(dbSessionLocalInstance: Session): #done
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
def attdCheckSeed(dbSessionLocalInstance: Session):
    #No Primary Keys
    print(f"Seeding attdCheck: \n")
    lessonobjs = dbSessionLocalInstance.query(Lesson).all()
    EntLeaveobjs = dbSessionLocalInstance.query(EntLeave).all()
    lesson_durations = {}
    for lesson in lessonobjs:
        lesson_durations[lesson.lessonID] = lesson.endDateTime - lesson.startDateTime
    attendance_map = defaultdict(lambda: timedelta(0))
    for entL in EntLeaveobjs:
        key = (entL.studentID, entL.lessonID)
        duration = entL.leave - entL.enter
        attendance_map[key] += duration

    new_checks = []
    for (student_id, lesson_id), total_time in attendance_map.items():
        lesson_length = lesson_durations.get(lesson.lessonID)

        if lesson_length:
            ratio = total_time/ lesson_length

        if ratio > 0.5:
            new_checks.append(AttdCheck(lessonID=lesson_id, studentID=student_id)) 
    if new_checks:
        dbSessionLocalInstance.add_all(new_checks)
        dbSessionLocalInstance.commit()
    
    return None

if __name__ == "__main__":
    db_session: Session = SessionLocal()

    try:
        faker = Faker()
        clear_db(db_session)
        seedCoursesOSS(db_session)
        userProfileSeeder(db_session)
        modulesSeed(db_session)
        lecturerSeed(db_session)
        adminSeed(db_session)
        lecModSeed(db_session)
        studentSeed(db_session)
        studentModulesSeed(db_session)
        lessonsSeed(db_session)
        entLeaveSeed(db_session)
        attdCheckSeed(db_session)

        # Initialize defaults
        print("Finished seeding the database defaults!")
    except Exception as e:
        print(f"Exception occurred while seeding database: {e}")
    finally:
        db_session.close()