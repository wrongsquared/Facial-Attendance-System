# antispoof.py
import onnxruntime as ort
import numpy as np
import cv2
import os

MODEL_PATH = "antispoof_custom.onnx"
INPUT_SIZE = (224, 224)
THRESH = 0.5

sess = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])

def preprocess(img):
    img = cv2.resize(img, INPUT_SIZE)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32)/255.0
    img = np.transpose(img, (2,0,1))[None,:,:,:]
    return img

def is_real_face(face_img):
    try:
        x = preprocess(face_img)
        out = sess.run(None, {"input": x})[0]
        prob_real = float(out.flatten()[1])
        return prob_real >= THRESH, prob_real
    except:
        return False, 0.0
