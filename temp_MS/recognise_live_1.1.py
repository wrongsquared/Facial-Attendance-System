import cv2
import dlib
import numpy as np
import pickle
import time
import os
from datetime import datetime
import requests
import re

# Optional: antispoof (won't crash if missing)
try:
    from antispoof import is_real_face_raw
    HAS_ANTISPOOF = True
except Exception:
    HAS_ANTISPOOF = False


# ==============================
# CONFIG
# ==============================
BACKEND_URL = "http://localhost:8000/attendance"

# For now you can hardcode (testing). Later: fetch from /student/todayslesson or lecturer endpoint.
LESSON_ID = 1

ACCEPT_PROBA = 0.70            # 70% threshold (face recognition confidence)
SNAPSHOT_SECONDS = 60          # set to 10*60 or 15*60 later

# Face size gating (relative to frame width)
MIN_FACE_RATIO = 0.10          # too far
MAX_FACE_RATIO = 0.60          # too close (optional)

# Antispoof gating
USE_ANTISPOOF_GATE = True
ANTISPOOF_THRESH = 0.50

# Dlib chip settings (speed vs accuracy)
CHIP_SIZE = 120
CHIP_PADDING = 0.25
JITTERS = 0                    # 0 is faster, 1-2 improves stability but slower

# Performance: detect every N frames (optional)
DETECT_EVERY_N_FRAMES = 1      # set 2 or 3 to speed up on weak laptops


# ==============================
# LOAD MODELS
# ==============================
print("Loading dlib models...")
detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor("shape_predictor_5_face_landmarks.dat")
face_rec_model = dlib.face_recognition_model_v1("dlib_face_recognition_resnet_model_v1.dat")

print("Loading face classifier...")
clf = pickle.load(open("classifier.pkl", "rb"))

if not os.path.exists("labels.pkl"):
    raise RuntimeError("labels.pkl not found (needed for inverse_transform). Run train_classifier.py")

label_encoder = pickle.load(open("labels.pkl", "rb"))
print("Loaded LabelEncoder from labels.pkl")

print("System ready.\n")


# ==============================
# HELPERS
# ==============================
def clamp_box(x1, y1, x2, y2, w, h):
    x1 = max(0, x1); y1 = max(0, y1)
    x2 = min(w - 1, x2); y2 = min(h - 1, y2)
    if x2 <= x1: x2 = min(w - 1, x1 + 1)
    if y2 <= y1: y2 = min(h - 1, y1 + 1)
    return x1, y1, x2, y2

def extract_student_num(label: str) -> str:
    """
    Extracts a student number from a label.
    Works for:
      - "8220967_Din" -> "8220967"
      - "allison_lang_190036" -> "190036"
      - "190036" -> "190036"
    If no digits found, returns the original label.
    """
    s = (label or "").strip()

    # Prefer the last numeric chunk (most common in names like xxx_190036)
    parts = s.split("_")
    for part in reversed(parts):
        if part.isdigit():
            return part

    # Fallback: any digit sequence in the string
    m = re.search(r"(\d+)", s)
    return m.group(1) if m else s

def face_chip_embedding(frame_bgr, rect):
    """
    Aligned embedding:
    full-frame landmarks -> face chip -> landmarks on chip -> descriptor
    """
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    shape = shape_predictor(rgb, rect)
    chip = dlib.get_face_chip(rgb, shape, size=CHIP_SIZE, padding=CHIP_PADDING)

    chip_rect = dlib.rectangle(0, 0, chip.shape[1] - 1, chip.shape[0] - 1)
    chip_shape = shape_predictor(chip, chip_rect)

    desc = face_rec_model.compute_face_descriptor(chip, chip_shape, JITTERS)
    return np.array(desc, dtype=np.float32)

def draw_box(frame, x1, y1, x2, y2, color, text=None):
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    if text:
        cv2.putText(frame, text, (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

def now_str():
    return datetime.now().strftime("%d-%m-%Y %H:%M:%S")

def post_snapshot(lesson_id: int, captured_at: datetime, snapshot_best: dict):
    """
    POSTS payload matching your FastAPI docs:

    {
      "lesson_id": 1,
      "captured_at": "2026-01-29T21:17:00.410Z",
      "detections": [
        { "student_num": "8220967", "accuracy": 0.874, "cnn": 0.72 }
      ]
    }
    """
    if not snapshot_best:
        print("[BACKEND] Snapshot skipped (0 students)")
        return

    payload = {
        "lesson_id": int(lesson_id),
        "captured_at": captured_at.isoformat(),
        "detections": list(snapshot_best.values())
    }

    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=3)
        print("[BACKEND] status:", r.status_code)
        print("[BACKEND] body:", r.text[:500])
    except Exception as e:
        print(f"[BACKEND] Error posting snapshot: {e}")


# ==============================
# MAIN
# ==============================
def main():
    # --- snapshot window state ---
    snapshot_start_ts = time.time()
    snapshot_captured_at = datetime.now()

    # student_num -> best detection dict for this window
    # best = { "student_num": "8220967", "accuracy": 0.874, "cnn": 0.72 }
    snapshot_best = {}

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open webcam")
        return

    # Force camera (may not apply on all webcams; we read back actual)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[CAM] Resolution set to: {w}x{h}")

    frame_idx = 0
    last_dets = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        H, W = frame.shape[:2]
        frame_idx += 1

        # ---------- SNAPSHOT TIMER ----------
        now_ts = time.time()
        if now_ts - snapshot_start_ts >= SNAPSHOT_SECONDS:
            post_snapshot(LESSON_ID, snapshot_captured_at, snapshot_best)

            snapshot_best.clear()
            snapshot_start_ts = now_ts
            snapshot_captured_at = datetime.now()

        seconds_left = max(0, int(SNAPSHOT_SECONDS - (now_ts - snapshot_start_ts)))
        cv2.putText(frame, f"Next snapshot in: {seconds_left}s",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # ---------- DETECT (optionally skip frames for speed) ----------
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if frame_idx % DETECT_EVERY_N_FRAMES == 0:
            dets = detector(gray, 0)
            last_dets = dets
        else:
            dets = last_dets

        # ---------- PROCESS MULTIPLE FACES ----------
        for d in dets:
            x1, y1, x2, y2 = clamp_box(d.left(), d.top(), d.right(), d.bottom(), W, H)
            face_w = max(1, x2 - x1)
            face_ratio = face_w / float(W)

            # too small / too close gates
            if face_ratio < MIN_FACE_RATIO:
                draw_box(frame, x1, y1, x2, y2, (0, 255, 255), "Too small - come closer")
                continue
            if face_ratio > MAX_FACE_RATIO:
                draw_box(frame, x1, y1, x2, y2, (0, 165, 255), "Too close - move back")
                continue

            # antispoof
            cnn_score = None
            if HAS_ANTISPOOF:
                crop = frame[y1:y2, x1:x2]
                cnn_score = float(is_real_face_raw(crop))
                if USE_ANTISPOOF_GATE and cnn_score < ANTISPOOF_THRESH:
                    draw_box(frame, x1, y1, x2, y2, (0, 0, 255), f"SPOOF (cnn={cnn_score:.2f})")
                    continue

            # embedding
            try:
                emb = face_chip_embedding(frame, d)
            except Exception:
                draw_box(frame, x1, y1, x2, y2, (0, 0, 255), "Chip/landmark failed")
                continue

            # classify
            probs = clf.predict_proba([emb])[0]
            idx = int(np.argmax(probs))
            conf = float(probs[idx])  # 0..1

            # threshold
            if conf < ACCEPT_PROBA:
                draw_box(frame, x1, y1, x2, y2, (0, 255, 255), f"Low confidence ({conf*100:.1f}%)")
                continue

            # label -> student_num
            name = label_encoder.inverse_transform([idx])[0]  # "8220967_Din"
            student_num = extract_student_num(name)

            # Keep BEST per student inside snapshot window
            prev = snapshot_best.get(student_num)
            if (prev is None) or (conf > prev["accuracy"]):
                snapshot_best[student_num] = {
                    "student_num": student_num,           # ✅ string
                    "accuracy": round(conf, 4),           # ✅ 0..1
                    "cnn": round(cnn_score, 3) if (cnn_score is not None) else None
                }
                print(f"{now_str()} - {name} detected ({conf*100:.1f}%)")

            # draw
            label = f"{name} ({conf*100:.1f}%)"
            if cnn_score is not None:
                label += f" cnn={cnn_score:.2f}"
            draw_box(frame, x1, y1, x2, y2, (0, 255, 0), label)

        cv2.imshow("Attendance", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # send final snapshot (optional)
    post_snapshot(LESSON_ID, snapshot_captured_at, snapshot_best)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
