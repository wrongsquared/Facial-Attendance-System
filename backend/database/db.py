from __future__ import annotations # Must always be at the top.
import uuid
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from enum import Enum
from sqlalchemy.dialects.postgresql import UUID 
from sqlalchemy import (
    Enum as SQLAlchemyEnum,
    ForeignKey,
    DateTime,
    Boolean,
    String,
    Text,
    func,
    text,
)
import datetime
import enum

from pydantic import BaseModel, EmailStr
from typing import List



class Base(DeclarativeBase):
    pass

#Adds a University
class University(Base):
    __tablename__ = "university"
    universityID: Mapped[int] = mapped_column(primary_key = True)
    universityName: Mapped[str]
    universityAddress: Mapped[str] #University's main address

    # Add a subscription date field
    subscriptionDate: Mapped[datetime.datetime] = mapped_column( 
        server_default=func.now() # Automatically set the date on creation
    )

    # --- ADD THIS NEW STATUS FIELD ---
    isActive: Mapped[bool] = mapped_column(server_default=text("true")) # Active (true) or Inactive (false )

    #Has Campuses
    campus: Mapped[list["Campus"]] = relationship(back_populates="university")
    platform_managers: Mapped[list["PlatformMgr"]] = relationship(back_populates="university")

#Adds a Campus
class Campus(Base):
    __tablename__="campus"
    campusID: Mapped[int] = mapped_column(primary_key= True)
    campusName : Mapped[str]
    campusAddress: Mapped[str]
    # Belongs to a University
    universityID: Mapped[int] = mapped_column(ForeignKey("university.universityID"))
    university: Mapped[University] = relationship(back_populates="campus")
    # Has User Profiles
    # profiles: Mapped[list["UserProfile"]] = relationship(back_populates="campus")
    student_profiles: Mapped[list["Student"]] = relationship(back_populates="campus")
    lecturer_profiles: Mapped[list["Lecturer"]] = relationship(back_populates="campus")
    admin_profiles: Mapped[list["Admin"]] = relationship(back_populates="campus")
    # Has Different Courses
    courses: Mapped[list["Courses"]] = relationship(back_populates="campus")
    created_at = mapped_column(DateTime, default=datetime.datetime)


class UserProfile(Base): #User Profiles, Student, Lecturer, Admins
    __tablename__ = "userprofiles"
    profileTypeID: Mapped[int] = mapped_column(primary_key=True)
    profileTypeName: Mapped[str] = mapped_column(String(500))
    users: Mapped[list["User"]] = relationship(back_populates="profileType")
    # Belongs to a Campus


class User(Base): #User

    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    __mapper_args__ = {"polymorphic_identity": "user", "polymorphic_on": "type"} 
    type: Mapped[str]

    userID: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)

    profileTypeID: Mapped[int] = mapped_column(ForeignKey("userprofiles.profileTypeID"))
    profileType: Mapped[UserProfile] = relationship(back_populates="users")
    creationDate: Mapped[datetime.datetime|None]

    #Basic Details
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(40))
    contactNumber: Mapped[str | None] = mapped_column("phone", String(15), nullable=True) 
    address: Mapped[str | None] = mapped_column("fulladdress", String(100), nullable=True)
    
    #Emergency Contact Details
    emergencyContactName: Mapped[str | None] = mapped_column("eName", String(100), nullable=True)
    emergencyContactRelationship: Mapped[str | None] = mapped_column("eRole", String(50), nullable=True)
    emergencyContactNumber: Mapped[str | None] = mapped_column("ePhone", String(20), nullable=True)

    # Password is not required as it is stored as hash in the hidden supabase password table
    photo: Mapped[str | None] #Allows for None, as we figure out how we want to store the photo.
    active: Mapped[bool| None] = mapped_column(Boolean, default=True)

#Add a Platform Manager
class PlatformMgr(User): #Admin, Child of User
    __tablename__ = "pmanager"
    __mapper_args__ = {"polymorphic_identity": "pmanager"}
    
    pmanagerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)
    role: Mapped[str]

    universityID: Mapped[int] = mapped_column(ForeignKey("university.universityID"))
    university: Mapped[University] = relationship(back_populates="platform_managers")

class Admin(User): #Admin, Child of User
    __tablename__ = "admins"
    __mapper_args__ = {"polymorphic_identity": "admin"}
    
    adminID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)
    role: Mapped[str]

    campusID: Mapped[int] = mapped_column(ForeignKey("campus.campusID"))
    campus:  Mapped[Campus] = relationship(back_populates="admin_profiles")

class Lecturer(User): #Lecturer, Child of User
    __tablename__ = "lecturers"
    __mapper_args__ = {"polymorphic_identity": "lecturer"}
    lecturerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)
    specialistIn: Mapped[str]
    lecMod: Mapped[list[LecMod]] = relationship(back_populates="lecturers")
    
    campusID: Mapped[int] = mapped_column(ForeignKey("campus.campusID"))
    campus:  Mapped[Campus] = relationship(back_populates="lecturer_profiles")

class Student(User): #Student, child of User
    __tablename__ = "students"
    __mapper_args__ = {"polymorphic_identity": "student"}
    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"),  primary_key = True)
    studentNum: Mapped[str] = mapped_column(String(6))

    courseID: Mapped[int] = mapped_column(ForeignKey("courses.courseID"))
    course: Mapped[Courses] = relationship(back_populates="students")

    EntLeaves: Mapped[list[EntLeave]] = relationship(back_populates="student")

    attendanceMinimum: Mapped[float]

    attdcheck: Mapped[list[AttdCheck]] = relationship(back_populates="student")

    studentmodules: Mapped[list[StudentModules]] = relationship(back_populates="student")

    angles: Mapped[list[studentAngles]] = relationship(back_populates="student")

    campusID: Mapped[int] = mapped_column(ForeignKey("campus.campusID"))
    campus:  Mapped[Campus] = relationship(back_populates="student_profiles")

class EntLeave(Base): # Camera marks time student is detected coming in, time student is detected leaving.
    __tablename__ = "entleave"
    entLeaveID: Mapped[int]= mapped_column(primary_key=True)
    lessonID: Mapped[int] = mapped_column(ForeignKey("lessons.lessonID"))
    lesson: Mapped[Lesson] = relationship(back_populates="entLeaves")

    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.studentID"))
    student: Mapped[Student] = relationship(back_populates="EntLeaves")

    enter: Mapped[datetime.datetime]
    leave: Mapped[datetime.datetime | None]

class AttdCheck(Base): # Backend checks an AttdCheck variable based on an EntLeave variable, to mark student presence
    __tablename__ = "attdcheck"
    AttdCheckID: Mapped[int]= mapped_column(primary_key=True)
    lessonID: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.lessonID"))
    lesson: Mapped[Lesson] = relationship(back_populates="attdcheck")
    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.studentID"))
    student: Mapped[Student] = relationship(back_populates="attdcheck")
    remarks: Mapped[str|None]

class Module(Base): #Modules
    __tablename__ = "modules"
    moduleID: Mapped[int] = mapped_column(primary_key=True)
    moduleName: Mapped[str] = mapped_column(String(25))
    moduleCode: Mapped[str] = mapped_column(String(8))
    lecMod: Mapped[list[LecMod]] = relationship(back_populates="modules")
    studentModules: Mapped[list[StudentModules]] = relationship(back_populates="modules")
    startDate: Mapped[datetime.datetime|None]
    endDate: Mapped[datetime.datetime|None]

class Lesson(Base): # Lessons by Lecturers, belongs to Modules
    __tablename__ = "lessons"
    lessonID: Mapped[int] = mapped_column(primary_key=True)

    lecModID: Mapped[int] = mapped_column(ForeignKey("lecmods.lecModID"))
    lecMod: Mapped[LecMod] = relationship(back_populates="lessons")

    attdcheck: Mapped[list[AttdCheck]] = relationship(back_populates="lesson")

    entLeaves: Mapped[list[EntLeave]] = relationship(back_populates="lesson")

    building: Mapped[str]= mapped_column(String(4))

    room: Mapped[str]= mapped_column(String(4))

    lessontype: Mapped[str] = mapped_column(String(10))
    startDateTime: Mapped[datetime.datetime]
    endDateTime: Mapped[datetime.datetime]

    building: Mapped[str | None] = mapped_column(String(50)) 
    room: Mapped[str | None] = mapped_column(String(50)) 

class LecMod(Base): #Lecture-Modules Connection
    __tablename__ = "lecmods"
    lecModID: Mapped[int] = mapped_column(primary_key= True)

    lecturerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("lecturers.lecturerID"))
    lecturers: Mapped[Lecturer] = relationship(back_populates="lecMod")

    lessons: Mapped[list[Lesson]] = relationship(back_populates="lecMod")

    moduleID: Mapped[int] = mapped_column(ForeignKey("modules.moduleID"))
    modules: Mapped[Module] = relationship(back_populates="lecMod")

class StudentModules(Base): #Student Modules
    __tablename__ = "studentmodules"
    studentModulesID: Mapped[int] = mapped_column(primary_key= True)

    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.studentID"))
    student: Mapped[Student] = relationship(back_populates="studentmodules")

    modulesID: Mapped[int] = mapped_column(ForeignKey("modules.moduleID"))
    modules: Mapped[Module] = relationship(back_populates="studentModules")

class Courses(Base): #Student Courses
    __tablename__ = "courses"
    courseID: Mapped[int] = mapped_column(primary_key= True)
    courseCode: Mapped[str] = mapped_column(String(10))

    students: Mapped[list[Student]] = relationship(back_populates="course")
    #Belongs to a Campus
    campusID: Mapped[int] = mapped_column(ForeignKey("campus.campusID"))
    campus:  Mapped[Campus] = relationship(back_populates="courses")

class studentAngles(Base): #Student-Angles for AI Training?
    __tablename__ = "studentangles"

    studentID: Mapped[UUID] = mapped_column(ForeignKey("students.studentID"), primary_key= True)
    
    photoAngle: Mapped[str] = mapped_column(String, primary_key=True)
    student: Mapped[Student] = relationship(back_populates="angles")

class GeneratedReport(Base):
    __tablename__ = "generated_reports"
    
    reportID: Mapped[int] = mapped_column(primary_key=True)
    
    # Link to the Lecturer (Foreign Key)
    lecturerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID")) 
    # Note: Make sure this points to your 'users' table or 'lecturers' table depending on your setup.
    # If your Lecturer ID is a UserID, point to "users.userID".
    
    # Report Details
    title: Mapped[str] = mapped_column(String(100))      # e.g. "CSCI314 - Daily Report"
    moduleCode: Mapped[str] = mapped_column(String(20))
    reportType: Mapped[str] = mapped_column(String(50))  # "Daily" or "Monthly"
    filterStatus: Mapped[str] = mapped_column(String(50)) # "All", "Present"
    
    # Metadata
    generatedAt: Mapped[datetime.datetime] = mapped_column(server_default=func.now())

    # File Location (Where we saved the Excel file)
    fileName: Mapped[str] = mapped_column(String(255))
    filePath: Mapped[str] = mapped_column(String(500))
    
class InstitutionRegistration(BaseModel):
    # institutionName: str
    # institutionType: str
    # address: str
    universityName: str
    email: EmailStr
    phoneNumber: str
    password: str