# add_student.py
import cv2
import os
import time

# === SETTINGS ===
DATASET_DIR = "dataset"
CAPTURE_COUNT = 10          # number of images to capture
CAPTURE_DELAY = 1.5         # seconds between captures
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

# === ASK FOR STUDENT INFO ===
student_id = input("Enter student folder name (e.g., 8220967_Name): ").strip()
out_dir = os.path.join(DATASET_DIR, student_id)
os.makedirs(out_dir, exist_ok=True)

# === LOAD FACE DETECTOR ===
face_detector = cv2.CascadeClassifier(CASCADE_PATH)
cap = cv2.VideoCapture(0)

print("📸 Starting camera... Please face the webcam.")
print("System will auto-capture faces once detected.")

count = 0
last_capture_time = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Camera not detected. Exiting...")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(100, 100))

    for (x, y, w, h) in faces:
        # Draw a rectangle around the face
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

        # Auto capture every few seconds
        if time.time() - last_capture_time >= CAPTURE_DELAY:
            face_img = frame[y:y+h, x:x+w]
            img_name = f"img_{count+1}.jpg"
            img_path = os.path.join(out_dir, img_name)
            cv2.imwrite(img_path, face_img)
            count += 1
            last_capture_time = time.time()
            print(f"✅ Captured {img_name}")

    # Display progress
    cv2.putText(frame, f"Captured: {count}/{CAPTURE_COUNT}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
    cv2.imshow("Auto Face Capture", frame)

    # Stop after reaching target count or press 'q' to exit
    if count >= CAPTURE_COUNT:
        print(f"✅ Finished capturing {CAPTURE_COUNT} images for {student_id}.")
        break
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("❌ Capture cancelled by user.")
        break

cap.release()
cv2.destroyAllWindows()
print(f"All images saved in: {out_dir}")
print("Now run: python train_embeddings.py to update encodings.")
