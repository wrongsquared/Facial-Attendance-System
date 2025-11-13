import os
import pickle
import numpy as np
import face_recognition

DATASET_DIR = "dataset"
EMBEDDINGS_FILE = "encodings.pkl"

def main():
    names = []
    embeddings = []

    for student in os.listdir(DATASET_DIR):
        student_dir = os.path.join(DATASET_DIR, student)
        if not os.path.isdir(student_dir):
            continue

        print(f"📂 Processing folder: {student}")

        for img_name in os.listdir(student_dir):
            if img_name.lower().endswith((".jpg", ".jpeg", ".png")):
                img_path = os.path.join(student_dir, img_name)
                img = face_recognition.load_image_file(img_path)
                encodings = face_recognition.face_encodings(img)

                if len(encodings) > 0:
                    embeddings.append(encodings[0])
                    names.append(student)
                    print(f"Encoded: {student}/{img_name}")
                else:
                    print(f"⚠️ No face found in {student}/{img_name}")


    data = {"names": names, "embeddings": np.array(embeddings)}
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump(data, f)

    print("✅ Saved encodings to", EMBEDDINGS_FILE)

if __name__ == "__main__":
    main()
