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
            logger.warning("No OpenAI API Key configured. Audio transcription will run in MOCK MODE.")
        else:
            logger.info("OpenAI Whisper service configured successfully.")

    async def transcribe_audio(self, audio_bytes: bytes, filename: str, target_language: str = "en") -> Tuple[str, str, float]:
        """
        Transcribes the uploaded audio and optionally translates it.
        Returns:
            Tuple[transcription, translation, confidence]
        """
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
