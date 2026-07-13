import os
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv

# Resolve the path to backend/.env relative to this config file
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(base_dir, '.env')
load_dotenv(dotenv_path=dotenv_path)

class Settings(BaseModel):
    PROJECT_NAME: str = "UniComm AI"
    API_V1_STR: str = "/api/v1"
    
    # Firebase configuration
    FIREBASE_CREDENTIALS_PATH: str = Field(default="")
    FIREBASE_PROJECT_ID: str = Field(default="")
    
    # ML Model Config
    MODEL_PATH: str = Field(default="assets/sign_model.h5")
    
    # Security
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # OpenAI API Key for Whisper (Optional, fallbacks available)
    OPENAI_API_KEY: str = Field(default="")
    
    # Google Cloud credentials
    GOOGLE_APPLICATION_CREDENTIALS: str = Field(default="")
    
    # MongoDB Config
    MONGODB_URI: str = Field(default="")
    DATABASE_NAME: str = Field(default="unicomm_db")

# Read environment variables
settings = Settings(
    FIREBASE_CREDENTIALS_PATH=os.getenv("FIREBASE_CREDENTIALS_PATH", ""),
    FIREBASE_PROJECT_ID=os.getenv("FIREBASE_PROJECT_ID", "unicomm-ai-demo"),
    MODEL_PATH=os.getenv("MODEL_PATH", "assets/sign_model.h5"),
    ALLOWED_HOSTS=[x.strip() for x in os.getenv("ALLOWED_HOSTS", "*").split(",") if x.strip()],
    OPENAI_API_KEY=os.getenv("OPENAI_API_KEY", ""),
    GOOGLE_APPLICATION_CREDENTIALS=os.getenv("GOOGLE_APPLICATION_CREDENTIALS", ""),
    MONGODB_URI=os.getenv("MONGODB_URI", ""),
    DATABASE_NAME=os.getenv("DATABASE_NAME", "unicomm_db")
)
