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


class Base(DeclarativeBase):
    pass



class UserProfile(Base): #User Profiles, Student, Lecturer, Admins
    __tablename__ = "userprofiles"
    profileTypeID: Mapped[int] = mapped_column(primary_key=True)
    profileTypeName: Mapped[str] = mapped_column(String(500))
    users: Mapped[list["User"]] = relationship(back_populates="profileType")

class User(Base): #User

    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    __mapper_args__ = {"polymorphic_identity": "user", "polymorphic_on": "type"} 
    type: Mapped[str]

    userID: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)

    profileTypeID: Mapped[int] = mapped_column(ForeignKey("userprofiles.profileTypeID"))
    profileType: Mapped[UserProfile] = relationship(back_populates="users")

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

class Admin(User): #Admin, Child of User
    __tablename__ = "admins"
    __mapper_args__ = {"polymorphic_identity": "admin"}
    
    adminID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)
    role: Mapped[str]

class Lecturer(User): #Lecturer, Child of User
    __tablename__ = "lecturers"
    __mapper_args__ = {"polymorphic_identity": "lecturer"}
    lecturerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)
    specialistIn: Mapped[str]
    lecMod: Mapped[list[LecMod]] = relationship(back_populates="lecturers")

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

class Module(Base): #Modules
    __tablename__ = "modules"
    moduleID: Mapped[int] = mapped_column(primary_key=True)
    moduleName: Mapped[str] = mapped_column(String(25))
    moduleCode: Mapped[str] = mapped_column(String(8))
    lecMod: Mapped[list[LecMod]] = relationship(back_populates="modules")
    studentModules: Mapped[list[StudentModules]] = relationship(back_populates="modules")

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

class studentAngles(Base): #Student-Angles for AI Training?
    __tablename__ = "studentangles"

    studentID: Mapped[UUID] = mapped_column(ForeignKey("students.studentID"), primary_key= True)
    
    photoAngle: Mapped[str] = mapped_column(String, primary_key=True)
    student: Mapped[Student] = relationship(back_populates="angles")

