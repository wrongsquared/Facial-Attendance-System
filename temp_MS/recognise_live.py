# recognise_live.py
import cv2
import dlib
import numpy as np
import pickle
from datetime import datetime
from collections import deque
from antispoof import is_real_face_raw

print("Loading dlib models...")
detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor("shape_predictor_5_face_landmarks.dat")
face_rec_model = dlib.face_recognition_model_v1(
    "dlib_face_recognition_resnet_model_v1.dat"
)

print("Loading face classifier + label encoder...")
clf = pickle.load(open("classifier.pkl", "rb"))
encoder = pickle.load(open("labels.pkl", "rb"))   # IMPORTANT FIX
print("System ready.\n")

# ------------------------------
# SETTINGS
# ------------------------------
REAL_THRESH = 0.5
MIN_ACCURACY = 0.70   # 70% threshold
MIN_FACE_RATIO = 0.12

CONF_HISTORY = 8

attendance_marked = set()
confidence_buffers = {}

# ------------------------------
# HELPERS
# ------------------------------
def clamp(x1, y1, x2, y2, w, h):
    return max(0,x1), max(0,y1), min(w,x2), min(h,y2)

def embed(frame, box):
    x1,y1,x2,y2 = box
    crop = frame[y1:y2, x1:x2]
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    shape = shape_predictor(
        rgb,
        dlib.rectangle(0,0,crop.shape[1],crop.shape[0])
    )
    return np.array(face_rec_model.compute_face_descriptor(rgb, shape))

def now_str():
    return datetime.now().strftime("%d-%m-%Y %H:%M:%S")

# ------------------------------
# MAIN
# ------------------------------
def main():
    cap = cv2.VideoCapture(0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h,w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = detector(gray, 0)

        for d in faces:
            x1,y1,x2,y2 = clamp(d.left(),d.top(),d.right(),d.bottom(),w,h)
            face = frame[y1:y2, x1:x2]

            face_ratio = (x2-x1)/w

            # ------------------------------
            # TOO FAR CHECK
            # ------------------------------
            if face_ratio < MIN_FACE_RATIO:
                cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,255),2)
                cv2.putText(frame,"Please move closer",
                            (x1,y1-10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7,(0,255,255),2)
                continue

            # ------------------------------
            # ANTI-SPOOF
            # ------------------------------
            cnn_score = float(is_real_face_raw(face))
            if cnn_score < REAL_THRESH:
                cv2.rectangle(frame,(x1,y1),(x2,y2),(0,0,255),2)
                cv2.putText(frame,"SPOOF",
                            (x1,y1-10),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7,(0,0,255),2)
                continue

            # ------------------------------
            # FACE RECOGNITION
            # ------------------------------
            emb = embed(frame,(x1,y1,x2,y2))
            probs = clf.predict_proba([emb])[0]

            idx = int(np.argmax(probs))
            raw_conf = float(probs[idx])

            # Smooth confidence
            if idx not in confidence_buffers:
                confidence_buffers[idx] = deque(maxlen=CONF_HISTORY)

            confidence_buffers[idx].append(raw_conf)
            smooth_conf = np.mean(confidence_buffers[idx])
            accuracy = smooth_conf * 100

            student_name = encoder.inverse_transform([idx])[0]

            # ------------------------------
            # ACCURACY GATE (NEW)
            # ------------------------------
            if smooth_conf < MIN_ACCURACY:
                cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,255),2)
                cv2.putText(
                    frame,
                    "Please move closer",
                    (x1,y1-10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0,255,255),
                    2
                )
                continue

            # ------------------------------
            # ATTENDANCE
            # ------------------------------
            if student_name not in attendance_marked:
                attendance_marked.add(student_name)
                timestamp = now_str()

                print(
                    f"{timestamp} - {student_name} marked present "
                    f"({accuracy:.1f}% Accuracy)"
                )

                cv2.putText(
                    frame,
                    f"{student_name} marked present",
                    (10, 80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.75,
                    (0,255,0),
                    2
                )

            # Draw success
            cv2.rectangle(frame,(x1,y1),(x2,y2),(0,255,0),2)
            cv2.putText(
                frame,
                f"{student_name} ({accuracy:.1f}%)",
                (x1,y1-10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0,255,0),
                2
            )

        cv2.imshow("Live Face Attendance", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
