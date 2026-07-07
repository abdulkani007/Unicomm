from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class HistoryCreate(BaseModel):
    mode: str = Field(..., description="Communication mode: sign-to-speech, speech-to-sign, text-to-speech, two-way")
    originalText: str = Field(..., description="Input text or spoken content")
    translatedText: str = Field(..., description="Output or translated content")
    sourceLanguage: str = Field("en", description="ISO language code of source")
    targetLanguage: str = Field("en", description="ISO language code of target")
    audioUrl: Optional[str] = Field(None, description="Optional synthesized TTS audio file link")

class HistoryResponse(HistoryCreate):
    id: str = Field(..., description="Unique Firestore history identifier")
    userId: str = Field(..., description="UID of the owner user")
    createdAt: datetime = Field(..., description="Timestamp of when the entry was created")
    isSynced: bool = Field(True, description="Indicates if record is cloud synced")
