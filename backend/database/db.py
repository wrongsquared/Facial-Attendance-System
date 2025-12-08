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



class UserProfile(Base):
    __tablename__ = "userprofiles"
    profileTypeID: Mapped[int] = mapped_column(primary_key=True)
    profileTypeName: Mapped[str] = mapped_column(String(500))
    users: Mapped[list["User"]] = relationship(back_populates="profileType")

class User(Base):
    __tablename__ = "users"
    __mapper_args__ = {"polymorphic_identity": "user", "polymorphic_on": "type"} 
    type: Mapped[str]

    userID: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)

    profileTypeID: Mapped[int] = mapped_column(ForeignKey("userprofiles.profileTypeID"))
    profileType: Mapped[UserProfile] = relationship(back_populates="users")

    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str] = mapped_column(String(40))
    # Password is not required as it is stored as hash in the hidden supabase password table
    photo: Mapped[str | None] #Allows for None, as we figure out how we want to store the photo.

class Admin(User):
    __tablename__ = "admins"
    __mapper_args__ = {"polymorphic_identity": "admin"}
    adminID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)
    

class Lecturer(User):
    __tablename__ = "lecturers"
    __mapper_args__ = {"polymorphic_identity": "lecturer"}
    lecturerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"), primary_key = True)

    lecMod: Mapped[list[LecMod]] = relationship(back_populates="lecturers")


class Student(User):
    __tablename__ = "students"
    __mapper_args__ = {"polymorphic_identity": "student"}
    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.userID"),  primary_key = True)

    courseID: Mapped[int] = mapped_column(ForeignKey("courses.courseID"))
    course: Mapped[Courses] = relationship(back_populates="students")

    EntLeaves: Mapped[list[EntLeave]] = relationship(back_populates="student")
    attendanceMinimum: Mapped[float]

    attdcheck: Mapped[list[AttdCheck]] = relationship(back_populates="student")

    studentmodules: Mapped[list[StudentModules]] = relationship(back_populates="student")


class EntLeave(Base):
    __tablename__ = "entleave"
    entLeaveID: Mapped[int]= mapped_column(primary_key=True)
    lessonID: Mapped[int] = mapped_column(ForeignKey("lessons.lessonID"))
    lesson: Mapped[Lesson] = relationship(back_populates="entLeaves")

    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.studentID"))
    student: Mapped[Student] = relationship(back_populates="EntLeaves")

    enter: Mapped[datetime.datetime]
    leave: Mapped[datetime.datetime | None]

class AttdCheck(Base):
    __tablename__ = "attdcheck"
    AttdCheckID: Mapped[int]= mapped_column(primary_key=True)
    lessonID: Mapped[uuid.UUID] = mapped_column(ForeignKey("lessons.lessonID"))
    lesson: Mapped[Lesson] = relationship(back_populates="attdcheck")
    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.studentID"))
    student: Mapped[Student] = relationship(back_populates="attdcheck")
    
class Module(Base):
    __tablename__ = "modules"
    moduleID: Mapped[int] = mapped_column(primary_key=True)
    moduleName: Mapped[str] = mapped_column(String(25))
    moduleCode: Mapped[str] = mapped_column(String(8))
    lecMod: Mapped[list[LecMod]] = relationship(back_populates="modules")
    studentModules: Mapped[list[StudentModules]] = relationship(back_populates="modules")

class Lesson(Base):
    __tablename__ = "lessons"
    lessonID: Mapped[int] = mapped_column(primary_key=True)

    lecModID: Mapped[int] = mapped_column(ForeignKey("lecmods.lecModID"))
    lecMod: Mapped[LecMod] = relationship(back_populates="lessons")

    attdcheck: Mapped[list[AttdCheck]] = relationship(back_populates="lesson")

    entLeaves: Mapped[list[EntLeave]] = relationship(back_populates="lesson")

    lessontype: Mapped[str] = mapped_column(String(10))
    startDateTime: Mapped[datetime.datetime]
    endDateTime: Mapped[datetime.datetime]



class LecMod(Base):
    __tablename__ = "lecmods"
    lecModID: Mapped[int] = mapped_column(primary_key= True)

    lecturerID: Mapped[uuid.UUID] = mapped_column(ForeignKey("lecturers.lecturerID"))
    lecturers: Mapped[Lecturer] = relationship(back_populates="lecMod")

    lessons: Mapped[list[Lesson]] = relationship(back_populates="lecMod")

    
    
    moduleID: Mapped[int] = mapped_column(ForeignKey("modules.moduleID"))
    modules: Mapped[Module] = relationship(back_populates="lecMod")

class StudentModules(Base):
    __tablename__ = "studentmodules"
    studentModulesID: Mapped[int] = mapped_column(primary_key= True)

    studentID: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.studentID"))
    student: Mapped[Student] = relationship(back_populates="studentmodules")

    modulesID: Mapped[int] = mapped_column(ForeignKey("modules.moduleID"))
    modules: Mapped[Module] = relationship(back_populates="studentModules")

class Courses(Base):
    __tablename__ = "courses"
    courseID: Mapped[int] = mapped_column(primary_key= True)
    courseCode: Mapped[str] = mapped_column(String(10))

    students: Mapped[list[Student]] = relationship(back_populates="course")