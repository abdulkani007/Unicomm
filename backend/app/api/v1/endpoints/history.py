import io
import csv
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from app.core.auth import get_current_user
from app.schemas.history import HistoryCreate, HistoryResponse
from app.services.firebase_service import db

router = APIRouter()

@router.get("", response_model=List[HistoryResponse])
async def get_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str = Query("", description="Keyword search filter"),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves the communication logs for the authenticated user.
    """
    uid = current_user.get("uid")
    logs = db.get_histories(uid, limit=limit, offset=offset, search=search)
    return logs

@router.post("", response_model=HistoryResponse, status_code=status.HTTP_210_COMMUNICATION_HISTORY_CREATED if hasattr(status, "HTTP_210_COMMUNICATION_HISTORY_CREATED") else status.HTTP_201_CREATED)
async def create_history_entry(
    payload: HistoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Saves a new communication history entry to the database.
    """
    uid = current_user.get("uid")
    history_data = payload.dict()
    
    # Save in Firestore
    hist_id = db.create_history(uid, history_data)
    if not hist_id:
         raise HTTPException(
             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
             detail="Failed to save communication history."
         )
         
    # Fetch created document
    created_logs = db.get_histories(uid, limit=1, search="")
    if created_logs and created_logs[0]["id"] == hist_id:
        return created_logs[0]
    
    # Fallback response construction
    from datetime import datetime
    return HistoryResponse(
        id=hist_id,
        userId=uid,
        createdAt=datetime.utcnow(),
        isSynced=True,
        **history_data
    )

@router.delete("/{history_id}")
async def delete_history_entry(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Removes a communication history log entry from the database.
    """
    uid = current_user.get("uid")
    success = db.delete_history(history_id, uid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="History entry not found or does not belong to the user."
        )
    return {"success": True, "message": "History entry deleted successfully."}

@router.get("/export")
async def export_history(
    current_user: dict = Depends(get_current_user)
):
    """
    Exports the complete communication log history as a downloadable CSV stream.
    """
    uid = current_user.get("uid")
    logs = db.get_histories(uid, limit=1000) # Fetch up to 1000 items for export
    
    # Write CSV content to a string buffer
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Date", "Mode", "Source Language", "Target Language", "Original Text", "Translated Text", "Audio URL"])
    
    # Write data rows
    for log in logs:
        writer.writerow([
            log.get("id"),
            log.get("createdAt").isoformat() if hasattr(log.get("createdAt"), "isoformat") else str(log.get("createdAt")),
            log.get("mode"),
            log.get("sourceLanguage"),
            log.get("targetLanguage"),
            log.get("originalText"),
            log.get("translatedText"),
            log.get("audioUrl", "")
        ])
        
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="unicomm_history_export.csv"'
    }
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers=headers
    )
