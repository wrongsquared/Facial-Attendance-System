# recognise_live.py
import cv2
import dlib
import numpy as np
import pickle
import time
import os
from datetime import datetime

# Optional: backend posting
import requests

# Optional: antispoof (won't crash if missing)
try:
    from antispoof import is_real_face_raw
    HAS_ANTISPOOF = True
except Exception:
    HAS_ANTISPOOF = False


# ------------------------------
# CONFIG
# ------------------------------
BACKEND_URL = "http://localhost:8000/ai/attendance"

ACCEPT_PROBA = 0.70          # 70% threshold
SNAPSHOT_SECONDS = 60   # 1 minutes (change to 15*60 if needed for 15 mins)

# Face size gating (relative to frame width)
MIN_FACE_RATIO = 0.10        # if face is smaller than 10% of frame width => Too small
MAX_FACE_RATIO = 0.60        # optional: too close cap

# Antispoof gating (optional)
USE_ANTISPOOF_GATE = True   # keep False if you want pure recognition testing
ANTISPOOF_THRESH = 0.50      # used only if USE_ANTISPOOF_GATE = True

# Dlib chip settings
CHIP_SIZE = 150
CHIP_PADDING = 0.25
JITTERS = 1   # set 2 for more accuracy (slower)

#For testing lesson_id
LESSON_ID = 1

# ------------------------------
# LOAD MODELS
# ------------------------------
print("Loading dlib models...")
detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor("shape_predictor_5_face_landmarks.dat")
face_rec_model = dlib.face_recognition_model_v1("dlib_face_recognition_resnet_model_v1.dat")

print("Loading face classifier...")
clf = pickle.load(open("classifier.pkl", "rb"))

# Load label encoder properly (labels.pkl is the correct one for inverse_transform)
label_encoder = None
if os.path.exists("labels.pkl"):
    label_encoder = pickle.load(open("labels.pkl", "rb"))
    print("Loaded LabelEncoder from labels.pkl")
else:
    # fallback if someone saved encoder elsewhere
    try:
        enc = pickle.load(open("encodings.pkl", "rb"))
        if isinstance(enc, dict) and "label_encoder" in enc:
            label_encoder = enc["label_encoder"]
            print("Loaded LabelEncoder from encodings.pkl[label_encoder]")
    except Exception:
        pass

if label_encoder is None:
    raise RuntimeError(" Could not load LabelEncoder. Ensure labels.pkl exists (from train_classifier.py).")

print("System ready.\n")


# ------------------------------
# HELPERS
# ------------------------------
def clamp_box(x1, y1, x2, y2, w, h):
    x1 = max(0, x1); y1 = max(0, y1)
    x2 = min(w - 1, x2); y2 = min(h - 1, y2)
    if x2 <= x1: x2 = min(w - 1, x1 + 1)
    if y2 <= y1: y2 = min(h - 1, y1 + 1)
    return x1, y1, x2, y2

def extract_student_num(label: str) -> str:
    # label looks like "8220967_Din" or "8220967_Din_Something"
    # student number = first token before "_" if numeric
    first = label.split("_")[0].strip()
    return first if first.isdigit() else label

def face_chip_embedding(frame_bgr, rect):
    """
    Produce a stable embedding using aligned face chips:
    1) landmark on full frame
    2) face chip (aligned)
    3) landmark again on chip
    4) embedding
    """
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    # Landmarks on full frame
    shape = shape_predictor(rgb, rect)

    # Aligned chip
    chip = dlib.get_face_chip(rgb, shape, size=CHIP_SIZE, padding=CHIP_PADDING)

    # Landmark again on chip (predictor expects a rect)
    chip_rect = dlib.rectangle(0, 0, chip.shape[1] - 1, chip.shape[0] - 1)
    chip_shape = shape_predictor(chip, chip_rect)

    # Embedding
    emb = np.array(face_rec_model.compute_face_descriptor(chip, chip_shape, JITTERS), dtype=np.float32)
    return emb

def post_attendance(student_label: str, confidence: float):
    """
    POST to backend endpoint /ai/attendance.
    Adjust payload keys if your backend expects different fields.
    """
    student_num = extract_student_num(student_label)
    payload = {
        "lesson_id": LESSON_ID,
        "student_num": student_num,
        "student_label": student_label,
        "confidence": round(confidence * 100, 1),
        "timestamp": datetime.now().isoformat()
    }
    r = requests.post(BACKEND_URL, json=payload, timeout=2.5)

    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=2.5)
        if r.status_code >= 400:
            print(f"[BACKEND] Error: {r.status_code} {r.text[:200]}")
        else:
            print("[BACKEND] Posted attendance OK")
    except Exception as e:
        print(f"[BACKEND] Error posting attendance: {e}")

def draw_box(frame, x1, y1, x2, y2, color, text=None):
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    if text:
        cv2.putText(frame, text, (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2)

def now_str():
    return datetime.now().strftime("%d-%m-%Y %H:%M:%S")


# ------------------------------
# MAIN
# ------------------------------
def main():
    # Attendance memory: student_label -> last_mark_time
    last_marked = {}

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print(" Could not open webcam.")
        return

    # Force 1920x1080
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    # Read back what we actually got
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"[CAM] Resolution set to: {w}x{h}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        H, W = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        dets = detector(gray, 0)
        if len(dets) == 0:
            cv2.putText(frame, "No face detected", (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            cv2.imshow("Attendance", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            continue

        # Process multiple faces
        for d in dets:
            x1, y1, x2, y2 = d.left(), d.top(), d.right(), d.bottom()
            x1, y1, x2, y2 = clamp_box(x1, y1, x2, y2, W, H)

            face_w = max(1, x2 - x1)
            face_ratio = face_w / float(W)

            # --- size gating ---
            if face_ratio < MIN_FACE_RATIO:
                # Yellow "Too small"
                draw_box(frame, x1, y1, x2, y2, (0, 255, 255), "Too small - come closer")
                continue

            if face_ratio > MAX_FACE_RATIO:
                draw_box(frame, x1, y1, x2, y2, (0, 165, 255), "Too close - move back")
                continue

            # --- optional antispoof ---
            if HAS_ANTISPOOF:
                crop = frame[y1:y2, x1:x2]
                cnn_score = float(is_real_face_raw(crop))
            else:
                cnn_score = -1.0

            if USE_ANTISPOOF_GATE and HAS_ANTISPOOF:
                if cnn_score < ANTISPOOF_THRESH:
                    draw_box(frame, x1, y1, x2, y2, (0, 0, 255), f"SPOOF (cnn={cnn_score:.2f})")
                    continue

            # --- embedding (aligned face chips) ---
            try:
                emb = face_chip_embedding(frame, d)
            except Exception:
                draw_box(frame, x1, y1, x2, y2, (0, 0, 255), "Landmark/chip failed")
                continue

            # --- classify ---
            probs = clf.predict_proba([emb])[0]
            idx = int(np.argmax(probs))
            conf = float(probs[idx])

            # Correct label mapping
            name = label_encoder.inverse_transform([idx])[0]

            # --- decision ---
            if conf < ACCEPT_PROBA:
                # below 70% -> prompt to come closer
                draw_box(frame, x1, y1, x2, y2, (0, 255, 255), f"Low confidence ({conf*100:.1f}%) - come closer")
                continue

            # Attendance snapshot window
            now = time.time()
            last_t = last_marked.get(name, 0)
            if now - last_t >= SNAPSHOT_SECONDS:
                last_marked[name] = now
                msg = f"{now_str()} - {name} marked present ({conf*100:.1f}% Accuracy)"
                print(msg)
                post_attendance(name, conf)

            # Draw green box + label
            label = f"{name} ({conf*100:.1f}%)"
            if HAS_ANTISPOOF:
                label += f" cnn={cnn_score:.2f}"
            draw_box(frame, x1, y1, x2, y2, (0, 255, 0), label)

        cv2.imshow("Attendance", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
