import logging
from typing import Dict, Any
from app.config import settings

logger = logging.getLogger("unicomm.tts")

class TTSService:
    def __init__(self):
        self.client = None
        self.is_mock = True
        
        # Check for Google Application Credentials
        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            try:
                from google.cloud import texttospeech
                self.client = texttospeech.TextToSpeechClient()
                self.is_mock = False
                logger.info("Google Cloud TTS client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize Google TTS: {str(e)}. Using client-side synthesis fallback.")
        else:
            logger.warning("No Google credentials. TTS backend will signal frontend to use native SpeechSynthesis.")

    async def synthesize_speech(self, text: str, language_code: str = "en-US", speaking_rate: float = 1.0) -> Dict[str, Any]:
        """
        Synthesizes speech from text.
        If running in mock mode, returns a response indicating the client should use native SpeechSynthesis.
        """
        if self.is_mock:
            # Signal the client to perform native Web Speech Synthesis
            return {
                "use_native_synthesis": True,
                "text": text,
                "language_code": language_code,
                "speaking_rate": speaking_rate,
                "audio_url": None
            }

        try:
            from google.cloud import texttospeech
            
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Map standard languages to common voices
            voice = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
            )
            
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=speaking_rate
            )
            
            response = self.client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            
            # In a full cloud deploy, we would upload the audio content to Google Cloud Storage (GCS)
            # and return the public signed URL.
            # For demonstration, we can return the audio in a base64 format or direct URL if GCS is configured.
            import base64
            audio_base64 = base64.b64encode(response.audio_content).decode("utf-8")
            
            return {
                "use_native_synthesis": False,
                "audio_data": f"data:audio/mp3;base64,{audio_base64}",
                "text": text
            }
            
        except Exception as e:
            logger.error(f"Google Cloud TTS synthesis failed: {str(e)}")
            return {
                "use_native_synthesis": True,
                "text": text,
                "language_code": language_code,
                "speaking_rate": speaking_rate,
                "audio_url": None
            }

# Global singleton
tts_service = TTSService()
