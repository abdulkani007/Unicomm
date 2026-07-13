from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter()

@router.get("", response_model=dict)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns the profile metadata of the currently authenticated user.
    """
    return {
        "uid": current_user.get("uid"),
        "email": current_user.get("email"),
        "name": current_user.get("name", "UniComm User"),
        "picture": current_user.get("picture", ""),
        "email_verified": current_user.get("email_verified", False),
        "auth_time": current_user.get("auth_time")
    }
