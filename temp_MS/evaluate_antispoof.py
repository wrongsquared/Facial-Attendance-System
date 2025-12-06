# evaluate_antispoof.py
import glob
import numpy as np
import cv2
from antispoof import is_real_face
from sklearn.metrics import confusion_matrix, roc_auc_score

DATASET = "antispoof_dataset"

real_files = glob.glob(f"{DATASET}/real/*.*")
spoof_files = glob.glob(f"{DATASET}/spoof/*.*")

y_true = []
y_scores = []

for f in real_files:
    img = cv2.imread(f)
    real, s = is_real_face(img)
    y_true.append(1)
    y_scores.append(s)

for f in spoof_files:
    img = cv2.imread(f)
    real, s = is_real_face(img)
    y_true.append(0)
    y_scores.append(s)

preds = [1 if s >= 0.5 else 0 for s in y_scores]

print("Confusion Matrix:")
print(confusion_matrix(y_true, preds))
print("AUC:", roc_auc_score(y_true, y_scores))
