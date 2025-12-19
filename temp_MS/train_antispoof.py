# train_antispoof.py
import os, glob
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from sklearn.model_selection import train_test_split
from tqdm import tqdm
import antispoof_model
from antispoof_model import AntiSpoofModel
import inspect
print("Loaded from:", antispoof_model.__file__)
print("Has AntiSpoofModel?", hasattr(antispoof_model, "AntiSpoofModel"))
print(inspect.getsource(antispoof_model))



DATA_DIR = "antispoof_dataset"
BATCH = 32
EPOCHS = 10
LR = 1e-4
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

transform = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.3,0.3,0.3,0.1),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])

class SpoofDataset(Dataset):
    def __init__(self, files, labels):
        self.files = files
        self.labels = labels

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        img = Image.open(self.files[idx]).convert("RGB")
        return transform(img), self.labels[idx]

real_files = glob.glob(os.path.join(DATA_DIR, "real", "*.*"))
spoof_files = glob.glob(os.path.join(DATA_DIR, "spoof", "*.*"))

files = real_files + spoof_files
labels = [1]*len(real_files) + [0]*len(spoof_files)

train_f, val_f, train_l, val_l = train_test_split(
    files, labels, test_size=0.2, stratify=labels, random_state=42
)

train_ds = SpoofDataset(train_f, train_l)
val_ds = SpoofDataset(val_f, val_l)

train_loader = DataLoader(train_ds, BATCH, shuffle=True)
val_loader = DataLoader(val_ds, BATCH)

model = AntiSpoofModel(pretrained=True).to(DEVICE)
loss_fn = nn.CrossEntropyLoss()
opt = torch.optim.Adam(model.parameters(), lr=LR)

best_acc = 0

for epoch in range(EPOCHS):
    model.train()
    total_loss = 0

    for img, label in tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS}"):
        img, label = img.to(DEVICE), label.to(DEVICE)
        opt.zero_grad()
        out = model(img)
        loss = loss_fn(out, label)
        loss.backward()
        opt.step()
        total_loss += loss.item()

    # validation
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for img, label in val_loader:
            img, label = img.to(DEVICE), label.to(DEVICE)
            preds = model(img).argmax(1)
            correct += (preds == label).sum().item()
            total += label.size(0)

    acc = correct / total
    print(f"Validation Accuracy: {acc:.4f}")

    if acc > best_acc:
        best_acc = acc
        torch.save(model.state_dict(), "antispoof_best.pth")
        print("Saved best model")

print("Training finished — Best accuracy:", best_acc)
