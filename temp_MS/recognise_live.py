# recognise_live.py
import cv2
import dlib
import numpy as np
import pickle
import time
from datetime import datetime
from collections import defaultdict
import requests

from antispoof import is_real_face_raw  # CNN liveness probability (0–1)

# ==========================
# CONFIG
# ==========================
# Face recognition threshold
FACE_CONF_THRESH = 0.70   # 70% minimum to accept attendance

# Anti-spoof CNN threshold
CNN_THRESH = 0.50         # tune if needed (0.4–0.6 typical)

# Minimum face size (to avoid very small faces)
MIN_FACE_RATIO = 0.12     # fraction of frame width
MIN_FACE_PX = 80          # absolute minimum pixels

# Snapshot window (per student)
# Only send attendance once per SNAPSHOT_SECONDS per student
SNAPSHOT_SECONDS = 900     # 15 minutes (use 600 for 10 mins)

# Backend API endpoint
BACKEND_URL = "http://localhost:3000/ai/attendance"  # adjust if needed

# ==========================
# LOAD MODELS
# ==========================
print("Loading dlib models...")
detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor("shape_predictor_5_face_landmarks.dat")
face_rec_model = dlib.face_recognition_model_v1(
    "dlib_face_recognition_resnet_model_v1.dat"
)

print("Loading face classifier...")
with open("classifier.pkl", "rb") as f:
    clf = pickle.load(f)

# Try to load LabelEncoder (preferred)
encoder = None
try:
    with open("labels.pkl", "rb") as f:
        encoder = pickle.load(f)
    print("Loaded LabelEncoder from labels.pkl")
except Exception:
    print("labels.pkl not found; falling back to classifier.classes_ only")

# Helper for decoding class index -> folder name
classes = getattr(clf, "classes_", None)

def decode_label(idx: int) -> str:
    """
    Return the folder name for a predicted class index.
    Prefer LabelEncoder, else clf.classes_, else 'Student {idx}'.
    """
    global encoder, classes
    if encoder is not None:
        try:
            return encoder.inverse_transform([idx])[0]
        except Exception:
            pass

    if classes is not None and 0 <= idx < len(classes):
        return str(classes[idx])

    return f"Student {idx}"

print("System ready.\n")

# ==========================
# HELPERS
# ==========================
def clamp_box(x1, y1, x2, y2, W, H):
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(W - 1, x2)
    y2 = min(H - 1, y2)
    return x1, y1, x2, y2


def embed_face(frame_bgr, box):
    x1, y1, x2, y2 = box
    crop = frame_bgr[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    shape = shape_predictor(rgb, dlib.rectangle(0, 0, crop.shape[1], crop.shape[0]))
    emb = np.array(face_rec_model.compute_face_descriptor(rgb, shape, 1))
    return emb


def extract_student_num(folder_name: str) -> str:
    """
    folder_name example: '8220967_Din'
    student_num -> '8220967'
    """
    parts = folder_name.split("_", 1)
    return parts[0] if parts else folder_name


def send_attendance(student_num: str, full_name: str, confidence: float):
    """
    Send attendance to backend /ai/attendance.
    Adjust payload keys to match your backend model.
    """
    ts = datetime.now().isoformat()
    payload = {
        "student_num": student_num,
        "full_name": full_name,
        "confidence": float(confidence),  # 0–1
        "timestamp": ts,
    }

    try:
        resp = requests.post(BACKEND_URL, json=payload, timeout=3)
        if resp.status_code != 200:
            print(f"[BACKEND] Attendance POST failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"[BACKEND] Error posting attendance: {e}")


# Store last attendance time per student_num
last_seen = defaultdict(lambda: 0.0)


# ==========================
# MAIN LOOP
# ==========================
def main():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

    if not cap.isOpened():
        print("❌ Could not open webcam.")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        H, W = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        dets = detector(gray, 0)

        if len(dets) == 0:
            cv2.putText(
                frame,
                "No face detected",
                (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 0, 255),
                2,
            )
            cv2.imshow("Face Recognition + Anti-Spoof", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            continue

        # Multiple faces
        for d in dets:
            x1, y1, x2, y2 = d.left(), d.top(), d.right(), d.bottom()
            x1, y1, x2, y2 = clamp_box(x1, y1, x2, y2, W, H)

            face_w = x2 - x1
            face_ratio = face_w / float(W)

            face_crop = frame[y1:y2, x1:x2]
            if face_crop.size == 0:
                continue

            # Default overlay
            box_color = (0, 255, 255)  # yellow default
            text = ""

            # Check "Too small"
            if face_ratio < MIN_FACE_RATIO or face_w < MIN_FACE_PX:
                box_color = (0, 255, 255)  # yellow
                text = "Too small"
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                cv2.putText(
                    frame,
                    text,
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    box_color,
                    2,
                )
                continue

            # CNN anti-spoof score
            cnn_score = float(is_real_face_raw(face_crop))

            # If CNN strongly thinks spoof -> mark as SPOOF
            if cnn_score < CNN_THRESH:
                box_color = (0, 0, 255)  # red
                text = f"SPOOF? CNN={cnn_score:.2f}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                cv2.putText(
                    frame,
                    text,
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    box_color,
                    2,
                )
                continue

            # Face embedding + classification
            emb = embed_face(frame, (x1, y1, x2, y2))
            if emb is None:
                continue

            probs = clf.predict_proba([emb])[0]
            best_idx = int(np.argmax(probs))
            best_prob = float(probs[best_idx])  # 0–1
            folder_name = decode_label(best_idx)  # e.g. '8220967_Din'
            student_num = extract_student_num(folder_name)

            # Enforce 70% threshold
            if best_prob < FACE_CONF_THRESH:
                # Low confidence → ask to move closer / better pose
                box_color = (0, 255, 255)  # yellow
                text = f"{folder_name} ({best_prob*100:.1f}%) - Come closer"
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                cv2.putText(
                    frame,
                    text,
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    box_color,
                    2,
                )
                continue

            # Passed both CNN and 70% face threshold
            # Check snapshot window for this student
            now_ts = time.time()
            last_ts = last_seen[student_num]

            if now_ts - last_ts >= SNAPSHOT_SECONDS:
                last_seen[student_num] = now_ts

                # Log to console
                stamp = datetime.now().strftime("%d-%m-%Y %H:%M:%S")
                print(
                    f"{stamp} - {folder_name} marked present "
                    f"({best_prob*100:.1f}% Accuracy)"
                )

                # Send to backend
                send_attendance(student_num, folder_name, best_prob)

            # Draw accepted attendance
            box_color = (0, 255, 0)  # green
            text = f"{folder_name} ({best_prob*100:.1f}%)"

            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
            cv2.putText(
                frame,
                text,
                (x1, max(20, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                box_color,
                2,
            )

            # Show CNN score in corner for debugging
            cv2.putText(
                frame,
                f"CNN: {cnn_score:.2f}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
            )

        cv2.imshow("Face Recognition + Anti-Spoof + Attendance", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
