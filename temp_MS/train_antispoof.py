# train_antispoof.py
import os
import random
import cv2
import torch
import numpy as np
from torch import nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models
from sklearn.model_selection import train_test_split
from tqdm import tqdm

# ------------------------
# CONFIG
# ------------------------
DATASET = "antispoof_dataset"
IMG_SIZE = 112
BATCH = 16
EPOCHS = 20
LR = 1e-4
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Replay bias (important)
REPLAY_WEIGHT = 1.8
LABEL_SMOOTH = 0.1

# ------------------------
# DATASET
# ------------------------
class AntiSpoofDataset(Dataset):
    def __init__(self, paths, labels, train=True):
        self.paths = paths
        self.labels = labels
        self.train = train

    def replay_aug(self, img):
        if random.random() < 0.7:
            k = random.choice([3,5])
            img = cv2.GaussianBlur(img, (k,k), 0)

        if random.random() < 0.7:
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), random.randint(30, 70)]
            _, enc = cv2.imencode(".jpg", img, encode_param)
            img = cv2.imdecode(enc, 1)

        if random.random() < 0.5:
            h, w = img.shape[:2]
            scale = random.uniform(0.85, 1.15)
            img = cv2.resize(img, (int(w*scale), int(h*scale)))
            img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))

        return img

    def __getitem__(self, idx):
        img = cv2.imread(self.paths[idx])
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))

        label = self.labels[idx]

        if self.train and label == 1:  # spoof
            img = self.replay_aug(img)

        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2,0,1))

        return torch.tensor(img), torch.tensor(label)

    def __len__(self):
        return len(self.paths)

# ------------------------
# LOAD DATA
# ------------------------
real = [os.path.join(DATASET, "real", f) for f in os.listdir(f"{DATASET}/real")]
spoof = [os.path.join(DATASET, "spoof", f) for f in os.listdir(f"{DATASET}/spoof")]

print("Real:", len(real))
print("Spoof:", len(spoof))

# Balance but keep more spoof
spoof = random.sample(spoof, min(len(spoof), int(len(real) * 1.2)))

paths = real + spoof
labels = [0]*len(real) + [1]*len(spoof)

Xtr, Xva, ytr, yva = train_test_split(paths, labels, test_size=0.2, stratify=labels)

train_ds = AntiSpoofDataset(Xtr, ytr, train=True)
val_ds   = AntiSpoofDataset(Xva, yva, train=False)

train_dl = DataLoader(train_ds, batch_size=BATCH, shuffle=True)
val_dl   = DataLoader(val_ds, batch_size=BATCH)

# ------------------------
# MODEL
# ------------------------
model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
model.classifier[1] = nn.Linear(1280, 2)
model.to(DEVICE)

# Replay-weighted loss
class_weights = torch.tensor([1.0, REPLAY_WEIGHT]).to(DEVICE)
criterion = nn.CrossEntropyLoss(weight=class_weights, label_smoothing=LABEL_SMOOTH)
optimizer = torch.optim.Adam(model.parameters(), lr=LR)

# ------------------------
# TRAIN
# ------------------------
best = 0.0
patience = 4
wait = 0

for epoch in range(EPOCHS):
    model.train()
    loop = tqdm(train_dl, desc=f"Epoch {epoch+1}/{EPOCHS}")
    for x,y in loop:
        x,y = x.to(DEVICE), y.to(DEVICE)
        optimizer.zero_grad()
        loss = criterion(model(x), y)
        loss.backward()
        optimizer.step()

    model.eval()
    correct = total = 0
    with torch.no_grad():
        for x,y in val_dl:
            x,y = x.to(DEVICE), y.to(DEVICE)
            p = model(x).argmax(1)
            correct += (p==y).sum().item()
            total += y.size(0)

    acc = correct/total
    print(f"Val acc: {acc:.4f}")

    if acc > best:
        best = acc
        wait = 0
        torch.save(model.state_dict(), "antispoof_best.pth")
        print("✅ Saved best model")
    else:
        wait += 1
        if wait >= patience:
            print("⏹ Early stopping")
            break

print("Training done. Best acc:", best)
