from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.schemas.settings import SettingsUpdate, SettingsResponse
from app.services.firebase_service import db

router = APIRouter()

@router.get("", response_model=SettingsResponse)
async def get_user_settings(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the customized settings for the authenticated user.
    """
    uid = current_user.get("uid")
    settings_data = db.get_settings(uid)
    return settings_data

@router.put("", response_model=SettingsResponse)
async def update_user_settings(
    payload: SettingsUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Updates specific settings parameters for the user profile.
    """
    uid = current_user.get("uid")
    update_data = payload.dict(exclude_unset=True)
    
    success = db.create_or_update_settings(uid, update_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )
        
    return db.get_settings(uid)
