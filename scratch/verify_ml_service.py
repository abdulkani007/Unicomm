import sys
import os

# Adjust path to import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

try:
    from app.services.ml_service import ml_service
    print("=" * 60)
    print(f"ML Service Loaded Successfully!")
    print(f"Is Mock Mode Active: {ml_service.is_mock}")
    print(f"Model Version: {ml_service.model_version}")
    print(f"Labels Loaded: {ml_service.labels}")
    print(f"Device: {ml_service.device}")
    print("=" * 60)
except Exception as e:
    import traceback
    print("Error loading ML Service:")
    traceback.print_exc()
