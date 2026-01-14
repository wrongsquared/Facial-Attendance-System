# extract_frames.py
import cv2
import os
import shutil

SRC = "kaggle_dataset"  # root folder containing the 5 folders
OUT = "antispoof_dataset"

REAL_DIR = os.path.join(OUT, "real")
SPOOF_DIR = os.path.join(OUT, "spoof")

os.makedirs(REAL_DIR, exist_ok=True)
os.makedirs(SPOOF_DIR, exist_ok=True)

FRAME_EVERY = 10   # extract 1 frame every N frames (safe for CPU)
MAX_FRAMES = 120   # per video

REAL_FOLDERS = ["live_video"]
SPOOF_FOLDERS = ["printouts", "cut-out printouts", "replay"]

def extract_video(video_path, out_dir, prefix):
    cap = cv2.VideoCapture(video_path)
    count = 0
    saved = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if count % FRAME_EVERY == 0:
            fname = f"{prefix}_{saved:04d}.jpg"
            cv2.imwrite(os.path.join(out_dir, fname), frame)
            saved += 1
            if saved >= MAX_FRAMES:
                break

        count += 1

    cap.release()

# -------- REAL VIDEOS --------
for folder in REAL_FOLDERS:
    path = os.path.join(SRC, folder)
    for f in os.listdir(path):
        if f.lower().endswith(".mp4"):
            print("Extracting REAL:", f)
            extract_video(os.path.join(path, f), REAL_DIR, f.replace(".mp4",""))

# -------- SPOOF VIDEOS --------
for folder in SPOOF_FOLDERS:
    path = os.path.join(SRC, folder)
    for f in os.listdir(path):
        if f.lower().endswith(".mp4"):
            print("Extracting SPOOF:", f)
            extract_video(os.path.join(path, f), SPOOF_DIR, f.replace(".mp4",""))

# -------- SELFIE PHOTOS --------
selfie_dir = os.path.join(SRC, "live_selfie")
if os.path.exists(selfie_dir):
    for f in os.listdir(selfie_dir):
        if f.lower().endswith((".jpg",".png",".jpeg")):
            shutil.copy(os.path.join(selfie_dir,f), REAL_DIR)

print("✅ Frame extraction complete")
print("Real:", len(os.listdir(REAL_DIR)))
print("Spoof:", len(os.listdir(SPOOF_DIR)))
