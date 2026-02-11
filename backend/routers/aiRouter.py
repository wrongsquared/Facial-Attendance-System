# aiRouter.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, text, func
from database.db_config import get_db
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import os
import uuid
import numpy as np
import io
from PIL import Image
import cv2
import asyncio
from database.db import studentAngles
from sqlalchemy.dialects.postgresql import insert

from supabase import create_client, Client

# =========================================================
# Supabase config
# =========================================================
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("SPBASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SPBASE_SKEY")

SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "student-faces")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def _require_supabase() -> Client:
    if supabase is None:
        raise RuntimeError(
            "Supabase client not configured. Set SUPABASE_URL/SPBASE_URL and SUPABASE_SERVICE_ROLE_KEY/SPBASE_SKEY"
        )
    return supabase


def _safe_label(s: str) -> str:
    s = (s or "").strip().lower()
    s = "".join(ch if ch.isalnum() else "_" for ch in s)
    s = "_".join([p for p in s.split("_") if p])
    return s[:60] or "unknown_user"


def _resolve_student_uuid(db: Session, *, student_id: str = "", student_num: str = "") -> Optional[str]:
    """
    Try:
      - student_id already UUID
      - OR lookup students table by studentNum -> studentID uuid
    """
    sid = (student_id or "").strip()
    if sid:
        try:
            return str(uuid.UUID(sid))
        except Exception:
            pass

    sn = (student_num or "").strip()
    if not sn:
        return None

    try:
        row = db.execute(
            text('SELECT "studentID" FROM public.students WHERE "studentNum" = :sn LIMIT 1'),
            {"sn": sn},
        ).fetchone()
        if row and row[0]:
            return str(uuid.UUID(str(row[0])))
    except Exception as e:
        print("[AI] student UUID lookup failed:", repr(e))

    return None


def upload_jpeg_to_supabase(storage_path: str, jpeg_bytes: bytes) -> None:
    sb = _require_supabase()
    sb.storage.from_(SUPABASE_BUCKET).upload(
        storage_path,
        jpeg_bytes,
        file_options={"content-type": "image/jpeg", "upsert": "true"},
    )

def _studentangles_create_record(db: Session, *, student_uuid: str, angle: str, image_path: str) -> bool:
    """
    Cleans up old records for this specific angle and creates a new one.
    Simple, reliable, and avoids 'ON CONFLICT' errors.
    """
    try:
        # Delete record if exists
        db.query(studentAngles).filter(
            studentAngles.studentID == student_uuid,
            studentAngles.photoangle == angle
        ).delete()

        # Create new record
        new_entry = studentAngles(
            studentID=student_uuid,
            photoangle=angle,
            imagepath=image_path
        )
        db.add(new_entry)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"[AI ENROL] Failed to save record for {angle}: {e}")
        return False

try:
    from database.db import Student, EntLeave, AttdCheck
except Exception:
    Student = None
    EntLeave = None
    AttdCheck = None


router = APIRouter()


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
    if Student is None or EntLeave is None or AttdCheck is None:
        raise HTTPException(
            status_code=500,
            detail="Model import failed (Student/EntLeave/AttdCheck). Fix database.db imports."
        )

    if payload.lesson_id <= 0:
        raise HTTPException(status_code=400, detail="lesson_id must be > 0")

    created_logs = 0
    marked_present = 0
    unknown_students = []

    try:
        for det in payload.detections:
            student = db.query(Student).filter(Student.studentNum == det.student_num).first()

            if not student:
                unknown_students.append(det.student_num)
                continue

            last_scan = (
                db.query(EntLeave)
                .filter(and_(EntLeave.lessonID == payload.lesson_id, EntLeave.studentID == student.studentID))
                .order_by(EntLeave.detectionTime.desc())
                .first()
            )

            # 1-minute cooldown
            should_log = True
            if last_scan and (payload.captured_at - last_scan.detectionTime) < timedelta(minutes=1):
                should_log = False

            if should_log:
                db.add(EntLeave(
                    lessonID=payload.lesson_id,
                    studentID=student.studentID,
                    detectionTime=payload.captured_at
                ))
                created_logs += 1

            attendance_record = (
                db.query(AttdCheck)
                .filter(and_(AttdCheck.lessonID == payload.lesson_id, AttdCheck.studentID == student.studentID))
                .first()
            )

            if not attendance_record:
                db.add(AttdCheck(
                    lessonID=payload.lesson_id,
                    studentID=student.studentID,
                    status="Present",
                    remarks="Camera AI"
                ))
                marked_present += 1

        db.commit()

    except Exception as e:
        db.rollback()
        print("[AI attendance] ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "ok": True,
        "lesson_id": payload.lesson_id,
        "captured_at": payload.captured_at.isoformat(),
        "logs_created": created_logs,
        "marked_present_count": marked_present,
        "unknown_students": unknown_students,
    }


# =========================================================
# 2) ENROLMENT FLOW (POST /ai/enrolment/*)
# =========================================================
ENROL_SESSIONS: Dict[str, Dict[str, Any]] = {}

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

CAPTURE_COUNT = 200
CAPTURE_GUIDE: List[Tuple[str, int]] = [
    ("FRONT", 40),
    ("LEFT", 40),
    ("RIGHT", 40),
    ("UP", 40),
    ("DOWN", 40),
]


def _phase_payload(sess: Dict[str, Any]) -> Dict[str, Any]:
    idx = int(sess.get("phase_idx", 0))
    idx = min(max(idx, 0), len(CAPTURE_GUIDE) - 1)
    instruction, need = CAPTURE_GUIDE[idx]
    return {"idx": idx, "instruction": instruction, "need": need, "done": int(sess.get("phase_done", 0))}


def _current_angle_label(instruction: str) -> str:
    up = (instruction or "").upper()
    if "LEFT" in up:
        return "LEFT"
    if "RIGHT" in up:
        return "RIGHT"
    if "UP" in up:
        return "UP"
    if "DOWN" in up:
        return "DOWN"
    return "FRONT"


@router.post("/enrolment/start")
def enrolment_start(data: dict):
    enrolment_id = str(uuid.uuid4())
    
    ENROL_SESSIONS[enrolment_id] = {
        "student_uuid": data.get("student_id"), # Make sure this matches frontend key
        "student_folder": data.get("student_label"),
        "count": 0,
        "phase_idx": 0,
        "phase_done": 0,
        "last_save_ts": 0,
        "lock": asyncio.Lock()
    }
    print(f"DEBUG: Starting session {enrolment_id}")
    return {"enrolment_id": enrolment_id, "capture_count": 200}


@router.post("/enrolment/frame")
async def enrolment_frame(
    enrolment_id: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    sess = ENROL_SESSIONS.get(enrolment_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Invalid enrolment_id")

    lock: asyncio.Lock = sess.get("lock")  # type: ignore
    if lock is None:
        lock = asyncio.Lock()
        sess["lock"] = lock

    async with lock:
        if sess["count"] >= CAPTURE_COUNT:
            return {"accepted": True, "reason": "complete", "count": sess["count"], "phase": _phase_payload(sess), "done": True}

        now_ts = datetime.utcnow().timestamp()
        if (now_ts - float(sess["last_save_ts"])) < 0.12:
            return {"accepted": False, "reason": "throttle", "count": sess["count"], "phase": _phase_payload(sess), "done": False}

        raw = await image.read()
        try:
            pil = Image.open(io.BytesIO(raw)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image")

        rgb = np.array(pil)
        h, w = rgb.shape[:2]
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

        if len(faces) == 0:
            return {"accepted": False, "reason": "no_face", "count": sess["count"], "phase": _phase_payload(sess), "done": False}

        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, fw, fh = faces[0]

        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w - 1, x + fw), min(h - 1, y + fh)

        face_ratio = fw / float(w)
        if face_ratio < 0.10:
            return {"accepted": False, "reason": "too_small", "count": sess["count"], "phase": _phase_payload(sess), "done": False}
        if face_ratio > 0.60:
            return {"accepted": False, "reason": "too_close", "count": sess["count"], "phase": _phase_payload(sess), "done": False}

        crop = rgb[y1:y2, x1:x2]
        if crop.size == 0:
            return {"accepted": False, "reason": "bad_crop", "count": sess["count"], "phase": _phase_payload(sess), "done": False}

        out = io.BytesIO()
        Image.fromarray(crop).save(out, format="JPEG", quality=90)
        jpeg_bytes = out.getvalue()

        sess["count"] += 1
        sess["phase_done"] += 1
        sess["last_save_ts"] = now_ts

        instruction, need = CAPTURE_GUIDE[sess["phase_idx"]]
        angle_label = _current_angle_label(instruction)

        student_folder = sess.get("student_folder") or "unknown_user"
        fname = f"img_{sess['count']:04d}.jpg"
        storage_path = f"{student_folder}/{angle_label}/{fname}"

        # Upload to bucket
        try:
            upload_jpeg_to_supabase(storage_path, jpeg_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase upload failed: {e}")

        # Save first accepted as profile.jpg
        if not sess.get("first_storage_path"):
            sess["first_storage_path"] = storage_path
            try:
                upload_jpeg_to_supabase(f"{student_folder}/profile.jpg", jpeg_bytes)
            except Exception as e:
                print("[AI ENROL] profile upload failed:", repr(e))

        inserted = False
        student_uuid = (sess.get("student_uuid") or "").strip()
        if sess["phase_done"] == 1: 
            _studentangles_create_record(db, student_uuid=student_uuid, angle=angle_label, image_path=storage_path)

        if sess["phase_done"] >= need:
            sess["phase_idx"] += 1
            sess["phase_done"] = 0

        done = sess["count"] >= CAPTURE_COUNT
        if done:
            sess["phase_idx"] = min(sess["phase_idx"], len(CAPTURE_GUIDE) - 1)

        return {
            "accepted": True,
            "reason": "saved",
            "count": sess["count"],
            "phase": _phase_payload(sess),
            "done": done,
            "storage_path": storage_path,
            "studentangles_upserted": inserted,
        }


@router.post("/enrolment/finish")  
async def enrolment_finish(enrolment_id: str, db: Session = Depends(get_db)):
    print(f"DEBUG: Finishing session {enrolment_id}. Current active sessions: {list(ENROL_SESSIONS.keys())}")
    sess = ENROL_SESSIONS.pop(enrolment_id, None) 
    if not sess:
        raise HTTPException(status_code=404, detail="Enrolment session not found")

    student_uuid = sess.get("student_uuid")
    first_image = sess.get("first_storage_path")

    if student_uuid and first_image:
        student = db.get(Student, student_uuid)
        if student:
            student.photo = first_image
            db.commit()

    return {
        "status": "success",
        "last_updated": datetime.utcnow().isoformat(),
        "profile_image_url": first_image # Or a signed URL
    }

@router.get("/storage/signed-url")
def storage_signed_url(
    path: str = Query(..., description="Storage file path inside bucket"),
    expires_in: int = Query(3600, description="Seconds until expiry"),
):
    sb = _require_supabase()
    try:
        res = sb.storage.from_(SUPABASE_BUCKET).create_signed_url(path, expires_in)
        url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
        if not url:
            return {"ok": False, "error": "No signed URL returned", "raw": res}
        if url.startswith("/") and SUPABASE_URL:
            url = SUPABASE_URL.rstrip("/") + url
        return {"ok": True, "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/profile-photo")
def get_user_profile_photo(user_id: str, db: Session = Depends(get_db)):
    sb = _require_supabase()

    row = db.execute(
        text('SELECT photo FROM public.users WHERE "userID" = :uid'),
        {"uid": user_id},
    ).fetchone()

    if not row or not row[0]:
        raise HTTPException(status_code=404, detail="No profile photo")

    path = row[0]

    res = sb.storage.from_(SUPABASE_BUCKET).create_signed_url(path, 3600)
    url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")

    if not url:
        raise HTTPException(status_code=500, detail="Failed to sign URL")

    if url.startswith("/"):
        url = SUPABASE_URL.rstrip("/") + url

    return {"url": url}



@router.get("/profile/status")
async def get_biometric_status(student_num: str, db: Session = Depends(get_db)):
    """
    Checks if a student has any biometric data enrolled.
    """
    student = db.query(Student).filter(Student.studentNum == student_num).first()
    
    if not student:
        return {"enrolled": False, "last_updated": None, "profile_image_url": None}

    first_angle = db.query(studentAngles).filter(
        studentAngles.studentID == student.studentID
    ).first()

    if not first_angle:
        return {
            "enrolled": False, 
            "last_updated": None, 
            "profile_image_url": student.photo # Might have a generic avatar
        }

    return {
        "enrolled": True,
        "last_updated": first_angle.updatedat,
        "profile_image_url": first_angle.imagepath # Return a sample image path
    }

@router.get("/biometric/{student_num}/images")
async def get_biometric_images(student_num: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.studentNum == student_num).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    records = db.query(studentAngles).filter(studentAngles.studentID == student.studentID).all()
    
    if not records:
        return {"images": []}

    images_response = []
    for rec in records:
        try:
            res = supabase.storage.from_("biometrics").create_signed_url(rec.imagepath, 60)
            
            images_response.append({
                "angle": rec.photoangle,
                "url": res['signedURL']
            })
        except Exception as e:
            print(f"Error generating URL for {rec.photoangle}: {e}")

    return {"images": images_response}


@router.delete("/biometric/{student_num}")
def delete_biometric_profile(
    student_num: str, 
    db: Session = Depends(get_db)
):
    """Delete biometric profile for a student"""
    try:
        student_uuid = _resolve_student_uuid(db, student_num=student_num)
        if not student_uuid:
            raise HTTPException(status_code=404, detail="Student not found")

        # Check if student has existing biometric records using proper quoted column names
        existing_records = db.execute(
            text('SELECT COUNT(*) FROM public.studentangles WHERE "studentID" = :student_id'),
            {"student_id": student_uuid},
        ).fetchone()

        if not existing_records or existing_records[0] == 0:
            raise HTTPException(status_code=404, detail="No biometric profile found")

        # Delete all biometric records for this student using proper quoted column names
        db.execute(
            text('DELETE FROM public.studentangles WHERE "studentID" = :student_id'),
            {"student_id": student_uuid},
        )
        db.commit()

        return {"message": "Biometric profile deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[AI] delete_biometric_profile error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete biometric profile")
