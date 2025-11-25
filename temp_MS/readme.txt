Automatic Student Attendance — README

Last updated: 2025-11-12
This document explains the three Python scripts in this mini attendance system, how they work, how to set them up on Windows, how to use them, troubleshooting tips, and next-step suggestions (anti-spoof, web API, DB). It’s written for students, lecturers, and developers who will test or extend the system.

1. Project overview (simple)
This project uses face recognition to identify students and prepare attendance records. It uses a face-embedding approach (industry standard): capture images → compute embeddings → compare live face embedding with stored embeddings.

Main features in this repository:

add_student.py — capture face images from webcam and save to dataset/<student_id>/.

train_embeddings.py — read images in dataset/, compute face embeddings (via face_recognition) and save them to encodings.pkl.

recognise_live.py — use webcam to detect faces, compute embedding for live face(s), compare to stored embeddings and display recognized user or Unknown.

This version uses face_recognition (dlib) for embeddings — chosen for stability on Windows and easy setup.

2. Folder structure (what to expect)
project-root/
├─ add_student.py
├─ train_embeddings.py
├─ recognise_live.py
├─ encodings.pkl          # created by train_embeddings.py
├─ dataset/               # you will create this by running add_student.py
│   └─ 8220967_Syaraf/
│       ├─ img_1.jpg
│       └─ ...
└─ model/                 # optional: for anti-spoof ONNX later

3. Requirements & installation (Windows, venv recommended)
A. Install Python

Use Python 3.8–3.11. Check with:
python --version

B. Create & activate virtual environment (in project root)
PowerShell: 
python -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned  # temporary if scripts blocked
.\venv\Scripts\Activate.ps1

cmd:
python -m venv venv
venv\Scripts\activate.bat

If activation fails in PowerShell due to script policy, either use Command Prompt or run the Set-ExecutionPolicy command once for the session as shown above.

C. Install Python packages

With the venv activated:
pip install --upgrade pip
pip install face_recognition opencv-python numpy scipy

If dlib/face_recognition fails to install:

Install cmake first:
pip install cmake

If dlib wheel needed, get a prebuilt wheel matching your Python version & Windows (ask or search for dlib wheels). Example:
pip install dlib-19.24.1-cp310-cp310-win_amd64.whl

Then re-run: pip install face_recognition.

Note: face_recognition wraps dlib and provides face_encodings, which we use for embeddings.

4. Quick start — run the three main steps
Step 1 — Add student images (capture via webcam)

python add_student.py

Enter student folder name when prompted: e.g. 8220967_MuhdSyaraf.

The script will open your webcam and automatically capture CAPTURE_COUNT (default 10) cropped face images at intervals (CAPTURE_DELAY seconds).

Images are saved to dataset/<student_id>/img_1.jpg, etc.

After capturing, run step 2.

Step 2 — Train / build embeddings (generate encodings)

python train_embeddings.py

This scans dataset/, computes one embedding per image using face_recognition.face_encodings(...), and saves the array to encodings.pkl.

Output: encodings.pkl containing {"names": [...], "embeddings": np.array([...])}

Step 3 — Live recognition (run webcam recognition)

python recognise_live.py

The webcam opens. Faces detected in the frame are encoded and compared against encodings.pkl.

If the minimum cosine distance is below RECOGNITION_THRESHOLD (default 0.04), the name and distance show above the face rectangle. Otherwise shows Unknown.

Press q to quit.

5. Explanation of key code behavior
add_student.py:

Detects faces with OpenCV Haar Cascade (haarcascade_frontalface_default.xml).

Crops the detected face and saves to dataset/<student_id>/img_n.jpg.

Auto-captures every CAPTURE_DELAY seconds until CAPTURE_COUNT images are collected.

User tips:

Face the camera, vary slight angles and expressions to improve embeddings.

Try to capture under similar lighting to where recognition will be used.

train_embeddings.py:

Loads every image in every student folder in dataset/.

Uses face_recognition.face_encodings(img) to produce a 128-d vector per image.

Stores encodings.pkl with names (folder names) and embeddings (numpy array).

Developer notes:

If some images fail (no face detected), script prints a failure message and skips that image.

You can re-run after adding more images; the script will rebuild encodings.pkl from all images present.

recognise_live.py:

Loads encodings.pkl.

For each video frame:

Detects face locations via face_recognition.face_locations.

Computes a face encoding with face_recognition.face_encodings.

Calls find_best_match: compares query encoding to all stored embeddings using cosine distance (implemented via scipy.spatial.distance.cosine).

If the best distance < RECOGNITION_THRESHOLD, it’s considered a match; else Unknown.

Important: The code currently returns the closest stored embedding. Without a good threshold, unknown people may be incorrectly matched — see section Tuning threshold & open-set handling.

6. Tuning & Open-set (unknown people) handling

Your system currently picks the closest existing embedding. To avoid misidentifying unknown people:

Tune RECOGNITION_THRESHOLD in recognise_live.py. Raise it if your system incorrectly assigns unknown people to a stored identity. Typical ranges: 0.03 (strict) → 0.06 (looser).

Run experiments: measure distances for true matches and non-matches, then pick a threshold that separates them.

Collect negative samples: show faces of people not in dataset and record their distances; this helps pick threshold.

Optional safeguard: require k consecutive frames with match < threshold before marking attendance (reduces sporadic false positives).

Log distances to a CSV for analysis:

Add logging in the recognition success block to store (timestamp, guess_name, distance).

7. Adding anti-spoof (CNN)

To be added...

8. Troubleshooting & common errors
A. Camera not detected / black frame

Ensure webcam not used by another app (Zoom, Teams). Close them.

If using laptop with multiple cameras, you can change cv2.VideoCapture(0) to cv2.VideoCapture(1) etc.

B. dlib or face_recognition installation errors

On Windows, dlib can be tricky. Install cmake first:

pip install cmake

Then either pip install dlib or download a matching .whl and pip install <wheel>.

Make sure Python version matches wheel (e.g., cp310 for Python 3.10).

C. No face found during embedding step

train_embeddings.py uses face_recognition.face_encodings. If input images are small, blurry, or faces not centered, face_encodings may return empty list. Re-capture better quality images.

D. Too many false positives (unknown person recognized as someone)

Increase RECOGNITION_THRESHOLD (loosen acceptance).

Require match on multiple frames before acceptance.

Use more images per student with varied angles for better embedding coverage.

E. Errors about TensorFlow / MediaPipe (if you installed them earlier)

This repo version uses face_recognition only. If you have conflicting packages (TensorFlow + MediaPipe), you might have protobuf version conflicts. Remove unused packages if possible:

pip uninstall tensorflow mediapipe deepface

Then keep face_recognition, dlib, opencv-python.

10. Security & privacy (must read for users / supervisors)

Consent: Obtain written consent from all students before collecting facial data.

Data storage: Embeddings are more privacy-friendly than raw faces, but still biometric. Protect encodings.pkl and images (encrypt storage or restrict access).

Retention policy: Decide how long to store face images and embeddings (e.g., delete after graduation + provide deletion endpoint).

Access control: Only authorized staff should access attendance logs and biometric data.

11. How lecturers / admin use this system (user manual)
Lecturer quick-run (demo style)

Boot instructor laptop and connect webcam.

Activate venv (PowerShell or cmd).

Run python recognise_live.py to check the live detection UI.

If threshold tuned and working, run during class and record attendance logs (you can extend to write to a CSV/DB when a student is recognized).

For any mis-recognized student, use manual attendance override (this feature can be added to DB UI).

Student self-register (recommended flow)

Student opens add_student.py UI on their laptop (or you host a web registration page).

Student enters student_id (e.g., 8220967_Syaraf) and runs the script to capture faces.

Admin runs python train_embeddings.py to update encodings.pkl (or call backend endpoint in web implementation).

Student should test recognise_live.py to validate registration success.

12. Examples & commands recap

Activate venv:

.\venv\Scripts\Activate.ps1   # PowerShell
# or
venv\Scripts\activate.bat     # cmd

Install deps:

pip install face_recognition opencv-python numpy scipy

Run scripts:

python add_student.py
python train_embeddings.py
python recognise_live.py

14. Acknowledgements & references

face_recognition library — https://github.com/ageitgey/face_recognition

dlib — face embeddings & facial landmarks

OpenCV — webcam & image processing

ONNX / onnxruntime — recommended for anti-spoof model inference on CPU

15. License

This README / code is used for academic purposes and our Final Year Project.