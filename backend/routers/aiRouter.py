#aiRouter.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, aliased
from sqlalchemy import and_, func, case, desc
from database.db_config import get_db
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime



# ✅ CHANGE THESE IMPORTS to match your project models
# Example:
# from database.models import Student, EntLeave
#
# I will assume:
# Student has fields: studentID (UUID PK), studentNum (string)
# EntLeave has fields: entLeaveID, lessonID (int), studentID (UUID), detectionTime (timestamp)

try:
    from database.db import Student, EntLeave  # <-- adjust if needed
except Exception:
    Student = None
    EntLeave = None


router = APIRouter(prefix="/ai", tags=["AI"])


# -----------------------------
# Pydantic Schemas (Request)
# -----------------------------
class Detection(BaseModel):
    student_num: str
    accuracy: float = Field(..., ge=0.0, le=1.0)
    cnn: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class AttendanceSnapshot(BaseModel):
    lesson_id: int
    captured_at: datetime
    detections: List[Detection]


@router.post("/attendance")
def post_attendance(payload: AttendanceSnapshot, db: Session = Depends(get_db)):
    if Student is None or EntLeave is None:
        raise HTTPException(
            status_code=500,
            detail="Student/EntLeave models not imported. Fix aiRouter imports."
        )

    # Quick sanity checks
    if payload.lesson_id <= 0:
        raise HTTPException(status_code=400, detail="lesson_id must be > 0")

    created = 0
    updated = 0
    unknown_students = []

    for det in payload.detections:
        # 1) Find student row by student_num
        student = (
            db.query(Student)
            .filter(Student.studentNum == det.student_num)
            .first()
        )
        if not student:
            unknown_students.append(det.student_num)
            continue

        # 2) Find existing entleave row (per lesson per student)
        row = (
            db.query(EntLeave)
            .filter(
                and_(
                    EntLeave.lessonID == payload.lesson_id,
                    EntLeave.studentID == student.studentID,
                )
            )
            .first()
        )

        # 3) Insert or Update
        if row is None:
            new_row = EntLeave(
                lessonID=payload.lesson_id,
                studentID=student.studentID,
                detectionTime=payload.captured_at
            )
            db.add(new_row)
            created += 1
        else:
            # Update detection time if this is a more recent detection
            if payload.captured_at > row.detectionTime:
                row.detectionTime = payload.captured_at
                updated += 1

    db.commit()

    return {
        "ok": True,
        "lesson_id": payload.lesson_id,
        "captured_at": payload.captured_at.isoformat(),
        "created": created,
        "updated": updated,
        "unknown_students": unknown_students,
    }
