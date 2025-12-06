# train_embeddings.py
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
        folder = os.path.join(DATASET_DIR, student)
        if not os.path.isdir(folder):
            continue

        for img_name in os.listdir(folder):
            if not img_name.lower().endswith((".jpg",".png",".jpeg")):
                continue

            img_path = os.path.join(folder, img_name)
            img = face_recognition.load_image_file(img_path)
            encs = face_recognition.face_encodings(img)

            if len(encs) > 0:
                embeddings.append(encs[0])
                names.append(student)
                print("Encoded:", student, img_name)

    data = {"names": names, "embeddings": np.array(embeddings)}

    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump(data, f)

    print("Saved encodings to", EMBEDDINGS_FILE)

if __name__ == "__main__":
    main()
