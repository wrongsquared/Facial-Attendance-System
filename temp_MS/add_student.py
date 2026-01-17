import cv2
import os
import time
import numpy as np

DATASET_DIR = "dataset"
CAPTURE_COUNT = 200
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

# Phases include FAR distance explicitly
CAPTURE_GUIDE = [
    ("CLOSE: Look straight", 30),
    ("CLOSE: Turn slightly LEFT", 20),
    ("CLOSE: Turn slightly RIGHT", 20),
    ("MEDIUM: Look straight", 30),
    ("MEDIUM: Look UP slightly", 20),
    ("MEDIUM: Look DOWN slightly", 20),
    ("FAR: Look straight (step back)", 30),
    ("FAR: Small head turns (left/right)", 30),
]

# sanity: should sum to 200
assert sum(n for _, n in CAPTURE_GUIDE) == CAPTURE_COUNT

# === INPUT ===
student_id = input("Enter student folder name (e.g., 8220967_Din): ").strip()
out_dir = os.path.join(DATASET_DIR, student_id)
os.makedirs(out_dir, exist_ok=True)

# === FACE DETECTOR ===
face_detector = cv2.CascadeClassifier(CASCADE_PATH)
cap = cv2.VideoCapture(0)

# Force higher capture resolution (helps even during enrolment)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)

print("\n📸 Starting camera... Follow the instructions.\n")
print("Tip: FAR phases are the most important to fix your 70% issue.\n")

count = 0
phase_idx = 0
phase_done = 0
last_save = time.time()

def is_blurry(image, threshold=70):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_val = cv2.Laplacian(gray, cv2.CV_64F).var()
    return blur_val < threshold

def augment_quality(img):
    """
    Add webcam-like noise/blur/compression-ish artifacts.
    This helps recognition generalize instead of only "perfect" enrolment frames.
    """
    out = img.copy()

    # random brightness/contrast
    alpha = 1.0 + (np.random.rand() - 0.5) * 0.25
    beta = (np.random.rand() - 0.5) * 30
    out = cv2.convertScaleAbs(out, alpha=alpha, beta=beta)

    # random slight blur
    if np.random.rand() < 0.35:
        k = np.random.choice([3, 5])
        out = cv2.GaussianBlur(out, (k, k), 0)

    # random noise
    if np.random.rand() < 0.35:
        noise = np.random.normal(0, 8, out.shape).astype(np.float32)
        out = np.clip(out.astype(np.float32) + noise, 0, 255).astype(np.uint8)

    return out

def current_phase():
    return CAPTURE_GUIDE[phase_idx]

while True:
    ret, frame = cap.read()
    if not ret:
        print(" Camera error.")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, 1.2, 5, minSize=(120, 120))

    instruction, need = current_phase()

    cv2.putText(frame, f"Phase {phase_idx+1}/{len(CAPTURE_GUIDE)}",
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 255, 255), 2)
    cv2.putText(frame, instruction,
                (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 255, 255), 2)
    cv2.putText(frame, f"Captured: {count}/{CAPTURE_COUNT} (phase: {phase_done}/{need})",
                (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 0), 2)

    # Use largest face if multiple
    if len(faces) > 0:
        faces = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)
        (x, y, w, h) = faces[0]
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

        face_img = frame[y:y+h, x:x+w]
        if face_img.size > 0 and not is_blurry(face_img):

            # time-based capture
            if time.time() - last_save >= 0.35:  # faster capture
                face_aug = augment_quality(face_img)

                fname = f"img_{count+1:04d}.jpg"
                cv2.imwrite(os.path.join(out_dir, fname), face_aug)

                count += 1
                phase_done += 1
                last_save = time.time()

                print(f"Captured {fname} ({instruction})")

                # move to next phase
                if phase_done >= need:
                    phase_idx += 1
                    phase_done = 0
                    if phase_idx >= len(CAPTURE_GUIDE):
                        print("\n🎉 Capture complete!")
                        break

        else:
            cv2.putText(frame, "Keep still - face blurry!", (10, 145),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 0, 255), 2)

    cv2.imshow("Enrolment Capture (200 images)", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        print(" Capture cancelled.")
        break

cap.release()
cv2.destroyAllWindows()

if count >= CAPTURE_COUNT:
    print("Saved to:", out_dir)
    print("Next steps:")
    print("  1) python train_embeddings.py")
    print("  2) python train_classifier.py")
