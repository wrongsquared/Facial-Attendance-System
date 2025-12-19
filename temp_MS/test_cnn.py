import cv2
from antispoof import is_real_face_raw

img = cv2.imread("dataset/8220967_Din/img_001.jpg")
print("REAL score:", is_real_face_raw(img))
