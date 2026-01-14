import os, glob, cv2, random
import numpy as np
from PIL import Image
from tqdm import tqdm
from sklearn.model_selection import train_test_split

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights

DATA_DIR = "antispoof_dataset"
EPOCHS = 6          # FAST TRAINING
BATCH = 16
LR = 1e-4
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# -------------------------
# AGGRESSIVE WEBCAM AUGMENTATION
# -------------------------
train_tf = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ColorJitter(0.4,0.4,0.4,0.2),
    transforms.RandomApply([transforms.GaussianBlur(5)], p=0.4),
    transforms.RandomApply([transforms.RandomRotation(15)], p=0.5),
    transforms.RandomApply([transforms.RandomAutocontrast()], p=0.3),
    transforms.RandomApply([transforms.RandomAdjustSharpness(0.5)], p=0.3),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
])

val_tf = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.ToTensor(),
])

class ASD(Dataset):
    def __init__(self, files, labels, aug):
        self.files = files
        self.labels = labels
        self.aug = aug

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        img = Image.open(self.files[idx]).convert("RGB")
        img = self.aug(img)
        return img, self.labels[idx]

# Load dataset
real = glob.glob(f"{DATA_DIR}/real/*")
spoof = glob.glob(f"{DATA_DIR}/spoof/*")
X = real + spoof
y = [1]*len(real) + [0]*len(spoof)

Xtr, Xv, ytr, yv = train_test_split(X, y, test_size=0.2, stratify=y)

train_ds = ASD(Xtr, ytr, train_tf)
val_ds   = ASD(Xv, yv, val_tf)

train_loader = DataLoader(train_ds, batch_size=BATCH, shuffle=True)
val_loader   = DataLoader(val_ds, batch_size=BATCH, shuffle=False)

# Model
weights = EfficientNet_B0_Weights.IMAGENET1K_V1
model = efficientnet_b0(weights=weights)
model.classifier[1] = nn.Linear(1280, 2)
model = model.to(DEVICE)

criterion = nn.CrossEntropyLoss()
opt = optim.Adam(model.parameters(), lr=LR)

best = 0

print("Starting FAST training...")

for e in range(1, EPOCHS+1):
    model.train()
    for img, label in tqdm(train_loader):
        img, label = img.to(DEVICE), label.to(DEVICE)

        opt.zero_grad()
        out = model(img)
        loss = criterion(out, label)
        loss.backward()
        opt.step()

    # Validate
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for img, label in val_loader:
            img, label = img.to(DEVICE), label.to(DEVICE)
            pred = out = model(img).argmax(1)
            correct += (pred == label).sum().item()
            total += len(label)

    acc = correct/total
    print(f"Epoch {e} acc = {acc:.4f}")

    if acc > best:
        best = acc
        torch.save(model.state_dict(), "fast_antispoof.pth")
        print("Saved best model → fast_antispoof.pth")

print("Training done. Best:", best)
