# train_embeddings.py (dlib aligned face chips)
import os
import pickle
import numpy as np
import cv2
import dlib

DATASET_DIR = "dataset"
EMBEDDINGS_FILE = "encodings.pkl"

SHAPE_PREDICTOR_PATH = "shape_predictor_5_face_landmarks.dat"
DLIB_REC_MODEL_PATH = "dlib_face_recognition_resnet_model_v1.dat"

# Chip settings
CHIP_SIZE = 150          # 150 is common for dlib face embeddings
PADDING = 0.25           # more padding helps with glasses / hairline

def iter_images(folder):
    for img_name in os.listdir(folder):
        if img_name.lower().endswith((".jpg", ".jpeg", ".png")):
            yield img_name, os.path.join(folder, img_name)

def largest_face(rects):
    return max(rects, key=lambda r: (r.right() - r.left()) * (r.bottom() - r.top()))

def main():
    print("Loading dlib models...")
    detector = dlib.get_frontal_face_detector()
    sp = dlib.shape_predictor(SHAPE_PREDICTOR_PATH)
    facerec = dlib.face_recognition_model_v1(DLIB_REC_MODEL_PATH)

    names = []
    embeddings = []

    if not os.path.isdir(DATASET_DIR):
        print(f"❌ DATASET_DIR not found: {DATASET_DIR}")
        return

    for student_folder in sorted(os.listdir(DATASET_DIR)):
        folder_path = os.path.join(DATASET_DIR, student_folder)
        if not os.path.isdir(folder_path):
            continue

        print(f"\n== Student: {student_folder} ==")

        for img_name, img_path in iter_images(folder_path):
            bgr = cv2.imread(img_path)
            if bgr is None:
                print(f"⚠️ Skipped unreadable: {img_path}")
                continue

            rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

            # Detect faces (dlib works best on RGB)
            rects = detector(rgb, 1)
            if len(rects) == 0:
                print(f"⚠️ No face: {student_folder}/{img_name}")
                continue

            # Use largest face if multiple detected
            rect = largest_face(rects)

            # Align to chip
            shape = sp(rgb, rect)
            try:
                chip = dlib.get_face_chip(rgb, shape, size=CHIP_SIZE, padding=PADDING)
            except Exception as e:
                print(f"⚠️ Chip failed: {student_folder}/{img_name} ({e})")
                continue

            # Compute embedding
            # jitter=1 is faster; increase to 2–3 if you want slightly better but slower embeddings
            emb = np.array(facerec.compute_face_descriptor(chip, num_jitters=1), dtype=np.float32)

            embeddings.append(emb)
            names.append(student_folder)

            print(f"✅ Encoded: {student_folder}/{img_name}")

    if len(embeddings) == 0:
        print("\n❌ No embeddings created. Check your dataset images.")
        return

    data = {"names": names, "embeddings": np.vstack(embeddings)}
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump(data, f)

    print(f"\n🎉 Saved {len(embeddings)} embeddings to {EMBEDDINGS_FILE}")

if __name__ == "__main__":
    main()
