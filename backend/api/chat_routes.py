"""Chat endpoints — text and image, the entry points patients talk to."""
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.agents.orchestrator import orchestrator
from backend.agents.safety_agent import _looks_critical
from backend.agents.vision_agent import ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES, vision_agent
from backend.ai import memory
from backend.database import get_db
from backend.schemas import ChatRequest, ChatResponse
from backend.services import notification_service, patient_service

router = APIRouter(prefix="/chat", tags=["chat"])

_EMERGENCY_TEXT = (
    "🚨 This sounds like it could be urgent.\n\n"
    "If you may be in danger, please contact your local emergency number or go "
    "to the nearest emergency department right now. I've flagged this and, if "
    "permitted, notified your caregiver."
)


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, req.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = await orchestrator.handle(db, req.patient_id, req.message)
    return ChatResponse(**result)


@router.post("/image", response_model=ChatResponse)
async def chat_image(
    patient_id: int = Form(...),
    message: str = Form(""),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400, detail="Unsupported image type. Use JPEG, PNG, or WebP."
        )

    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 8MB).")

    log_label = f"[photo] {message.strip()}" if message.strip() else "[photo]"

    # Offline safety net on the accompanying caption — zero API calls.
    if message and _looks_critical(message):
        notification_service.notify_caregivers(
            db,
            patient_id=patient_id,
            title="⚠️ Urgent: possible emergency reported with a photo",
            body=f"{patient.name} shared a photo and said: “{message}”",
            scope="safety",
        )
        memory.save_turn(
            db, patient_id, log_label, _EMERGENCY_TEXT, agents_used=json.dumps(["safety"])
        )
        return ChatResponse(
            reply=_EMERGENCY_TEXT, emergency=True, agents_used=["safety"], contributions=[]
        )

    patient_summary = patient_service.patient_summary(patient)
    analysis = await vision_agent.analyze(data, image.content_type, message, patient_summary)

    used = [vision_agent.name]
    memory.save_turn(db, patient_id, log_label, analysis, agents_used=json.dumps(used))

    return ChatResponse(reply=analysis, emergency=False, agents_used=used, contributions=[])
