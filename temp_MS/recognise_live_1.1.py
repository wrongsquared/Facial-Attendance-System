import cv2
import dlib
import numpy as np
import pickle
import time
import os
from datetime import datetime
import requests

# Optional: antispoof (won't crash if missing)
try:
    from antispoof import is_real_face_raw
    HAS_ANTISPOOF = True
except Exception:
    HAS_ANTISPOOF = False


# ==============================
# CONFIG
# ==============================
# IMPORTANT:
# If your backend is mounted under /ai (e.g., include_router(..., prefix="/ai")),
# set BASE_API = "http://localhost:8000/ai"
BASE_API = "http://localhost:8000"  # change to "http://localhost:8000/ai" if needed

TODAY_LESSONS_URL = f"{BASE_API}/attendance/today-lessons"
ATTENDANCE_AUTO_URL = f"{BASE_API}/attendance/auto"

ACCEPT_PROBA = 0.70            # 70% threshold (face recognition confidence)
SNAPSHOT_SECONDS = 60          # snapshot window length
SCHEDULE_REFRESH_SECONDS = 300 # refresh today's lessons every 5 mins

# Face size gating (relative to frame width)
MIN_FACE_RATIO = 0.10
MAX_FACE_RATIO = 0.60

# Antispoof gating
USE_ANTISPOOF_GATE = True
ANTISPOOF_THRESH = 0.50

# Dlib chip settings (speed vs accuracy)
CHIP_SIZE = 120
CHIP_PADDING = 0.25
JITTERS = 0

# Performance: detect every N frames
DETECT_EVERY_N_FRAMES = 1

# ==============================
# LOCATION (SET PER ROOM PC)
# ==============================
# Put the actual classroom label here that matches lessons.building / lessons.room
# If you don't want to enforce building, you can set it to "" or None
LOCATION_BUILDING = "A"   # example
LOCATION_ROOM = "101"       # example


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
    # label like "8220967_Din" OR "allison_lang_190036"
    first = label.split("_")[0].strip()
    return first if first.isdigit() else label

def face_chip_embedding(frame_bgr, rect):
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

def fetch_today_lessons():
    try:
        r = requests.get(TODAY_LESSONS_URL, timeout=3)
        if not r.ok:
            print("[SCHEDULE] status:", r.status_code, "body:", r.text[:200])
            return []
        data = r.json()
        lessons = data.get("lessons", [])
        parsed = []
        for L in lessons:
            try:
                parsed.append({
                    "lesson_id": int(L["lesson_id"]),
                    "start": datetime.fromisoformat(L["start"]),
                    "end": datetime.fromisoformat(L["end"]),
                })
            except Exception:
                continue
        return parsed
    except Exception as e:
        print("[SCHEDULE] Error fetching today's lessons:", e)
        return []

def get_active_lesson(now_dt: datetime, lessons: list):
    for L in lessons:
        if L["start"] <= now_dt <= L["end"]:
            return L
    return None

def get_next_lesson(now_dt: datetime, lessons: list):
    future = [L for L in lessons if L["start"] > now_dt]
    future.sort(key=lambda x: x["start"])
    return future[0] if future else None

def post_snapshot_auto(captured_at: datetime, snapshot_best: dict):
    """
    POST to /attendance/auto:
    {
      "captured_at": "...",
      "detections": [...],
      "location": {"building": "...", "room": "..."}
    }

    Backend resolves the correct lesson per student (based on time + enrolment/group),
    AND can enforce that the lesson is happening in this room.
    """
    if not snapshot_best:
        print("[BACKEND] Snapshot skipped (0 students)")
        return {"ok": True, "logs_created": 0}

    payload = {
        "captured_at": captured_at.isoformat(),
        "detections": list(snapshot_best.values()),
        "location": {
            "building": (LOCATION_BUILDING or None),
            "room": (LOCATION_ROOM or None),
        }
    }

    try:
        r = requests.post(ATTENDANCE_AUTO_URL, json=payload, timeout=8)
        print("[BACKEND] status:", r.status_code)
        print("[BACKEND] body:", r.text[:800])
        if r.ok:
            return r.json()
        return {"ok": False}
    except Exception as e:
        print(f"[BACKEND] Error posting snapshot: {e}")
        return {"ok": False}


# ==============================
# MAIN
# ==============================
def main():
    # ---------------------------------------------------------
    # Lesson schedule state (for UI only)
    # ---------------------------------------------------------
    today_lessons = fetch_today_lessons()
    last_schedule_refresh_ts = time.time()

    # --- snapshot window state ---
    snapshot_start_ts = time.time()
    snapshot_captured_at = datetime.now()

    # best detection per student in current snapshot window
    snapshot_best = {}

    # display last backend resolution (debug overlay)
    last_backend_lesson = None
    last_backend_resolved = {}

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open webcam")
        return

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

        now_dt = datetime.now()
        H, W = frame.shape[:2]
        frame_idx += 1

        # refresh lesson schedule (UI only)
        if time.time() - last_schedule_refresh_ts >= SCHEDULE_REFRESH_SECONDS:
            today_lessons = fetch_today_lessons()
            last_schedule_refresh_ts = time.time()

        # determine active lesson (UI only)
        active = get_active_lesson(now_dt, today_lessons)

        if active:
            cv2.putText(frame, f"Schedule says active lesson: {active['lesson_id']}",
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
        else:
            nxt = get_next_lesson(now_dt, today_lessons)
            if nxt:
                mins = int((nxt["start"] - now_dt).total_seconds() // 60)
                cv2.putText(frame, f"Schedule says: none active. Next in ~{mins} min (Lesson {nxt['lesson_id']})",
                            (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
            else:
                cv2.putText(frame, "Schedule says: no lessons today",
                            (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # show configured location
        cv2.putText(frame, f"Location: {LOCATION_BUILDING}/{LOCATION_ROOM}",
                    (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # Debug overlay from backend resolution
        if last_backend_lesson is not None:
            cv2.putText(frame, f"Backend resolved lesson: {last_backend_lesson}",
                        (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)

        # ---------- SNAPSHOT TIMER ----------
        now_ts = time.time()
        if now_ts - snapshot_start_ts >= SNAPSHOT_SECONDS:
            resp = post_snapshot_auto(snapshot_captured_at, snapshot_best)

            # store debug info for overlay
            if isinstance(resp, dict) and resp.get("ok"):
                last_backend_lesson = resp.get("lesson_id")
                last_backend_resolved = resp.get("resolved", {}) or {}

            snapshot_best.clear()
            snapshot_start_ts = now_ts
            snapshot_captured_at = datetime.now()

        seconds_left = max(0, int(SNAPSHOT_SECONDS - (now_ts - snapshot_start_ts)))
        cv2.putText(frame, f"Next snapshot in: {seconds_left}s",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # show small resolved map (top 3) on screen
        if last_backend_resolved:
            y = 120
            shown = 0
            for k, v in last_backend_resolved.items():
                cv2.putText(frame, f"{k} -> lesson {v}",
                            (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                y += 25
                shown += 1
                if shown >= 3:
                    break

        # ---------- DETECT ----------
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

            if face_ratio < MIN_FACE_RATIO:
                draw_box(frame, x1, y1, x2, y2, (0, 255, 255), "Too small - come closer")
                continue
            if face_ratio > MAX_FACE_RATIO:
                draw_box(frame, x1, y1, x2, y2, (0, 165, 255), "Too close - move back")
                continue

            cnn_score = None
            if HAS_ANTISPOOF:
                crop = frame[y1:y2, x1:x2]
                cnn_score = float(is_real_face_raw(crop))
                if USE_ANTISPOOF_GATE and cnn_score < ANTISPOOF_THRESH:
                    draw_box(frame, x1, y1, x2, y2, (0, 0, 255), f"SPOOF (cnn={cnn_score:.2f})")
                    continue

            try:
                emb = face_chip_embedding(frame, d)
            except Exception:
                draw_box(frame, x1, y1, x2, y2, (0, 0, 255), "Chip/landmark failed")
                continue

            probs = clf.predict_proba([emb])[0]
            idx = int(np.argmax(probs))
            conf = float(probs[idx])

            if conf < ACCEPT_PROBA:
                draw_box(frame, x1, y1, x2, y2, (0, 255, 255), f"Low confidence ({conf*100:.1f}%)")
                continue

            name = label_encoder.inverse_transform([idx])[0]
            student_num = extract_student_num(name)

            prev = snapshot_best.get(student_num)
            if (prev is None) or (conf > prev["accuracy"]):
                snapshot_best[student_num] = {
                    "student_num": student_num,
                    "accuracy": round(conf, 4),
                    "cnn": round(cnn_score, 3) if (cnn_score is not None) else None
                }
                print(f"{now_str()} - {name} detected ({conf*100:.1f}%)")

            label = f"{name} ({conf*100:.1f}%)"
            if cnn_score is not None:
                label += f" cnn={cnn_score:.2f}"
            draw_box(frame, x1, y1, x2, y2, (0, 255, 0), label)

        cv2.imshow("Attendance", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    # final snapshot on exit (if any detections in window)
    if snapshot_best:
        post_snapshot_auto(snapshot_captured_at, snapshot_best)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
