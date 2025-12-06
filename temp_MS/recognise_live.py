import cv2
import pickle
import numpy as np
import face_recognition
from antispoof import is_real_face

EMB_FILE = "encodings.pkl"
CLS_FILE = "classifier.pkl"
LBL_FILE = "labels.pkl"

PROBA_THRESHOLD = 0.55     # stricter = fewer false positives
ANTI_SPOOF_ENFORCED = True

def load_models():
    print("Loading face embeddings (for consistency)...")
    with open(EMB_FILE, "rb") as f:
        emb_data = pickle.load(f)

    print("Loading classifier...")
    with open(CLS_FILE, "rb") as f:
        classifier = pickle.load(f)

    print("Loading label encoder...")
    with open(LBL_FILE, "rb") as f:
        label_encoder = pickle.load(f)

    return classifier, label_encoder

def main():
    classifier, encoder = load_models()
    cap = cv2.VideoCapture(0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        rgb = frame[:, :, ::-1]
        face_locs = face_recognition.face_locations(rgb)
        face_encs = face_recognition.face_encodings(rgb, face_locs)

        for (top, right, bottom, left), face_emb in zip(face_locs, face_encs):

            # Anti-Spoof Check
            crop = frame[top:bottom, left:right]
            is_real, score = is_real_face(crop)

            if ANTI_SPOOF_ENFORCED and not is_real:
                cv2.rectangle(frame, (left, top), (right, bottom), (0,0,255), 2)
                cv2.putText(frame, f"SPOOF ({score:.2f})",
                            (left, top - 10), 0, 0.6, (0,0,255), 2)
                continue

            # Classification
            proba = classifier.predict_proba([face_emb])[0]
            max_p = np.max(proba)
            label_idx = np.argmax(proba)

            if max_p < PROBA_THRESHOLD:
                label = "Unknown"
                color = (0, 165, 255)
            else:
                label = encoder.inverse_transform([label_idx])[0]
                color = (0, 255, 0)

            # Draw result
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.putText(frame, f"{label} ({max_p:.2f})",
                        (left, top - 10), 0, 0.6, color, 2)

        cv2.imshow("Live Recognition + Classifier + AntiSpoof", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
