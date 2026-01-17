# extract_replay_only.py
import cv2
import os

VIDEO_DIR = "kaggle_dataset/replay"
OUT_DIR = "antispoof_dataset/spoof"

FPS_TARGET = 4          # replay needs denser sampling
SKIP_FIRST_SEC = 2      # skip intro
MAX_FRAMES = 400        # per video

os.makedirs(OUT_DIR, exist_ok=True)

def extract(video_path, prefix):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Cannot open:", video_path)
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    step = max(1, int(fps // FPS_TARGET))

    frame_idx = 0
    saved = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx < SKIP_FIRST_SEC * fps:
            frame_idx += 1
            continue

        if frame_idx % step == 0:
            fname = f"replay_{prefix}_{saved:04d}.jpg"
            cv2.imwrite(os.path.join(OUT_DIR, fname), frame)
            saved += 1
            if saved >= MAX_FRAMES:
                break

        frame_idx += 1

    cap.release()
    print(f" {saved} replay frames from {prefix}")

for vid in os.listdir(VIDEO_DIR):
    if vid.lower().endswith(".mp4"):
        extract(os.path.join(VIDEO_DIR, vid), vid.replace(".mp4",""))
