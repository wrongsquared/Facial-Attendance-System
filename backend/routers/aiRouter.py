from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database.db_config import get_db
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta

# ✅ Import your models (adjust path if needed)
try:
    from database.db import Student, EntLeave, AttdCheck  # <-- make sure AttdCheck exists here
except Exception as e:
    Student = None
    EntLeave = None
    AttdCheck = None

router = APIRouter(prefix="/ai", tags=["AI"])


# -----------------------------
# Pydantic Schemas
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
    # --- sanity checks ---
    if Student is None or EntLeave is None or AttdCheck is None:
        raise HTTPException(
            status_code=500,
            detail="Model import failed (Student/EntLeave/AttdCheck). Fix aiRouter imports."
        )

    if payload.lesson_id <= 0:
        raise HTTPException(status_code=400, detail="lesson_id must be > 0")

    created_logs = 0
    marked_present = 0
    unknown_students = []

    try:
        for det in payload.detections:
            # 1) Find Student by studentNum
            student = (
                db.query(Student)
                .filter(Student.studentNum == det.student_num)
                .first()
            )

            if not student:
                unknown_students.append(det.student_num)
                continue

            # 2) Find last scan for throttling
            last_scan = (
                db.query(EntLeave)
                .filter(
                    and_(
                        EntLeave.lessonID == payload.lesson_id,
                        EntLeave.studentID == student.studentID
                    )
                )
                .order_by(EntLeave.detectionTime.desc())
                .first()
            )

            should_log = True
            if last_scan:
                if (payload.captured_at - last_scan.detectionTime) < timedelta(minutes=1):
                    should_log = False

            if should_log:
                new_log = EntLeave(
                    lessonID=payload.lesson_id,
                    studentID=student.studentID,
                    detectionTime=payload.captured_at
                )
                db.add(new_log)
                created_logs += 1

            # 3) Mark present in AttdCheck (only once)
            attendance_record = (
                db.query(AttdCheck)
                .filter(
                    and_(
                        AttdCheck.lessonID == payload.lesson_id,
                        AttdCheck.studentID == student.studentID
                    )
                )
                .first()
            )

            if not attendance_record:
                new_check = AttdCheck(
                    lessonID=payload.lesson_id,
                    studentID=student.studentID,
                    status="Present",
                    remarks="Camera AI"
                )
                db.add(new_check)
                marked_present += 1

        db.commit()

    except Exception as e:
        db.rollback()
        print("[AI ROUTER] ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "ok": True,
        "lesson_id": payload.lesson_id,
        "captured_at": payload.captured_at.isoformat(),
        "logs_created": created_logs,
        "marked_present_count": marked_present,
        "unknown_students": unknown_students,
    }
