import cv2
import pickle
import numpy as np
import face_recognition
from scipy.spatial.distance import cosine

EMBEDDINGS_FILE = "encodings.pkl"
RECOGNITION_THRESHOLD = 0.40  # lower = more strict

def load_embeddings():
    with open(EMBEDDINGS_FILE, "rb") as f:
        data = pickle.load(f)
    return data["names"], data["embeddings"]

def find_best_match(query_emb, known_embs, known_names):
    best_dist = 1.0
    best_name = "Unknown"
    for name, emb in zip(known_names, known_embs):
        d = cosine(query_emb, emb)
        if d < best_dist:
            best_dist = d
            best_name = name
    return best_name, best_dist

def main():
    known_names, known_embs = load_embeddings()

    cap = cv2.VideoCapture(0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb)
        face_encodings = face_recognition.face_encodings(rgb, face_locations)

        for (top, right, bottom, left), enc in zip(face_locations, face_encodings):
            name, dist = find_best_match(enc, known_embs, known_names)

            if dist < RECOGNITION_THRESHOLD:
                label = f"{name} ({dist:.2f})"
            else:
                label = "Unknown"

            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.putText(frame, label, (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0),2)

        cv2.imshow("Face Recognition", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
