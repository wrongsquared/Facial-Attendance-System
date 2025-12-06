import os
import shutil

# === CHANGE THESE PATHS ===
TRAIN_DIR = r"C:\Users\syrfd\OneDrive\Desktop\CSIT321 - FYP\FaceRecognitionTest\CelebA_Spoof\Data\train"
TEST_DIR = r"C:\Users\syrfd\OneDrive\Desktop\CSIT321 - FYP\FaceRecognitionTest\CelebA_Spoof\Data\test"

OUTPUT_DIR = "antispoof_dataset"

REAL_OUT = os.path.join(OUTPUT_DIR, "real")
SPOOF_OUT = os.path.join(OUTPUT_DIR, "spoof")

# Create output folders
os.makedirs(REAL_OUT, exist_ok=True)
os.makedirs(SPOOF_OUT, exist_ok=True)

def copy_images(src_dir, dst_dir):
    """Copy images from src_dir to dst_dir."""
    for img in os.listdir(src_dir):
        if img.lower().endswith((".jpg", ".jpeg", ".png")):
            shutil.copy(
                os.path.join(src_dir, img),
                os.path.join(dst_dir, img)
            )

def process_split(split_dir):
    """Process train/test directory recursively."""
    for folder in os.listdir(split_dir):
        folder_path = os.path.join(split_dir, folder)
        if not os.path.isdir(folder_path):
            continue

        live_dir = os.path.join(folder_path, "live")
        spoof_dir = os.path.join(folder_path, "spoof")

        if os.path.exists(live_dir):
            copy_images(live_dir, REAL_OUT)

        if os.path.exists(spoof_dir):
            copy_images(spoof_dir, SPOOF_OUT)

        print(f"Processed folder: {folder}")

print("📥 Processing TRAIN dataset...")
process_split(TRAIN_DIR)

print("📥 Processing TEST dataset...")
process_split(TEST_DIR)

print("\n🎉 Dataset prepared successfully!")
print("📁 Output structure:")
print("antispoof_dataset/")
print("   real/   → all LIVE images")
print("   spoof/  → all SPOOF images")
