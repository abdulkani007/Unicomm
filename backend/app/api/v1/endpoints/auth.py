from fastapi import APIRouter, Depends
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/me")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """
    Verifies the user ID token and returns authenticated user metadata.
    """
    return {
        "success": True,
        "user": {
            "uid": current_user.get("uid"),
            "email": current_user.get("email"),
            "name": current_user.get("name") or current_user.get("email", "").split("@")[0].capitalize(),
            "role": current_user.get("role", "user")
        }
    }
