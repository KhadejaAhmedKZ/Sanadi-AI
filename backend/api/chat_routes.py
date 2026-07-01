"""Chat endpoint — the single entry point patients talk to."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.agents.orchestrator import orchestrator
from backend.database import get_db
from backend.schemas import ChatRequest, ChatResponse
from backend.services import patient_service

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, req.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = await orchestrator.handle(db, req.patient_id, req.message)
    return ChatResponse(**result)
