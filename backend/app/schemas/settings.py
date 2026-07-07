from pydantic import BaseModel, Field
from typing import Optional

class SettingsUpdate(BaseModel):
    interfaceLanguage: Optional[str] = Field(None, description="Preferred display language")
    speechSpeed: Optional[float] = Field(None, description="TTS voice speed (0.5 to 2.0)")
    theme: Optional[str] = Field(None, description="Theme: light or dark")
    highContrast: Optional[bool] = Field(None, description="Enable accessibility high contrast colors")
    largeText: Optional[bool] = Field(None, description="Enable accessibility large typography")
    cameraResolution: Optional[str] = Field(None, description="Camera capture quality (e.g. 720p)")

class SettingsResponse(BaseModel):
    userId: str
    interfaceLanguage: str
    speechSpeed: float
    theme: str
    highContrast: bool
    largeText: bool
    cameraResolution: str
