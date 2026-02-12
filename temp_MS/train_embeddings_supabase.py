# train_embeddings_supabase.py
# Train dlib face embeddings by streaming images directly from Supabase Storage
# - Trains from bucket folder:  dataset/<person_folder>/*.jpg
# - Optionally also trains from DB table: studentangles (imagepath)
# - Optionally ALSO trains from top-level user folders: <user_folder>/**/*.jpg   (excluding dataset/)
# Output: encodings.pkl  (same format as your existing classifier script)

import os
import pickle
import time
import numpy as np
import cv2
import dlib
import requests

from supabase import create_client, Client

# ✅ Load .env automatically if python-dotenv is installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# ----------------------------
# ENV VARS
# ----------------------------
SUPABASE_URL = (os.getenv("SUPABASE_URL") or os.getenv("SPBASE_URL") or "").strip()
SUPABASE_KEY = (os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SPBASE_SKEY") or "").strip()
SUPABASE_BUCKET = (os.getenv("SUPABASE_BUCKET") or "student-faces").strip()

# What to train from:
TRAIN_FROM_DATASET_FOLDER = os.getenv("TRAIN_FROM_DATASET_FOLDER", "1").strip() == "1"
TRAIN_FROM_STUDENTANGLES_TABLE = os.getenv("TRAIN_FROM_STUDENTANGLES_TABLE", "1").strip() == "1"
TRAIN_FROM_USER_FOLDERS = os.getenv("TRAIN_FROM_USER_FOLDERS", "1").strip() == "1"  # ✅ NEW

# Storage folder name for your uploaded dataset
DATASET_PREFIX = (os.getenv("DATASET_PREFIX") or "dataset").strip().strip("/")

# ----------------------------
# OUTPUT FILE
# ----------------------------
EMBEDDINGS_FILE = "encodings.pkl"

# ----------------------------
# DLIB MODELS (must exist in same folder or give full path)
# ----------------------------
SHAPE_PREDICTOR_PATH = "shape_predictor_5_face_landmarks.dat"
DLIB_REC_MODEL_PATH = "dlib_face_recognition_resnet_model_v1.dat"

CHIP_SIZE = 150
PADDING = 0.25

# ----------------------------
# DOWNLOAD SETTINGS
# ----------------------------
TIMEOUT_SECONDS = 15
MAX_RETRIES = 3

# Acceptable image extensions
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def require_env():
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL (or SPBASE_URL)")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_KEY (or SPBASE_SKEY)")
    if not SUPABASE_BUCKET:
        missing.append("SUPABASE_BUCKET")
    if missing:
        raise RuntimeError(
            "Missing env vars: " + ", ".join(missing) +
            "\nFix: put them inside your .env as KEY=VALUE (no quotes), then run again."
        )


def supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def signed_url(sb: Client, path: str, expires_in: int = 3600) -> str:
    res = sb.storage.from_(SUPABASE_BUCKET).create_signed_url(path, expires_in)

    url = None
    if isinstance(res, dict):
        url = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")

    if not url:
        raise RuntimeError(f"Failed to create signed url for: {path} -> {res}")

    if url.startswith("/"):
        url = SUPABASE_URL.rstrip("/") + url

    return url


def download_image_bytes(url: str) -> bytes:
    last_err = None
    for _ in range(MAX_RETRIES):
        try:
            r = requests.get(url, timeout=TIMEOUT_SECONDS)
            r.raise_for_status()
            return r.content
        except Exception as e:
            last_err = e
            time.sleep(0.4)
    raise RuntimeError(f"Failed to download image after retries: {last_err}")


def bytes_to_bgr(img_bytes: bytes):
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def is_image_name(name: str) -> bool:
    low = name.lower()
    for ext in IMAGE_EXTS:
        if low.endswith(ext):
            return True
    return False


def list_all_files_recursive(sb: Client, prefix: str):
    """
    Recursively list all files under a prefix in Supabase Storage.
    Returns list of full paths like: dataset/903277_Marcus/img_0001.jpg
    """
    out = []

    def walk(folder: str):
        offset = 0
        limit = 1000

        while True:
            items = sb.storage.from_(SUPABASE_BUCKET).list(
                folder,
                {
                    "limit": limit,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                },
            )
            if not items:
                break

            for it in items:
                name = it.get("name")
                if not name:
                    continue

                # Detect folder vs file:
                # - folders typically come back with id=None and metadata=None
                is_folder = (it.get("id") is None) and (it.get("metadata") is None)

                if is_folder:
                    walk(f"{folder}/{name}".strip("/"))
                else:
                    if is_image_name(name):
                        out.append(f"{folder}/{name}".strip("/"))

            offset += limit

    walk(prefix.strip("/"))
    return out


def list_root_folders(sb: Client):
    """
    List top-level folders in the bucket (root of storage).
    Returns folder names like: ["dataset", "allison_lang_190036", "8220967_Din", ...]
    """
    folders = []
    items = sb.storage.from_(SUPABASE_BUCKET).list(
        "",
        {"limit": 1000, "offset": 0, "sortBy": {"column": "name", "order": "asc"}},
    ) or []

    for it in items:
        name = it.get("name")
        if not name:
            continue
        is_folder = (it.get("id") is None) and (it.get("metadata") is None)
        if is_folder:
            folders.append(name)

    return folders


def label_from_dataset_path(path: str) -> str:
    """
    dataset/<person_folder>/<filename>
    label = <person_folder>
    """
    parts = path.split("/")
    # Example: ["dataset", "903277_Marcus", "img_0001.jpg"]
    if len(parts) >= 2:
        return parts[1]
    return "unknown"


def label_from_user_folder_path(path: str) -> str:
    """
    <user_folder>/.../file.jpg
    label = <user_folder>
    """
    parts = path.split("/")
    if len(parts) >= 1 and parts[0]:
        return parts[0]
    return "unknown"


def collect_training_items(sb: Client):
    """
    Returns list of (label, imagepath, source)
    """
    items = []

    # A) Train from storage dataset folder
    if TRAIN_FROM_DATASET_FOLDER:
        print(f"Listing storage files under: {DATASET_PREFIX}/ ...")
        dataset_files = list_all_files_recursive(sb, DATASET_PREFIX)
        print(f"Found {len(dataset_files)} image files in {DATASET_PREFIX}/")

        for p in dataset_files:
            label = label_from_dataset_path(p)
            items.append((label, p, "storage_dataset"))

    # ✅ C) Train from top-level user folders (excluding dataset/)
    if TRAIN_FROM_USER_FOLDERS:
        print("Listing top-level user folders in bucket (excluding dataset)...")
        root_folders = list_root_folders(sb)
        user_folders = [f for f in root_folders if f.strip("/") != DATASET_PREFIX]

        print(f"Found {len(user_folders)} top-level folders to scan.")
        total_user_images = 0

        for folder in user_folders:
            try:
                user_files = list_all_files_recursive(sb, folder)
                total_user_images += len(user_files)
                for p in user_files:
                    label = label_from_user_folder_path(p)
                    items.append((label, p, "storage_userfolder"))
            except Exception as e:
                print(f"[WARN] Failed to scan folder '{folder}': {e}")

        print(f"Found {total_user_images} image files across user folders.")

    # B) Train from studentangles table
    if TRAIN_FROM_STUDENTANGLES_TABLE:
        print("Querying studentangles table...")
        rows = []
        page = 0
        page_size = 1000

        while True:
            start = page * page_size
            end = start + page_size - 1
            resp = (
                sb.table("studentangles")
                .select("studentID,photoangle,imagepath,updatedat")
                .range(start, end)
                .execute()
            )
            batch = resp.data or []
            if not batch:
                break
            rows.extend(batch)
            page += 1

        # Use student UUID as label for these
        usable = 0
        for r in rows:
            sid = r.get("studentID")
            path = r.get("imagepath")
            if not sid or not path:
                continue
            items.append((str(sid), path, "studentangles"))
            usable += 1

        print(f"Found {usable} rows in studentangles with imagepath.")

    return items


def main():
    require_env()

    print("Connecting to Supabase...")
    sb = supabase_client()

    print("Loading dlib models...")
    detector = dlib.get_frontal_face_detector()
    sp = dlib.shape_predictor(SHAPE_PREDICTOR_PATH)
    facerec = dlib.face_recognition_model_v1(DLIB_REC_MODEL_PATH)

    training_items = collect_training_items(sb)

    if not training_items:
        print("No training images found. Nothing to train.")
        return

    print(f"\nTotal images to process: {len(training_items)}")

    names = []
    embeddings = []
    failed = 0
    processed = 0

    for label, path, source in training_items:
        try:
            url = signed_url(sb, path, expires_in=3600)
            img_bytes = download_image_bytes(url)
            img = bytes_to_bgr(img_bytes)
            if img is None:
                raise RuntimeError("cv2 failed to decode image")

            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            dets = detector(rgb, 1)
            if len(dets) == 0:
                raise RuntimeError("No face detected")

            det = max(dets, key=lambda d: d.width() * d.height())
            shape = sp(rgb, det)

            chip = dlib.get_face_chip(rgb, shape, size=CHIP_SIZE, padding=PADDING)

            face_descriptor = facerec.compute_face_descriptor(chip)
            emb = np.array(face_descriptor, dtype=np.float32)

            embeddings.append(emb)
            names.append(label)
            processed += 1

            if processed % 50 == 0:
                print(f"Processed {processed}/{len(training_items)} ...")

        except Exception as e:
            failed += 1
            print(f"[SKIP] label={label} source={source} path={path} -> {e}")

    if not embeddings:
        print("No embeddings produced (all failed).")
        return

    data = {"embeddings": embeddings, "names": names}
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump(data, f)

    print("\n✅ Done.")
    print(f"Saved embeddings: {EMBEDDINGS_FILE}")
    print(f"Total ok: {processed}, failed: {failed}")


if __name__ == "__main__":
    main()
