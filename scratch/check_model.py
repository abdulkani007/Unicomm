import cv2
import mediapipe as mp
import numpy as np
import torch
import torch.nn as nn
import joblib
from collections import Counter, deque
from pathlib import Path

import sys
import types
try:
    import numpy.core.multiarray as _orig_multiarray
    numpy_core = types.ModuleType("numpy._core")
    numpy_core_multiarray = types.ModuleType("numpy._core.multiarray")
    numpy_core_multiarray._reconstruct = _orig_multiarray._reconstruct
    numpy_core_multiarray.scalar = _orig_multiarray.scalar
    sys.modules["numpy._core"] = numpy_core
    sys.modules["numpy._core.multiarray"] = numpy_core_multiarray
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "SignLanguage_v2_ResidualNet.pth"
ENCODER_PATH = BASE_DIR / "models" / "label_encoder.pkl"
# ============================================================
# CONFIGURATION
# ============================================================


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print("=" * 60)
print("Device :", DEVICE)

if DEVICE.type == "cuda":
    print("GPU :", torch.cuda.get_device_name(0))

print("=" * 60)

# ============================================================
# LOAD LABEL ENCODER
# ============================================================

encoder = joblib.load(ENCODER_PATH)

NUM_CLASSES = len(encoder.classes_)

print("\nClasses")

for i, c in enumerate(encoder.classes_):
    print(f"{i} -> {c}")

# ============================================================
# MODEL
# ============================================================

# ============================================================
# RESIDUAL BLOCK
# ============================================================

class ResidualBlock(nn.Module):

    def __init__(self, features):

        super().__init__()

        self.layers = nn.Sequential(

            nn.Linear(features, features),
            nn.BatchNorm1d(features),
            nn.GELU(),
            nn.Dropout(0.20),

            nn.Linear(features, features),
            nn.BatchNorm1d(features)

        )

        self.activation = nn.GELU()

    def forward(self, x):

        return self.activation(
            x + self.layers(x)
        )
    


# ============================================================
# MODEL
# ============================================================

class SignLanguageModel(nn.Module):

    def __init__(self, num_classes):

        super().__init__()

        self.input_layer = nn.Sequential(

            nn.Linear(63,256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.10)

        )

        self.block1 = ResidualBlock(256)

        self.block2 = ResidualBlock(256)

        self.block3 = ResidualBlock(256)

        self.classifier = nn.Sequential(

            nn.Linear(256,128),
            nn.GELU(),
            nn.Dropout(0.15),

            nn.Linear(128,64),
            nn.GELU(),

            nn.Linear(64,num_classes)

        )

    def forward(self,x):

        x = self.input_layer(x)

        x = self.block1(x)

        x = self.block2(x)

        x = self.block3(x)

        return self.classifier(x)

# ============================================================
# LOAD MODEL
# ============================================================

model = SignLanguageModel(NUM_CLASSES).to(DEVICE)

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)

# Works whether you saved only state_dict or a checkpoint dict
if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    model.load_state_dict(checkpoint["model_state_dict"])
else:
    model.load_state_dict(checkpoint)

model.eval()

print("\nModel Loaded Successfully!")

# ============================================================
# MEDIAPIPE
# ============================================================

mpHands = mp.solutions.hands
mpDraw = mp.solutions.drawing_utils

hands = mpHands.Hands(

    static_image_mode=False,

    max_num_hands=1,

    model_complexity=1,

    min_detection_confidence=0.7,

    min_tracking_confidence=0.6

)

# ============================================================
# NORMALIZATION
# (Same as normal.py)
# ============================================================

def normalize_landmarks(landmarks):

    landmarks = np.array(
        landmarks,
        dtype=np.float32
    ).reshape(21, 3)

    wrist = landmarks[0]

    landmarks = landmarks - wrist

    distances = np.linalg.norm(
        landmarks,
        axis=1
    )

    max_distance = np.max(distances)

    if max_distance > 0:
        landmarks = landmarks / max_distance

    return landmarks.flatten()

# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict(features):

    features = normalize_landmarks(features)

    tensor = torch.tensor(
        features,
        dtype=torch.float32
    ).unsqueeze(0).to(DEVICE)

    with torch.no_grad():

        output = model(tensor)

        probabilities = torch.softmax(
            output,
            dim=1
        )

        confidence, predicted = torch.max(
            probabilities,
            dim=1
        )

    word = encoder.inverse_transform(
        [predicted.item()]
    )[0]

    return word, confidence.item()

# ============================================================
# CAMERA
# ============================================================

cap = cv2.VideoCapture(0)

prediction_history = deque(maxlen=7)

# ============================================================
# CAMERA LOOP
# ============================================================

while True:

    success, frame = cap.read()

    if not success:
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    results = hands.process(rgb)

    predicted_word = ""
    confidence = 0.0

    if results.multi_hand_landmarks:

        hand = results.multi_hand_landmarks[0]

        mpDraw.draw_landmarks(
            frame,
            hand,
            mpHands.HAND_CONNECTIONS
        )

        landmarks = []

        for lm in hand.landmark:

            landmarks.extend([
                lm.x,
                lm.y,
                lm.z
            ])

        predicted_word, confidence = predict(landmarks)

        prediction_history.append(predicted_word)

        final_prediction = Counter(
            prediction_history
        ).most_common(1)[0][0]

        h, w, _ = frame.shape

        xs = []
        ys = []

        for lm in hand.landmark:

            xs.append(int(lm.x * w))
            ys.append(int(lm.y * h))

        xmin = max(min(xs) - 20, 0)
        ymin = max(min(ys) - 20, 0)
        xmax = min(max(xs) + 20, w)
        ymax = min(max(ys) + 20, h)

        cv2.rectangle(
            frame,
            (xmin, ymin),
            (xmax, ymax),
            (0,255,0),
            2
        )

        cv2.rectangle(
            frame,
            (xmin, ymin-55),
            (xmax, ymin),
            (0,255,0),
            -1
        )

        cv2.putText(
            frame,
            final_prediction,
            (xmin+5, ymin-28),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0,0,0),
            2
        )

        cv2.putText(
            frame,
            f"{confidence*100:.1f}%",
            (xmin+5, ymin-5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255,0,0),
            2
        )

    else:

        cv2.putText(
            frame,
            "Show your hand",
            (20,40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0,0,255),
            2
        )

    cv2.imshow(
        "Sign Language Recognition",
        frame
    )

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break

# ============================================================
# RELEASE
# ============================================================

cap.release()

cv2.destroyAllWindows()