from pydantic import BaseModel, Field
from typing import List, Optional

class SignPredictionRequest(BaseModel):
    # Sequence of frames. Each frame is a list of 3D coordinates (x, y, z) for 42 hand landmarks (21 per hand).
    # 42 landmarks * 3 coordinates = 126 floats per frame.
    sequence: List[List[float]] = Field(
        ...,
        description="Temporal sequence of 3D coordinates (size 126 per frame: 21 landmarks * 3 coordinates * 2 hands)",
        min_length=1
    )
    model_version: Optional[str] = "latest"

class SignPredictionResponse(BaseModel):
    prediction: str = Field(..., description="Predicted sign language word/character")
    confidence: float = Field(..., description="Prediction confidence score (0.0 to 1.0)")
    model_version: str = Field(..., description="Version of the model that served this prediction")
    latency_ms: float = Field(..., description="Inference latency in milliseconds")

class SpeechPredictionResponse(BaseModel):
    transcription: str = Field(..., description="Whisper text transcription")
    translation: Optional[str] = Field(None, description="Translated text, if target language is different")
    confidence: float = Field(..., description="Whisper transcription confidence")

class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text content to translate")
    target_language: str = Field("en", description="Target ISO language code")
