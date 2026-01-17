#debug_casia.py
import os

BASE = r"archive/test_img/test_img"

print("Folders inside:", BASE)
print(os.listdir(BASE))

COLOR_DIR = os.path.join(BASE, "color")
DEPTH_DIR = os.path.join(BASE, "depth")

print("\nCOLOR exists?", os.path.exists(COLOR_DIR))
print("DEPTH exists?", os.path.exists(DEPTH_DIR))

print("\nCOLOR content:")
if os.path.exists(COLOR_DIR):
    for f in os.listdir(COLOR_DIR):
        print(" -", f, " | isdir:", os.path.isdir(os.path.join(COLOR_DIR, f)))
