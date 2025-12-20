# add_student.py (Improved Smart Capture)
import cv2
import os
import time
import numpy as np

DATASET_DIR = "dataset"
CAPTURE_COUNT = 50
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

# === CAPTURE PHASES ===
CAPTURE_GUIDE = [
    "Look straight at the camera",
    "Turn head slightly LEFT",
    "Turn head slightly RIGHT",
    "Look UP slightly",
    "Look DOWN slightly",
    "Give a small smile"
]

PHASE_IMAGES = int(CAPTURE_COUNT / len(CAPTURE_GUIDE))  # ~8 images per phase


# === INPUT ===
student_id = input("Enter student folder name (e.g., 8220967_Name): ").strip()
out_dir = os.path.join(DATASET_DIR, student_id)
os.makedirs(out_dir, exist_ok=True)

# === FACE DETECTOR ===
face_detector = cv2.CascadeClassifier(CASCADE_PATH)
cap = cv2.VideoCapture(0)

print("\n Starting camera... Follow the instructions.\n")

count = 0
phase = 0
last_save = time.time()

def is_blurry(image, threshold=70):
    """Detect blur using Laplacian variance."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur_val = cv2.Laplacian(gray, cv2.CV_64F).var()
    return blur_val < threshold

def augment_lighting(img):
    """Apply mild random brightness/contrast augmentation."""
    alpha = 1.0 + (np.random.rand() - 0.5) * 0.3  # contrast
    beta = (np.random.rand() - 0.5) * 40         # brightness
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

while True:
    ret, frame = cap.read()
    if not ret:
        print(" Camera error.")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, 1.2, 5, minSize=(120,120))

    # Display instructions
    instruction = CAPTURE_GUIDE[phase]
    cv2.putText(frame, f"Step {phase+1}/{len(CAPTURE_GUIDE)}:",
                (10,30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,255),2)
    cv2.putText(frame, instruction,
                (10,70), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,255),2)


    for (x,y,w,h) in faces:
        cv2.rectangle(frame,(x,y),(x+w,y+h),(0,255,0),2)
        face_img = frame[y:y+h, x:x+w]

        if is_blurry(face_img):
            cv2.putText(frame, "Keep still - face is blurry!", (10,110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)
            continue

        # Time-based auto capture to prevent duplicates
        if time.time() - last_save >= 1.0:
            # apply random lighting variation
            face_aug = augment_lighting(face_img)

            fname = f"img_{count+1:03d}.jpg"
            cv2.imwrite(os.path.join(out_dir, fname), face_aug)
            count += 1
            last_save = time.time()

            print(f"Captured {fname} ({instruction})")

            if count % PHASE_IMAGES == 0:
                phase += 1
                if phase >= len(CAPTURE_GUIDE):
                    print("\n🎉 Capture complete!")
                    cap.release()
                    cv2.destroyAllWindows()
                    print("Saved to:", out_dir)
                    print("Now run: python train_embeddings.py")
                    exit()

    # Display progress
    cv2.putText(frame, f"Images: {count}/{CAPTURE_COUNT}", (10,150),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255,255,0), 2)

    cv2.imshow("Smart Face Capture", frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
print(" Capture cancelled.")
