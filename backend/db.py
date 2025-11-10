from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
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


class ConsultStatus(enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"

class UserProfile(Base):
    __tablename__ = "UserProfiles"
    profileTypeID: Mapped[int] = mapped_column(primary_key=True)
    users: Mapped[list["User"]] = relationship(back_populates="profileType")

class User(Base):
    __tablename__ = "Users"
    __mapper_args__ = {"polymorphic_identity": "user", "polymorphic_on": "type"} 
    type: Mapped[str]

    userID: Mapped[int] = mapped_column(primary_key=True)

    profileTypeID: Mapped[int] = mapped_column(ForeignKey("UserProfiles.profileTypeID"))
    profileType: Mapped[UserProfile] = relationship(back_populates="users")

    name: Mapped[str] = mapped_column(String(50))
    username: Mapped[str] = mapped_column(String(25))
    #This might change if the password will be stored as Alphanum
    password: Mapped[str] = mapped_column(String(25))

class Admin(User):
    __tablename__ = "Admins"
    __mapper_args__ = {"polymorphic_identity": "admin"}
    adminID: Mapped[int] = mapped_column(ForeignKey("Users.userID"), primary_key = True)

class Lecturer(User):
    __tablename__ = "Lecturers"
    __mapper_args__ = {"polymorphic_identity": "lecturer"}
    lecturerID: Mapped[int] = mapped_column(ForeignKey("Users.userID"), primary_key = True)
    modules: Mapped[list[LecMod]] = relationship(back_populates="lecturers")


class Student(User):
    __tablename__ = "Students"
    __mapper_args__ = {"polymorphic_identity": "student"}
    studentID: Mapped[int] = mapped_column(ForeignKey("Users.userID"),  primary_key = True)
    courseID: Mapped[int] = mapped_column(ForeignKey("Courses.courseID"))
    attendanceMinimum: Mapped[float]

class StudentFace(Base):
    __tablename__ = "Studentfaces"
    StudentID: Mapped[int] = mapped_column(ForeignKey("Students.studentID"), primary_key = True)
    #photo: havednt figure out what datatype it is

class EntLeave(Base):
    __tablename__ = "EntLeave"
    entLeaveID: Mapped[int]= mapped_column(primary_key=True)
    lessonID: Mapped[int] = mapped_column(ForeignKey("Lessons.lessonID"))
    studentID: Mapped[int] = mapped_column(ForeignKey("Students.studentID"))
    enter: Mapped[datetime.datetime]
    leave: Mapped[datetime.datetime]

class AttdCheck(Base):
    __tablename__ = "AttdCheck"
    AttdCheckID: Mapped[int]= mapped_column(primary_key=True)
    lessonID: Mapped[int] = mapped_column(ForeignKey("Lessons.lessonID"))
    studentID: Mapped[int] = mapped_column(ForeignKey("Students.studentID"))
    attendance_check: Mapped[bool]
    
class Module(Base):
    __tablename__ = "Modules"
    moduleID: Mapped[int] = mapped_column(primary_key=True)
    moduleName: Mapped[str] = mapped_column(String(25))
    moduleCode: Mapped[str] = mapped_column(String(8))
    Lessons: Mapped[list[LecMod]] = relationship(back_populates="modules")

class Lesson(Base):
    __tablename__ = "Lessons"
    lessonID: Mapped[int] = mapped_column(primary_key=True)
    lecModID: Mapped[int] = mapped_column(ForeignKey("LecMods.lecModID"))
    lessontype: Mapped[str] = mapped_column(String[10])
    startDateTime: Mapped[datetime.datetime]
    endDateTime: Mapped[datetime.datetime]


class LecMod(Base):
    __tablename__ = "LecMods"
    lecModID: Mapped[int] = mapped_column(primary_key= True)

    lecturerID: Mapped[int] = mapped_column(ForeignKey("Lecturers.lecturerID"))
    lecturers: Mapped[Lecturer] = relationship(back_populates="lessons")

    moduleID: Mapped[int] = mapped_column(ForeignKey("Modules.moduleID"))
    modules: Mapped[Module] = relationship(back_populates="Lessons")

class StudentLesson(Base):
    __tablename__ = "StudentLessons"
    studentLessonsID: Mapped[int] = mapped_column(primary_key= True)

    studentID: Mapped[int] = mapped_column(ForeignKey("Students.studentID"))
    lecturerID: Mapped[int] = mapped_column(ForeignKey("Lecturers.lecturerID"))

class Courses(Base):
    __tablename__ = "Courses"
    courseID: Mapped[int] = mapped_column(primary_key= True)
    courseCode: Mapped[str] = mapped_column(String[10])