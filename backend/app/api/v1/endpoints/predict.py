from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from app.core.auth import get_current_user
from app.schemas.predict import SignPredictionRequest, SignPredictionResponse, SpeechPredictionResponse, TranslateRequest
from app.services.ml_service import ml_service
from app.services.audio_service import audio_service
from app.services.tts_service import tts_service
from app.services.firebase_service import db
import logging

logger = logging.getLogger("unicomm.endpoints.predict")
router = APIRouter()

@router.post("/sign", response_model=SignPredictionResponse)
async def predict_sign(
    payload: SignPredictionRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Receives temporal coordinates sequence of hand landmarks and runs sign predictions.
    """
    uid = current_user.get("uid")
    
    # Run TensorFlow prediction
    label, confidence, latency = ml_service.predict(payload.sequence)
    
    # Save prediction history log in DB
    db.create_prediction(uid, {
        "modelName": "SignSequenceLSTM",
        "modelVersion": ml_service.model_version,
        "featuresExtracted": len(payload.sequence),
        "predictedClass": label,
        "confidence": confidence
    })
    
    # Log api call analytics
    from datetime import datetime
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return SignPredictionResponse(
        prediction=label,
        confidence=confidence,
        model_version=ml_service.model_version,
        latency_ms=latency
    )

@router.post("/speech", response_model=SpeechPredictionResponse)
async def predict_speech(
    file: UploadFile = File(...),
    target_language: str = Form("en"),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts spoken audio files and transcribes them using Whisper.
    """
    uid = current_user.get("uid")
    audio_content = await file.read()
    
    transcription, translation, confidence = await audio_service.transcribe_audio(
        audio_content, 
        file.filename or "audio.webm", 
        target_language
    )
    
    # Log API call analytics
    from datetime import datetime
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return SpeechPredictionResponse(
        transcription=transcription,
        translation=translation,
        confidence=confidence
    )

@router.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    language_code: str = Form("en-US"),
    speaking_rate: float = Form(1.0),
    current_user: dict = Depends(get_current_user)
):
    """
    Synthesizes speech from a text input.
    """
    uid = current_user.get("uid")
    result = await tts_service.synthesize_speech(text, language_code, speaking_rate)
    
    # Log API call analytics
    from datetime import datetime
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return result

@router.post("/translate")
async def translate_text(
    payload: TranslateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Translates text into a target language.
    """
    # Call translate_text in audio_service
    translated = await audio_service.translate_text(payload.text, payload.target_language)
    return {
        "success": True,
        "original_text": payload.text,
        "translated_text": translated,
        "target_language": payload.target_language
    }
