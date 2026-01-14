# calibration_compute_threshold.py
import cv2
import glob
import json
from antispoof import is_real_face

CALIB_DIR = "calibration_samples"

print("\n=== STARTING CALIBRATION ===")
files = glob.glob(f"{CALIB_DIR}/*.jpg")

if len(files) == 0:
    print("❌ No calibration images found. Run calibration_capture.py first.")
    exit()

scores = []

for f in files:
    img = cv2.imread(f)
    live, prob = is_real_face(img)
    scores.append(prob)
    print(f"{f}: probability = {prob:.4f}")

avg_score = sum(scores) / len(scores)
new_threshold = avg_score * 0.75  # 75% of your real avg score

print("\n=== CALIBRATION RESULTS ===")
print(f"Average real-face score: {avg_score:.4f}")
print(f"Suggested threshold: {new_threshold:.4f}")

# Save threshold
data = {"threshold": new_threshold}

with open("antispoof_threshold.json", "w") as f:
    json.dump(data, f, indent=4)

print("\n[✓] Saved calibrated threshold to antispoof_threshold.json")
