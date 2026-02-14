from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, text
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
import re
from database.db import studentAngles
from sqlalchemy.dialects.postgresql import insert

from supabase import create_client, Client

# =========================================================
# Supabase config
# =========================================================
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("SPBASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SPBASE_SKEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "student-faces")

LATE_MINUTES = int(os.getenv("LATE_MINUTES", "5"))


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

def _normalize_student_num(s: str) -> str:
    """
    Accepts:
      "190036" -> "190036"
      "allison_lang_190036" -> "190036"
    If no digits found, returns original trimmed.
    """
    s = (s or "").strip()
    m = re.search(r"(\d{4,})", s)
    return m.group(1) if m else s

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

    sn = _normalize_student_num(student_num)
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
            detail="Model import failed (Student/EntLeave/AttdCheck). Fix database.db imports.",
        )

    if payload.lesson_id <= 0:
        raise HTTPException(status_code=400, detail="lesson_id must be > 0")

    lesson_start = None
    try:
        row = db.execute(
            text('SELECT "startDateTime" FROM public.lessons WHERE "lessonID" = :lid LIMIT 1'),
            {"lid": payload.lesson_id},
        ).fetchone()
        if row and row[0]:
            lesson_start = row[0]
    except Exception as e:
        print("[AI attendance] lesson start lookup failed:", repr(e))

    late_threshold = (lesson_start + timedelta(minutes=LATE_MINUTES)) if lesson_start else None

    created_logs = 0
    marked_present = 0
    updated_present = 0
    unknown_students: List[str] = []

    try:
        for det in payload.detections:
            sn = _normalize_student_num(det.student_num)
            student = db.query(Student).filter(Student.studentNum == sn).first()
            if not student:
                unknown_students.append(det.student_num)
                continue

            last_scan = (
                db.query(EntLeave)
                .filter(and_(EntLeave.lessonID == payload.lesson_id, EntLeave.studentID == student.studentID))
                .order_by(EntLeave.detectionTime.desc())
                .first()
            )

            should_log = True
            if last_scan and (payload.captured_at - last_scan.detectionTime) < timedelta(minutes=1):
                should_log = False

            if should_log:
                db.add(
                    EntLeave(
                        lessonID=payload.lesson_id,
                        studentID=student.studentID,
                        detectionTime=payload.captured_at,
                    )
                )
                created_logs += 1

            attendance_record = (
                db.query(AttdCheck)
                .filter(and_(AttdCheck.lessonID == payload.lesson_id, AttdCheck.studentID == student.studentID))
                .first()
            )

            if not attendance_record:
                status = "Late" if (late_threshold and payload.captured_at > late_threshold) else "Present"
                db.add(
                    AttdCheck(
                        lessonID=payload.lesson_id,
                        studentID=student.studentID,
                        status=status,
                        remarks="Camera Capture",
                        firstDetection=payload.captured_at,
                        lastDetection=payload.captured_at,
                    )
                )
                marked_present += 1
            else:
                attendance_record.lastDetection = payload.captured_at
                if not getattr(attendance_record, "remarks", None):
                    attendance_record.remarks = "Camera Capture"
                if getattr(attendance_record, "firstDetection", None) is None:
                    attendance_record.firstDetection = payload.captured_at
                    attendance_record.status = (
                        "Late" if (late_threshold and payload.captured_at > late_threshold) else "Present"
                    )
                else:
                    if not getattr(attendance_record, "status", None):
                        attendance_record.status = "Present"
                updated_present += 1

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
        "updated_present_count": updated_present,
        "unknown_students": unknown_students,
    }

# ============================
# LOCATION MODELS (NEW)
# ============================
class LocationInfo(BaseModel):
    building: Optional[str] = None
    room: Optional[str] = None

class AutoAttendanceSnapshot(BaseModel):
    captured_at: datetime
    detections: List[Detection]
    location: Optional[LocationInfo] = None


def _find_student_active_lesson_id(
    db: Session,
    *,
    student_uuid: str,
    at_time: datetime,
    building: Optional[str] = None,
    room: Optional[str] = None,
) -> Optional[int]:
    """
    Returns lessonID of the lesson the student belongs to at at_time.
    - Active time window: start <= t <= end
    - Lecture (tutorialGroupID NULL): student must be enrolled in module
    - Practical (tutorialGroupID NOT NULL): student must be in that tutorial group
    - (NEW) If building/room provided, lesson must match those too
    """
    try:
        base_sql = """
            SELECT l."lessonID"
            FROM public.lessons l
            LEFT JOIN public.lecmods lm
              ON lm."lecModID" = l."lecModID"
            LEFT JOIN public.studentmodules sm
              ON sm."modulesID" = lm."moduleID"
             AND sm."studentID" = :student_uuid
            LEFT JOIN public.studenttutorialgroups stg
              ON stg."studentModulesID" = sm."studentModulesID"
            WHERE l."startDateTime" <= :t
              AND l."endDateTime" >= :t
        """

        params = {"student_uuid": student_uuid, "t": at_time}

        # only enforce if provided
        if building:
            base_sql += ' AND l."building" = :b'
            params["b"] = building

        if room:
            base_sql += ' AND l."room" = :r'
            params["r"] = room

        base_sql += """
              AND (
                    (l."tutorialGroupID" IS NULL AND sm."studentModulesID" IS NOT NULL)
                 OR (l."tutorialGroupID" IS NOT NULL AND stg."tutorialGroupID" = l."tutorialGroupID")
              )
            ORDER BY l."startDateTime" DESC
            LIMIT 1
        """

        row = db.execute(text(base_sql), params).fetchone()
        return int(row[0]) if row and row[0] is not None else None
    except Exception as e:
        print("[AI auto] active lesson lookup failed:", repr(e))
        return None


@router.get("/attendance/today-lessons")
def attendance_today_lessons(
    db: Session = Depends(get_db),
    max_lesson_hours: int = Query(6, description="Ignore lessons longer than this (prevents bad test data hijacking active lesson)")
):
    now = datetime.now()
    day_start = datetime(now.year, now.month, now.day)
    day_end = day_start + timedelta(days=1)

    try:
        rows = db.execute(
            text(
                """
                SELECT "lessonID", "startDateTime", "endDateTime"
                FROM public.lessons
                WHERE "startDateTime" >= :ds
                  AND "startDateTime" < :de
                  AND ("endDateTime" - "startDateTime") <= (:max_hours || ' hours')::interval
                ORDER BY "startDateTime" ASC
                """
            ),
            {"ds": day_start, "de": day_end, "max_hours": int(max_lesson_hours)},
        ).fetchall()

        lessons = []
        for r in rows:
            lessons.append(
                {
                    "lesson_id": int(r[0]),
                    "start": r[1].isoformat() if r[1] else None,
                    "end": r[2].isoformat() if r[2] else None,
                }
            )
        return {"ok": True, "lessons": lessons, "max_lesson_hours": int(max_lesson_hours)}
    except Exception as e:
        print("[AI today-lessons] ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance/auto")
def post_attendance_auto(payload: AutoAttendanceSnapshot, db: Session = Depends(get_db)):
    if Student is None or EntLeave is None or AttdCheck is None:
        raise HTTPException(
            status_code=500,
            detail="Model import failed (Student/EntLeave/AttdCheck). Fix database.db imports.",
        )

    created_logs = 0
    marked_present = 0
    updated_present = 0
    unknown_students: List[str] = []
    not_in_lesson: List[str] = []
    resolved_lesson_id: Optional[int] = None

    # NEW: read location filters if provided
    building = None
    room = None
    try:
        if payload.location:
            building = (payload.location.building or "").strip() or None
            room = (payload.location.room or "").strip() or None
    except Exception:
        building = None
        room = None

    try:
        for det in payload.detections:
            sn = _normalize_student_num(det.student_num)
            student = db.query(Student).filter(Student.studentNum == sn).first()
            if not student:
                unknown_students.append(det.student_num)
                continue

            lesson_id = _find_student_active_lesson_id(
                db,
                student_uuid=str(student.studentID),
                at_time=payload.captured_at,
                building=building,
                room=room,
            )
            if not lesson_id:
                not_in_lesson.append(sn)
                continue

            resolved_lesson_id = resolved_lesson_id or lesson_id

            lesson_start = None
            try:
                row = db.execute(
                    text('SELECT "startDateTime" FROM public.lessons WHERE "lessonID" = :lid LIMIT 1'),
                    {"lid": lesson_id},
                ).fetchone()
                if row and row[0]:
                    lesson_start = row[0]
            except Exception as e:
                print("[AI auto] lesson start lookup failed:", repr(e))

            late_threshold = (lesson_start + timedelta(minutes=LATE_MINUTES)) if lesson_start else None

            last_scan = (
                db.query(EntLeave)
                .filter(and_(EntLeave.lessonID == lesson_id, EntLeave.studentID == student.studentID))
                .order_by(EntLeave.detectionTime.desc())
                .first()
            )

            should_log = True
            if last_scan and (payload.captured_at - last_scan.detectionTime) < timedelta(minutes=1):
                should_log = False

            if should_log:
                db.add(EntLeave(lessonID=lesson_id, studentID=student.studentID, detectionTime=payload.captured_at))
                created_logs += 1

            attendance_record = (
                db.query(AttdCheck)
                .filter(and_(AttdCheck.lessonID == lesson_id, AttdCheck.studentID == student.studentID))
                .first()
            )

            if not attendance_record:
                status = "Late" if (late_threshold and payload.captured_at > late_threshold) else "Present"
                db.add(
                    AttdCheck(
                        lessonID=lesson_id,
                        studentID=student.studentID,
                        status=status,
                        remarks="Camera Capture",
                        firstDetection=payload.captured_at,
                        lastDetection=payload.captured_at,
                    )
                )
                marked_present += 1
            else:
                attendance_record.lastDetection = payload.captured_at
                if not getattr(attendance_record, "remarks", None):
                    attendance_record.remarks = "Camera Capture"

                if getattr(attendance_record, "firstDetection", None) is None:
                    attendance_record.firstDetection = payload.captured_at
                    attendance_record.status = (
                        "Late" if (late_threshold and payload.captured_at > late_threshold) else "Present"
                    )
                else:
                    if not getattr(attendance_record, "status", None):
                        attendance_record.status = "Present"

                updated_present += 1

        db.commit()

    except Exception as e:
        db.rollback()
        print("[AI attendance/auto] ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "ok": True,
        "lesson_id": resolved_lesson_id,
        "captured_at": payload.captured_at.isoformat(),
        "logs_created": created_logs,
        "marked_present_count": marked_present,
        "updated_present_count": updated_present,
        "unknown_students": unknown_students,
        "not_in_lesson": not_in_lesson,
        # optional debug:
        "location_used": {"building": building, "room": room},
    }


# =========================================================
# 2) ENROLMENT FLOW (UNCHANGED)
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
    if "LEFT" in up: return "LEFT"
    if "RIGHT" in up: return "RIGHT"
    if "UP" in up: return "UP"
    if "DOWN" in up: return "DOWN"
    return "FRONT"

@router.post("/enrolment/start")
def enrolment_start(data: dict):
    enrolment_id = str(uuid.uuid4())

    ENROL_SESSIONS[enrolment_id] = {
        "student_uuid": data.get("student_id"),
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

    profile_image_url = None
    if first_image:
        try:
            sb = _require_supabase()
            res = sb.storage.from_(SUPABASE_BUCKET).create_signed_url(first_image, 3600)
            url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
            if url and url.startswith("/") and SUPABASE_URL:
                url = SUPABASE_URL.rstrip("/") + url
            profile_image_url = url
        except Exception as e:
            print(f"Error generating finish enrollment profile image URL: {e}")
            profile_image_url = None

    return {
        "status": "success",
        "last_updated": datetime.utcnow().isoformat(),
        "profile_image_url": first_image
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
    student_num = _normalize_student_num(student_num)
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
            "profile_image_url": student.photo
        }

    return {
        "enrolled": True,
        "last_updated": first_angle.updatedat,
        "profile_image_url": first_angle.imagepath
    }

@router.get("/biometric/{student_num}/images")
async def get_biometric_images(student_num: str, db: Session = Depends(get_db)):
    student_num = _normalize_student_num(student_num)
    student = db.query(Student).filter(Student.studentNum == student_num).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    records = db.query(studentAngles).filter(studentAngles.studentID == student.studentID).all()

    if not records:
        return {"images": []}

    images_response = []
    sb = _require_supabase()

    for rec in records:
        try:
            res = sb.storage.from_(SUPABASE_BUCKET).create_signed_url(rec.imagepath, 3600)
            url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
            if not url:
                print(f"No signed URL returned for {rec.photoangle}: {res}")
                continue

            if url.startswith("/") and SUPABASE_URL:
                url = SUPABASE_URL.rstrip("/") + url

            images_response.append({"angle": rec.photoangle, "url": url})
        except Exception as e:
            print(f"Error generating URL for {rec.photoangle}: {e}")
            continue

    return {"images": images_response}

@router.delete("/biometric/{student_num}")
def delete_biometric_profile(student_num: str, db: Session = Depends(get_db)):
    try:
        student_uuid = _resolve_student_uuid(db, student_num=student_num)
        if not student_uuid:
            raise HTTPException(status_code=404, detail="Student not found")

        existing_records = db.execute(
            text('SELECT COUNT(*) FROM public.studentangles WHERE "studentID" = :student_id'),
            {"student_id": student_uuid},
        ).fetchone()

        if not existing_records or existing_records[0] == 0:
            raise HTTPException(status_code=404, detail="No biometric profile found")

        image_records = db.execute(
            text('SELECT imagepath FROM public.studentangles WHERE "studentID" = :student_id'),
            {"student_id": student_uuid},
        ).fetchall()

        sb = _require_supabase()
        files_deleted = 0
        deletion_errors = []

        for record in image_records:
            image_path = record[0]
            if image_path:
                try:
                    _ = sb.storage.from_(SUPABASE_BUCKET).remove([image_path])
                except Exception as e:
                    deletion_errors.append(f"Could not delete storage file {image_path}: {str(e)}")

        db.execute(
            text('DELETE FROM public.studentangles WHERE "studentID" = :student_id'),
            {"student_id": student_uuid},
        )
        db.commit()

        return {"message": "Biometric profile deleted successfully", "deletion_errors": deletion_errors}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[AI] delete_biometric_profile error: {repr(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete biometric profile")
