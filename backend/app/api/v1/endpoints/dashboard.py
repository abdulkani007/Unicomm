from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.services.firebase_service import db

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """
    Returns SaaS metrics, cloud usage, and system stats for the user dashboard.
    """
    uid = current_user.get("uid")
    stats = db.get_dashboard_stats(uid)
    return {
        "success": True,
        "data": stats
    }
