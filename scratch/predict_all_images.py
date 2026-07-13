import os
import sys
import numpy as np
import torch
import cv2
import joblib
import mediapipe as mp

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.services.ml_service import ml_service

image_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend/public/images'))

print("=" * 80)
print("Evaluating public/images using static_image_mode=True:")
print("=" * 80)

# Initialize hands with static_image_mode=True
mp_hands = mp.solutions.hands
static_hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=1,
    model_complexity=1,
    min_detection_confidence=0.1 # Very permissive to find the hand in all photos!
)

for i in range(1, 10):
    img_path = os.path.join(image_dir, f"{i}.png")
    if os.path.exists(img_path):
        with open(img_path, "rb") as f:
            image_bytes = f.read()
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            print(f"Image {i}.png -> Could not decode")
            continue
            
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = static_hands.process(rgb)
        
        if not results.multi_hand_landmarks:
            print(f"Image {i}.png -> Still NO HAND detected even with static mode and min_detection_confidence=0.1!")
            continue
            
        hand = results.multi_hand_landmarks[0]
        landmarks = []
        for lm in hand.landmark:
            landmarks.extend([lm.x, lm.y, lm.z])
            
        features = ml_service.normalize_landmarks(landmarks)
        tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0).to(ml_service.device)
        
        with torch.no_grad():
            outputs = ml_service.model(tensor)
            probabilities = torch.softmax(outputs, dim=1).squeeze(0).cpu().numpy()
            
        # Get top 3 predictions
        top_indices = np.argsort(probabilities)[::-1][:3]
        top_predictions = [
            (ml_service.labels[idx], probabilities[idx]) for idx in top_indices
        ]
        
        preds_str = ", ".join([f"'{lbl}': {prob*100:.1f}%" for lbl, prob in top_predictions])
        print(f"Image {i}.png -> Top Predictions: {preds_str}")
    else:
        print(f"Image {i}.png not found")
print("=" * 80)
