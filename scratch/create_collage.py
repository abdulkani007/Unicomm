import os
import cv2
import numpy as np

image_dir = r"d:\projects\UniComm_AI\frontend\public\images"
output_path = r"C:\Users\abdul\.gemini\antigravity\brain\97391f7b-5065-4639-a5f3-5e0b8e47f200\collage.jpg"

images = []
for i in range(1, 10):
    img_path = os.path.join(image_dir, f"{i}.png")
    if os.path.exists(img_path):
        img = cv2.imread(img_path)
        if img is not None:
            img_resized = cv2.resize(img, (200, 200))
            # Draw number on top of image
            cv2.putText(img_resized, f"Image {i}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 3)
            cv2.putText(img_resized, f"Image {i}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            images.append(img_resized)
        else:
            # Create a black placeholder if loading fails
            placeholder = np.zeros((200, 200, 3), dtype=np.uint8)
            cv2.putText(placeholder, f"Error {i}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            images.append(placeholder)
    else:
        placeholder = np.zeros((200, 200, 3), dtype=np.uint8)
        cv2.putText(placeholder, f"Missing {i}", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        images.append(placeholder)

# Create 3x3 grid
row1 = np.hstack(images[0:3])
row2 = np.hstack(images[3:6])
row3 = np.hstack(images[6:9])
grid = np.vstack([row1, row2, row3])

# Create destination directory if not exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)
cv2.imwrite(output_path, grid)
print(f"Successfully saved collage to {output_path}")
