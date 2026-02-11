# upload_dataset_to_supabase_retry.py
import os
import time
from pathlib import Path
import requests

# Reads from your environment (.env or PowerShell env vars)
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "").strip()

# Your local dataset root (update this)
DATASET_DIR = r"C:\Users\syrfd\OneDrive\Documents\GitHub\Facial-Attendance-System\temp_MS\dataset"

# Upload destination prefix in the bucket
REMOTE_PREFIX = "dataset"  # becomes: dataset/<person_folder>/<filename>

MAX_RETRIES = 6
TIMEOUT = 60  # seconds

def require_env():
    missing = []
    if not SUPABASE_URL: missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY: missing.append("SUPABASE_SERVICE_KEY")
    if not SUPABASE_BUCKET: missing.append("SUPABASE_BUCKET")
    if missing:
        raise RuntimeError("Missing env vars: " + ", ".join(missing))

def guess_content_type(p: Path) -> str:
    ext = p.suffix.lower()
    if ext in [".jpg", ".jpeg"]:
        return "image/jpeg"
    if ext == ".png":
        return "image/png"
    return "application/octet-stream"

def upload_one(local_path: Path, remote_path: str) -> bool:
    # Storage upload endpoint:
    # POST /storage/v1/object/<bucket>/<path>?upsert=true
    url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{remote_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": guess_content_type(local_path),
        # Helps some proxies keep connection stable
        "Connection": "keep-alive",
    }

    params = {"upsert": "true"}  # overwrite if exists

    data = local_path.read_bytes()

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            r = requests.post(url, headers=headers, params=params, data=data, timeout=TIMEOUT)
            if 200 <= r.status_code < 300:
                return True

            # Print helpful error body (may be empty)
            body = (r.text or "").strip()
            raise RuntimeError(f"HTTP {r.status_code} {body[:300]}")

        except Exception as e:
            last_err = e
            sleep_s = min(20, (2 ** (attempt - 1)) * 0.5)  # exponential backoff
            print(f"[retry {attempt}/{MAX_RETRIES}] {remote_path} -> {e} (sleep {sleep_s:.1f}s)")
            time.sleep(sleep_s)

    print(f"[FAILED] {remote_path} -> {last_err}")
    return False

def main():
    require_env()
    root = Path(DATASET_DIR)
    if not root.exists():
        raise RuntimeError(f"Dataset folder not found: {root}")

    failed_log = Path("upload_failed.txt")
    failed_log.write_text("")  # reset

    # Collect all images
    exts = {".jpg", ".jpeg", ".png"}
    files = [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in exts]

    print(f"Found {len(files)} images to upload from {root}")
    ok = 0
    fail = 0

    for i, p in enumerate(files, start=1):
        rel = p.relative_to(root).as_posix()  # person_folder/filename.jpg
        remote_path = f"{REMOTE_PREFIX}/{rel}"

        if upload_one(p, remote_path):
            ok += 1
        else:
            fail += 1
            with failed_log.open("a", encoding="utf-8") as f:
                f.write(remote_path + "\n")

        if i % 25 == 0:
            print(f"Uploaded progress: {i}/{len(files)} (ok={ok}, fail={fail})")

        # small throttle helps avoid rate limits
        time.sleep(0.02)

    print("\n✅ Upload finished")
    print(f"OK: {ok}, Failed: {fail}")
    if fail:
        print("Re-run later using upload_failed.txt list, or tell me and I’ll give a rerun script.")

if __name__ == "__main__":
    main()
