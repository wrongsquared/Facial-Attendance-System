#create_casia_dataset
import os
import cv2

SRC = r"archive/test_img/test_img/color"   # <-- adjust if needed
OUT = "antispoof_dataset"

REAL = os.path.join(OUT, "real")
SPOOF = os.path.join(OUT, "spoof")

os.makedirs(REAL, exist_ok=True)
os.makedirs(SPOOF, exist_ok=True)

count = 0

print("Scanning CASIA directory:", SRC)

for fname in os.listdir(SRC):
    src_path = os.path.join(SRC, fname)

    # Only process actual files
    if not os.path.isfile(src_path):
        continue

    # Determine label via filename
    low = fname.lower()
    if "real" in low:
        out_path = os.path.join(REAL, f"{count}.jpg")
    elif "fake" in low:
        out_path = os.path.join(SPOOF, f"{count}.jpg")
    else:
        continue

    img = cv2.imread(src_path)
    if img is None:
        continue

    cv2.imwrite(out_path, img)
    count += 1

print(f"\n🎉 CASIA Dataset created!")
print(f"Real images:  {len(os.listdir(REAL))}")
print(f"Spoof images: {len(os.listdir(SPOOF))}")
print(f"Output folder: {OUT}")
