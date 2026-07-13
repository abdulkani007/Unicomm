import logging
import httpx
from typing import Optional, Tuple
from app.config import settings

logger = logging.getLogger("unicomm.audio")

class AudioService:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.openai_url = "https://api.openai.com/v1/audio/transcriptions"
        self.is_mock = not bool(self.api_key)
        self.local_model = None
        self.local_model_loaded = False
        
        if self.is_mock:
            logger.warning("No OpenAI API Key configured. Online transcription is disabled, local Whisper or mock translation will be used.")
        else:
            logger.info("OpenAI Whisper service configured successfully.")

    async def transcribe_audio(self, audio_bytes: bytes, filename: str, target_language: str = "en") -> Tuple[str, str, float]:
        """
        Transcribes the uploaded audio and optionally translates it.
        Returns:
            Tuple[transcription, translation, confidence]
        """
        # Try loading local Whisper model on demand for offline speech recognition
        if not self.local_model_loaded or self.local_model is None:
            try:
                import whisper
                logger.info("Loading offline/local OpenAI Whisper model ('tiny')...")
                self.local_model = whisper.load_model("tiny")
                logger.info("Local Whisper model loaded successfully.")
                self.local_model_loaded = True
            except Exception as e:
                logger.error(f"Failed to load offline local Whisper model: {str(e)}")
                self.local_model_loaded = True  # set true to prevent constant failing logs

        if self.local_model is not None:
            try:
                logger.info(f"Offline Whisper transcribing: {filename}")
                import tempfile
                import os
                import anyio
                
                # Write audio bytes to temporary file for Whisper
                ext = os.path.splitext(filename)[1] or ".wav"
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
                    temp_file.write(audio_bytes)
                    temp_path = temp_file.name
                    
                try:
                    # Attempt manual decoding using soundfile to bypass ffmpeg requirement
                    try:
                        import soundfile as sf
                        import numpy as np
                        
                        logger.info("Attempting to load audio array manually using soundfile...")
                        audio_input, samplerate = sf.read(temp_path, dtype='float32')
                        
                        # Convert to mono
                        if len(audio_input.shape) > 1:
                            audio_input = audio_input.mean(axis=1)
                            
                        # Resample to 16000 Hz
                        if samplerate != 16000:
                            num_samples = int(len(audio_input) * 16000 / samplerate)
                            audio_input = np.interp(
                                np.linspace(0, len(audio_input), num_samples, endpoint=False),
                                np.arange(len(audio_input)),
                                audio_input
                            ).astype(np.float32)
                            
                        logger.info("Manual audio loading successful. Bypassing ffmpeg.")
                    except Exception as parse_err:
                        logger.warning(f"Manual soundfile parsing failed: {str(parse_err)}. Falling back to default file path passing.")
                        audio_input = temp_path
                    
                    def run_local_whisper():
                        return self.local_model.transcribe(audio_input)
                        
                    result = await anyio.to_thread.run_sync(run_local_whisper)
                    transcription = result.get("text", "").strip()
                    logger.info(f"Offline Whisper transcription complete: {transcription[:40]}...")
                    
                    translation = await self.translate_text(transcription, target_language)
                    return transcription, translation, 0.99
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
            except Exception as e:
                logger.error(f"Offline Whisper processing failed: {str(e)}")

        if self.is_mock:
            # Simulate a translation dictionary based on simple queries or return default text
            logger.info(f"Mock transcribing audio file: {filename}")
            
            # Simulated responses
            transcription = "Hello, how are you today?"
            
            # Simple local mock translations for the 7 supported languages
            translations = {
                "en": "Hello, how are you today?",
                "hi": "नमस्ते, आप आज कैसे हैं?",
                "ta": "வணக்கம், இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?",
                "ml": "ഹലോ, ഇന്ന് നിങ്ങൾക്ക് സുഖമാണോ?",
                "te": "హలో, ఈరోజు మీరు ఎలా ఉన్నారు?",
                "kn": "ಹಲೋ, ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ?",
                "ar": "مرحباً، كيف حالك اليوم؟"
            }
            
            translation = translations.get(target_language, transcription)
            return transcription, translation, 0.95

        try:
            # Prepare files payload for OpenAI Whisper API
            files = {
                "file": (filename, audio_bytes, "audio/webm")
            }
            data = {
                "model": "whisper-1",
                "response_format": "json"
            }
            headers = {
                "Authorization": f"Bearer {self.api_key}"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.openai_url,
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Whisper API error: {response.text}")
                    return "Error transcribing audio", "Error transcribing audio", 0.0
                
                result = response.json()
                transcription = result.get("text", "")
                
                # Perform basic translations (in a real production system, you'd use Google Translate API,
                # here we can implement translation logic or call a translation endpoint)
                translation = await self.translate_text(transcription, target_language)
                
                return transcription, translation, 0.98

        except Exception as e:
            logger.error(f"Failed to transcribe audio: {str(e)}")
            return "Error transcribing audio", "Error transcribing audio", 0.0

    async def translate_text(self, text: str, target_lang: str) -> str:
        """
        Translates text dynamically using the Google Translate engine.
        Includes a local dictionary lookup for instant standard phrases.
        """
        # Dictionary of phrases
        phrases = {
            "hello, how are you today?": {
                "en": "Hello, how are you today?",
                "hi": "नमस्ते, आप आज कैसे हैं?",
                "ta": "வணக்கம், இன்று நீங்கள் எப்படி இருக்கிறீர்கள்?",
                "ml": "ഹലോ, ഇന്ന് നിങ്ങൾക്ക് സുഖമാണോ?",
                "te": "హలో, ఈరోజు మీరు ఎలా ఉన్నారు?",
                "kn": "ಹಲೋ, ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ?",
                "ar": "مرحباً، كيف حالك اليوم؟"
            },
            "thank you": {
                "en": "Thank you",
                "hi": "धन्यवाद",
                "ta": "நன்றி",
                "ml": "നന്ദി",
                "te": "ధన్యవాదాలు",
                "kn": "ಧನ್ಯವಾದಗಳು",
                "ar": "شكراً لك"
            }
        }
        
        text_lower = text.strip().lower().replace(".", "").replace("!", "").replace("?", "")
        if text_lower in phrases:
            return phrases[text_lower].get(target_lang, text)
            
        # Try dynamic translation via Google's free translation service
        import urllib.parse
        try:
            encoded_text = urllib.parse.quote(text)
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={encoded_text}"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    result = response.json()
                    translated = "".join([sentence[0] for sentence in result[0] if sentence[0]])
                    return translated
        except Exception as e:
            logger.warning(f"Dynamic translation failed: {str(e)}. Using fallback format.")
            
        # Fallback to returning the formatted text if request fails
        return f"[Translated to {target_lang}]: {text}"

# Global singleton
audio_service = AudioService()
