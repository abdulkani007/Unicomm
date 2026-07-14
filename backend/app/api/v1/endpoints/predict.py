from fastapi import APIRouter, Depends, UploadFile, File, Form, status, HTTPException
from app.core.auth import get_current_user
from app.schemas.predict import SignPredictionRequest, SignPredictionResponse, SpeechPredictionResponse, TranslateRequest
from app.services.ml_service import ml_service
from app.services.audio_service import audio_service
from app.services.tts_service import tts_service
from app.services.firebase_service import db
import os
import logging
from datetime import datetime

logger = logging.getLogger("unicomm.endpoints.predict")
router = APIRouter()

@router.post("/predict-sign", response_model=SignPredictionResponse)
async def predict_sign_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts raw hand crop image uploads and predicts the sign using EfficientNetB0.
    """
    uid = current_user.get("uid")
    try:
        image_content = await file.read()
        label, confidence, latency = ml_service.predict_image(image_content)
    except Exception as e:
        logger.error(f"Image read error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file: {str(e)}"
        )
        
    # Save prediction history log in DB
    db.create_prediction(uid, {
        "modelName": "EfficientNetB0Classifier",
        "modelVersion": ml_service.model_version,
        "featuresExtracted": len(image_content),
        "predictedClass": label,
        "confidence": confidence
    })
    
    # Save upload record in DB
    db.save_uploaded_file(
        user_id=uid,
        filename=file.filename or "cropped_hand.jpg",
        file_type=file.content_type or "image/jpeg",
        storage_path=f"in-memory://{file.filename or 'cropped_hand.jpg'}"
    )
    
    # Log API call analytics
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return SignPredictionResponse(
        prediction=label,
        confidence=confidence,
        model_version=ml_service.model_version,
        latency_ms=latency
    )

@router.post("/sign", response_model=SignPredictionResponse)
async def predict_sign_sequence(
    payload: SignPredictionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Fallback coordinate sequence prediction endpoint for backward compatibility.
    """
    uid = current_user.get("uid")
    label, confidence, latency = ml_service.predict(payload.sequence)
        
    # Save prediction history log in DB
    db.create_prediction(uid, {
        "modelName": "SignSequenceLSTM",
        "modelVersion": ml_service.model_version,
        "featuresExtracted": len(payload.sequence),
        "predictedClass": label,
        "confidence": confidence
    })
    
    # Log API call analytics
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return SignPredictionResponse(
        prediction=label,
        confidence=confidence,
        model_version=ml_service.model_version,
        latency_ms=latency
    )

@router.post("/speech-to-text", response_model=SpeechPredictionResponse)
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
    
    # Log speech conversion in speech_history
    db.save_speech_history(
        user_id=uid,
        audio_file=file.filename or "audio.webm",
        text=transcription,
        language=target_language
    )
    
    # Save upload record in DB
    db.save_uploaded_file(
        user_id=uid,
        filename=file.filename or "audio.webm",
        file_type=file.content_type or "audio/webm",
        storage_path=f"in-memory://{file.filename or 'audio.webm'}"
    )

    # Log API call analytics
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return SpeechPredictionResponse(
        transcription=transcription,
        translation=translation,
        confidence=confidence
    )

@router.post("/text-to-speech")
@router.post("/tts")
async def text_to_speech_endpoint(
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
    uid = current_user.get("uid")
    translated = await audio_service.translate_text(payload.text, payload.target_language)
    
    # Store translation in translation_history
    db.save_translation_history(
        user_id=uid,
        source_language="en",
        target_language=payload.target_language,
        input_text=payload.text,
        translated_text=translated
    )
    
    return {
        "success": True,
        "original_text": payload.text,
        "translated_text": translated,
        "target_language": payload.target_language
    }

@router.post("/audio")
async def predict_audio(
    file: UploadFile = File(...),
    target_language: str = Form("en"),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts uploaded audio files (mp3, wav, m4a, flac, ogg) and transcribes them.
    """
    uid = current_user.get("uid")
    audio_content = await file.read()
    
    # Check filename extension compatibility
    filename = file.filename or "audio.wav"
    ext = os.path.splitext(filename)[1].lower().replace(".", "")
    if ext not in ["mp3", "wav", "m4a", "flac", "ogg", "webm"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {ext}. Please upload mp3, wav, m4a, flac, or ogg files."
        )
        
    transcription, translation, confidence = await audio_service.transcribe_audio(
        audio_content, 
        filename, 
        target_language
    )
    
    # Save search logs / history
    db.create_prediction(uid, {
        "modelName": "OpenAIWhisperSpeech",
        "modelVersion": "whisper-1",
        "featuresExtracted": len(audio_content),
        "predictedClass": "AudioFileTranscription",
        "confidence": confidence
    })
    
    # Log speech conversion in speech_history
    db.save_speech_history(
        user_id=uid,
        audio_file=filename,
        text=transcription,
        language=target_language
    )
    
    # Save upload record in DB
    db.save_uploaded_file(
        user_id=uid,
        filename=filename,
        file_type=file.content_type or f"audio/{ext}",
        storage_path=f"in-memory://{filename}"
    )
    
    # Log API call analytics
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    db.increment_analytics(date_str, "apiCallsCount", 1)
    
    return {
        "transcription": transcription,
        "translation": translation,
        "confidence": confidence
    }
