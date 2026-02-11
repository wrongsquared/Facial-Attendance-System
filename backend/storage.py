import os
import uuid
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "student-faces")
SUPABASE_PUBLIC_BASE = os.getenv("SUPABASE_PUBLIC_BASE")  # set this in env

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def upload_jpg_bytes(student_id: int, enrolment_id: str, phase_idx: int, jpg_bytes: bytes) -> str:
    # choose a consistent path
    path = f"students/{student_id}/enrolments/{enrolment_id}/phase_{phase_idx}/{uuid.uuid4().hex}.jpg"

    supabase.storage.from_(SUPABASE_BUCKET).upload(
        path,
        jpg_bytes,
        file_options={"content-type": "image/jpeg", "upsert": False},
    )

    # public URL (only works if bucket is public)
    if not SUPABASE_PUBLIC_BASE:
        raise RuntimeError("SUPABASE_PUBLIC_BASE not set")
    return f"{SUPABASE_PUBLIC_BASE}/{SUPABASE_BUCKET}/{path}"
