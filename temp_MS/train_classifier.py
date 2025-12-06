# train_classifier.py
import pickle
import numpy as np
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

EMB_FILE = "encodings.pkl"
CLS_FILE = "classifier.pkl"
LBL_FILE = "labels.pkl"

def main():
    print("📥 Loading embeddings...")
    with open(EMB_FILE, "rb") as f:
        data = pickle.load(f)

    names = np.array(data["names"])
    embeddings = np.array(data["embeddings"])

    print("Total embeddings:", len(embeddings))
    print("Unique students:", len(set(names)))

    print("📌 Encoding labels...")
    encoder = LabelEncoder()
    y = encoder.fit_transform(names)
    
    X_train, X_test, y_train, y_test = train_test_split(
        embeddings, y, test_size=0.2, stratify=y, random_state=42
    )

    print("🔧 Training SVM classifier...")
    clf = SVC(kernel="linear", probability=True)
    clf.fit(X_train, y_train)

    print("🧪 Evaluating...")
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print("Classifier Accuracy:", acc)

    print("💾 Saving classifier...")
    with open(CLS_FILE, "wb") as f:
        pickle.dump(clf, f)

    with open(LBL_FILE, "wb") as f:
        pickle.dump(encoder, f)

    print("🎉 Training complete!")
    print("Saved:", CLS_FILE, "and", LBL_FILE)

if __name__ == "__main__":
    main()
