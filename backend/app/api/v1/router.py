from fastapi import APIRouter
from app.api.v1.endpoints import auth, dashboard, predict, history, settings

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(predict.router, prefix="/predict", tags=["prediction"])
api_router.include_router(history.router, prefix="/history", tags=["history"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
