# antispoof.py
import onnxruntime as ort
import numpy as np
import cv2

MODEL_PATH = "antispoof_best.onnx"
INPUT_SIZE = 112
TEMPERATURE = 2.5   # <<< VERY IMPORTANT (tuned for replay)

sess = ort.InferenceSession(
    MODEL_PATH,
    providers=["CPUExecutionProvider"]
)

def preprocess(img_bgr):
    img = cv2.resize(img_bgr, (INPUT_SIZE, INPUT_SIZE))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))[None, ...]
    return img

def softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()

def is_real_face_raw(img_bgr):
    if img_bgr is None or img_bgr.size == 0:
        return 0.0

    x = preprocess(img_bgr)
    logits = sess.run(None, {"input": x})[0][0]

    # Temperature scaling
    logits = logits / TEMPERATURE

    probs = softmax(logits)
    prob_real = float(probs[0])   # class 0 = REAL

    return prob_real
