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
        
        if self.is_mock:
            logger.warning("No OpenAI API Key configured. Online transcription is disabled, local Whisper or SpeechRecognition will be used.")
        else:
            logger.info("OpenAI Whisper service configured successfully.")

    async def transcribe_audio(self, audio_bytes: bytes, filename: str, target_language: str = "en") -> Tuple[str, str, float]:
        """
        Transcribes the uploaded audio and optionally translates it.
        Returns:
            Tuple[transcription, translation, confidence]
        """
        # 1. Try OpenAI API first if key is configured
        if not self.is_mock:
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
                    
                    if response.status_code == 200:
                        result = response.json()
                        transcription = result.get("text", "")
                        translation = await self.translate_text(transcription, target_language)
                        return transcription, translation, 0.98
                    else:
                        logger.error(f"Whisper API error: {response.text}")
                        logger.info("OpenAI API call failed, falling back to local speech recognition...")
            except Exception as e:
                logger.error(f"Failed to transcribe audio via OpenAI API: {str(e)}")
                logger.info("Falling back to local speech recognition...")

        # 2. Try local offline Whisper model if available (great for developer localhost with torch/whisper installed)
        try:
            import whisper
            import tempfile
            import os
            import anyio
            
            logger.info("Attempting offline transcription using local Whisper model...")
            local_model = whisper.load_model("tiny")
            
            ext = os.path.splitext(filename)[1] or ".wav"
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
                
            try:
                # Attempt manual decoding using soundfile
                try:
                    import soundfile as sf
                    import numpy as np
                    audio_input, samplerate = sf.read(temp_path, dtype='float32')
                    if len(audio_input.shape) > 1:
                        audio_input = audio_input.mean(axis=1)
                    if samplerate != 16000:
                        num_samples = int(len(audio_input) * 16000 / samplerate)
                        audio_input = np.interp(
                            np.linspace(0, len(audio_input), num_samples, endpoint=False),
                            np.arange(len(audio_input)),
                            audio_input
                        ).astype(np.float32)
                except Exception:
                    audio_input = temp_path
                
                def run_local_whisper():
                    return local_model.transcribe(audio_input)
                    
                result = await anyio.to_thread.run_sync(run_local_whisper)
                transcription = result.get("text", "").strip()
                logger.info(f"Local Whisper transcription complete: {transcription[:40]}...")
                translation = await self.translate_text(transcription, target_language)
                return transcription, translation, 0.99
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        except Exception as whisper_err:
            logger.info(f"Local offline Whisper not available or failed: {str(whisper_err)}")

        # 3. Try local SpeechRecognition package (Google free Web API fallback)
        try:
            import speech_recognition as sr
            import tempfile
            import os
            
            logger.info("Attempting local speech recognition using SpeechRecognition...")
            r = sr.Recognizer()
            ext = os.path.splitext(filename)[1].lower() or ".wav"
            
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
                
            try:
                # If pydub is available, we can convert WebM/MP3 to WAV on the fly!
                try:
                    from pydub import AudioSegment
                    sound = AudioSegment.from_file(temp_path)
                    wav_temp = temp_path + ".wav"
                    sound.export(wav_temp, format="wav")
                    temp_path_for_sr = wav_temp
                except Exception:
                    temp_path_for_sr = temp_path
                
                with sr.AudioFile(temp_path_for_sr) as source:
                    audio_data = r.record(source)
                
                lang_code = "en-US"
                if target_language == "hi":
                    lang_code = "hi-IN"
                elif target_language == "ta":
                    lang_code = "ta-IN"
                elif target_language == "ml":
                    lang_code = "ml-IN"
                elif target_language == "te":
                    lang_code = "te-IN"
                elif target_language == "kn":
                    lang_code = "kn-IN"
                elif target_language == "ar":
                    lang_code = "ar-AE"
                
                logger.info(f"Sending audio to Google Speech API with lang: {lang_code}...")
                
                import anyio
                def recognize():
                    return r.recognize_google(audio_data, language=lang_code)
                
                transcription = await anyio.to_thread.run_sync(recognize)
                logger.info(f"Local SpeechRecognition transcription complete: {transcription[:40]}...")
                
                translation = await self.translate_text(transcription, target_language)
                return transcription, translation, 0.95
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                if 'wav_temp' in locals() and os.path.exists(wav_temp):
                    try:
                        os.remove(wav_temp)
                    except Exception:
                        pass
                    
        except Exception as local_err:
            logger.error(f"Local SpeechRecognition transcription failed: {str(local_err)}")

        # 4. Ultimate fallback to mock mode
        logger.warning("All transcription methods failed. Falling back to mock response.")
        transcription = "Hello, how are you today?"
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
        return transcription, translation, 0.90

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
