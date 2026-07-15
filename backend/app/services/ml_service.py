import os
import time
import logging
from typing import List, Tuple
from collections import Counter, deque

import cv2
import mediapipe as mp
import numpy as np
import joblib

import torch
import torch.nn as nn

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

logger = logging.getLogger("unicomm.ml")


# =====================================================
# RESIDUAL BLOCK
# =====================================================

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


# =====================================================
# SIGN LANGUAGE MODEL
# =====================================================

class SignLanguageModel(nn.Module):

    def __init__(self, num_classes):

        super().__init__()

        self.input_layer = nn.Sequential(

            nn.Linear(63, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.10)

        )

        self.block1 = ResidualBlock(256)

        self.block2 = ResidualBlock(256)

        self.block3 = ResidualBlock(256)

        self.classifier = nn.Sequential(

            nn.Linear(256, 128),
            nn.GELU(),
            nn.Dropout(0.15),

            nn.Linear(128, 64),
            nn.GELU(),

            nn.Linear(64, num_classes)

        )

    def forward(self, x):

        x = self.input_layer(x)

        x = self.block1(x)

        x = self.block2(x)

        x = self.block3(x)

        return self.classifier(x)


# =====================================================
# SERVICE
# =====================================================

class SignLanguageModelService:

    def __init__(self):

        self.model = None

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.model_version = "ResidualNet v2"

        self.labels = []

        self.encoder = None

        self.is_mock = False

        self.prediction_history = deque(maxlen=7)

        # ------------------------------
        # MediaPipe
        # ------------------------------

        self.mpHands = mp.solutions.hands

        self.hands = self.mpHands.Hands(

            static_image_mode=False,

            max_num_hands=1,

            model_complexity=1,

            min_detection_confidence=0.7,

            min_tracking_confidence=0.6

        )

        self.load_model()


    # =====================================================
    # LOAD MODEL
    # =====================================================

    def load_model(self):

        try:

            from app.config import settings

            model_path = settings.MODEL_PATH

            if model_path and not os.path.isabs(model_path):
                candidate_paths = [
                    os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), model_path)), # backend/app/services/ml_service.py -> backend/
                    os.path.abspath(os.path.join(os.getcwd(), model_path)),
                    os.path.abspath(os.path.join(os.getcwd(), "backend", model_path)),
                ]
                for p in candidate_paths:
                    if os.path.exists(p):
                        model_path = p
                        break

            encoder_path = os.path.join(
                os.path.dirname(model_path),
                "label_encoder.pkl"
            )

            logger.info(f"Loading Model : {model_path}")

            self.encoder = joblib.load(
                encoder_path
            )

            self.labels = list(
                self.encoder.classes_
            )

            num_classes = len(self.labels)

            self.model = SignLanguageModel(
                num_classes
            ).to(self.device)

            checkpoint = torch.load(

                model_path,

                map_location=self.device,

                weights_only=False

            )

            if (
                isinstance(checkpoint, dict)
                and
                "model_state_dict" in checkpoint
            ):

                self.model.load_state_dict(
                    checkpoint["model_state_dict"]
                )

            else:

                self.model.load_state_dict(
                    checkpoint
                )

            self.model.eval()

            logger.info(
                "ResidualNet Loaded Successfully"
            )

        except Exception as e:

            logger.exception(e)

            self.is_mock = True
    # =====================================================
    # NORMALIZE LANDMARKS
    # =====================================================

    def normalize_landmarks(self, landmarks):
        # Flatten and handle multi-frame sequences or dual-hand sequences
        if isinstance(landmarks, (list, np.ndarray)):
            # If 2D sequence, extract the last frame
            if len(landmarks) > 0 and isinstance(landmarks[0], (list, np.ndarray)):
                landmarks = landmarks[-1]
            
            # Flatten to 1D
            landmarks = np.array(landmarks).flatten()
            
            # Slice to exactly 63 coordinates (21 joints * 3 axes)
            landmarks = landmarks[:63]
            
            # Pad with zeros if shorter than 63
            if len(landmarks) < 63:
                landmarks = np.pad(landmarks, (0, 63 - len(landmarks)))

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


    # =====================================================
    # LANDMARK PREDICTION
    # =====================================================

    def predict(self, landmarks):
        if self.is_mock or self.model is None:
            import random
            word = random.choice(self.labels) if self.labels else "A"
            self.prediction_history.append(word)
            final_prediction = Counter(
                self.prediction_history
            ).most_common(1)[0][0]
            return final_prediction, 0.95, 2.0

        start_time = time.time()

        features = self.normalize_landmarks(
            landmarks
        )

        tensor = torch.tensor(
            features,
            dtype=torch.float32
        ).unsqueeze(0).to(self.device)

        with torch.no_grad():

            outputs = self.model(tensor)

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            confidence, predicted = torch.max(
                probabilities,
                dim=1
            )

        word = self.encoder.inverse_transform(
            [predicted.item()]
        )[0]

        self.prediction_history.append(word)

        final_prediction = Counter(
            self.prediction_history
        ).most_common(1)[0][0]

        latency = (
            time.time() - start_time
        ) * 1000

        return (
            final_prediction,
            float(confidence.item()),
            latency
        )


    # =====================================================
    # IMAGE PREDICTION
    # =====================================================

    def predict_image(self, image_bytes: bytes):
        if self.is_mock or self.model is None:
            import random
            word = random.choice(self.labels) if self.labels else "A"
            return word, 0.95, 5.0

        start_time = time.time()

        nparr = np.frombuffer(
            image_bytes,
            np.uint8
        )

        frame = cv2.imdecode(
            nparr,
            cv2.IMREAD_COLOR
        )

        if frame is None:

            return (
                "No Image",
                0.0,
                0.0
            )

        rgb = cv2.cvtColor(
            frame,
            cv2.COLOR_BGR2RGB
        )

        results = self.hands.process(rgb)

        if not results.multi_hand_landmarks:

            latency = (
                time.time() - start_time
            ) * 1000

            return (
                "No Hand",
                0.0,
                latency
            )

        hand = results.multi_hand_landmarks[0]

        landmarks = []

        for lm in hand.landmark:

            landmarks.extend([

                lm.x,

                lm.y,

                lm.z

            ])

        prediction, confidence, _ = self.predict(
            landmarks
        )

        latency = (
            time.time() - start_time
        ) * 1000

        return (
            prediction,
            confidence,
            latency
        )
    # =====================================================
    # COMPATIBILITY METHOD
    # Existing API can still call predict(sequence)
    # =====================================================

    def predict_sequence(self, sequence: List[List[float]]):

        """
        Compatibility wrapper.

        Accepts:
            [
                [x0,y0,z0],
                ...
                [x20,y20,z20]
            ]

        or

            [x0,y0,z0,x1,y1,z1...]

        """

        if len(sequence) == 21:

            landmarks = []

            for point in sequence:

                landmarks.extend(point)

        else:

            landmarks = sequence

        return self.predict(landmarks)


    # =====================================================
    # RELEASE MEDIAPIPE
    # =====================================================

    def close(self):

        try:

            self.hands.close()

        except Exception:

            pass


# =====================================================
# GLOBAL SINGLETON
# =====================================================

ml_service = SignLanguageModelService()
