# calibration_capture.py
import cv2
import os
import time

OUT_DIR = "calibration_samples"
os.makedirs(OUT_DIR, exist_ok=True)

CAPTURE_COUNT = 15
DELAY = 1.0

cap = cv2.VideoCapture(0)
count = 0
last_time = 0

print("\n=== REAL FACE CALIBRATION ===")
print("Look at the camera normally.")
print("The system will capture 15 images of your REAL face.\n")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Camera error.")
        break

    cv2.imshow("Calibration Capture", frame)

    if time.time() - last_time > DELAY:
        fname = f"{OUT_DIR}/real_{count+1}.jpg"
        cv2.imwrite(fname, frame)
        print(f"[✓] Captured {fname}")
        count += 1
        last_time = time.time()

    if count >= CAPTURE_COUNT:
        print("\n[✓] Finished capturing calibration images.")
        break

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
