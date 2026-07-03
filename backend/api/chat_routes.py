"""Chat endpoints — patient chat, image analysis, and role-specific assistants."""
import json
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.agents.orchestrator import orchestrator
from backend.agents.safety_agent import _looks_critical
from backend.agents.vision_agent import ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES, vision_agent
from backend.ai import memory
from backend.ai.gemini_client import gemini
from backend.ai.prompts import CAREGIVER_ASSISTANT, PROVIDER_ASSISTANT
from backend.database import get_db
from backend.models import CareLink, Escalation, EscalationStatus, User, UserRole
from backend.schemas import ChatRequest, ChatResponse
from backend.services import (
    appointment_service,
    medication_service,
    notification_service,
    patient_service,
    risk_service,
)

router = APIRouter(prefix="/chat", tags=["chat"])

_EMERGENCY_TEXT = (
    "🚨 This sounds like it could be urgent.\n\n"
    "If you may be in danger, please contact your local emergency number or go "
    "to the nearest emergency department right now. I've flagged this and, if "
    "permitted, notified your Primary Carer."
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


# ---------- Role assistants (caregiver + provider) ----------
class AssistantRequest(BaseModel):
    user_id: int
    role: Literal["caregiver", "provider"]
    message: str = Field(min_length=1, max_length=2000)
    patient_id: int | None = None
    # Last few turns from the client so the assistant keeps thread context
    # without polluting the patient conversation memory table.
    history: list[dict] = Field(default_factory=list, max_length=10)


def _caregiver_context(db: Session, caregiver_id: int, patient_id: int | None) -> str:
    links = db.scalars(
        select(CareLink).where(CareLink.caregiver_id == caregiver_id)
    ).all()
    if not links:
        return ""
    link = next((l for l in links if l.patient_id == patient_id), links[0])
    patient = patient_service.get_patient(db, link.patient_id)
    if not patient:
        return ""
    scopes = {s.strip() for s in (link.scopes or "").split(",") if s.strip()}

    parts = [
        f"Patient: {patient.name}",
        f"Conditions: {patient.conditions or 'none recorded'}",
        f"Primary Carer's permitted scopes: {', '.join(sorted(scopes)) or 'none'}",
    ]
    if "medications" in scopes:
        meds = medication_service.list_medications(db, patient.id)
        adherence = medication_service.adherence_rate(db, patient.id)
        parts.append(f"Medications: {', '.join(m.name for m in meds) or 'none'}")
        parts.append(f"Medication adherence: {int(adherence * 100)}%")
    if "symptoms" in scopes:
        syms = patient_service.recent_symptoms(db, patient.id)
        parts.append(
            "Recent symptoms: "
            + ("; ".join(
                f"{s.description} (pain {s.pain_level}/10)" if s.pain_level is not None else s.description
                for s in syms
            ) or "none")
        )
    if "appointments" in scopes:
        appts = appointment_service.list_appointments(db, patient.id, upcoming_only=True)
        parts.append(
            "Upcoming appointments: "
            + ("; ".join(f"{a.department} on {a.scheduled_for:%b %d %H:%M}" for a in appts) or "none")
        )
    return "\n".join(parts)


def _provider_context(db: Session) -> str:
    patients = db.query(User).filter(User.role == UserRole.patient).all()
    lines = []
    for p in patients:
        risk = risk_service.compute_risk(db, p.id)
        adherence = medication_service.adherence_rate(db, p.id)
        syms = patient_service.recent_symptoms(db, p.id, limit=2)
        latest = "; ".join(
            f"{s.description} (pain {s.pain_level}/10)" if s.pain_level is not None else s.description
            for s in syms
        ) or "none"
        lines.append(
            f"- {p.name} (id {p.id}) | {p.conditions or 'no conditions'} | "
            f"adherence {int(adherence * 100)}% | risk {risk['score']} ({risk['level']})"
            + (f" — {'; '.join(risk['reasons'])}" if risk["reasons"] else "")
            + f" | latest symptoms: {latest}"
        )
    escalations = db.scalars(
        select(Escalation).where(Escalation.status != EscalationStatus.resolved)
    ).all()
    names = {p.id: p.name for p in patients}
    esc_lines = [
        f"- {names.get(e.patient_id, 'Unknown')}: “{e.reason}” ({e.status.value})"
        for e in escalations
    ] or ["- none"]
    return "Patient panel:\n" + "\n".join(lines) + "\n\nOpen urgent review requests:\n" + "\n".join(esc_lines)


@router.post("/assistant", response_model=ChatResponse)
async def role_assistant(req: AssistantRequest, db: Session = Depends(get_db)):
    user = db.get(User, req.user_id)
    if not user or user.role.value != req.role:
        raise HTTPException(status_code=403, detail="Not authorized for this assistant")

    # Offline safety net for caregivers describing an emergency — zero API calls.
    if req.role == "caregiver" and _looks_critical(req.message):
        return ChatResponse(
            reply=(
                "🚨 That sounds like it could be an emergency.\n\n"
                "If the patient is in immediate danger, call your local emergency "
                "number now — don't wait.\n\nOnce they're safe, use the "
                "**Request urgent review** button in your portal so the care team "
                "follows up right away."
            ),
            emergency=True,
            agents_used=[],
            contributions=[],
        )

    if req.role == "caregiver":
        context = _caregiver_context(db, req.user_id, req.patient_id)
        if not context:
            return ChatResponse(
                reply=(
                    "You're not linked to a patient yet. Open your portal and use "
                    "“Switch patient / access” to connect first — then I can answer "
                    "questions about their care."
                ),
                emergency=False,
                agents_used=[],
                contributions=[],
            )
        system = CAREGIVER_ASSISTANT
    else:
        context = _provider_context(db)
        system = PROVIDER_ASSISTANT

    transcript = "\n".join(
        f"{'User' if (m.get('role') == 'user') else 'Assistant'}: {str(m.get('text', ''))[:400]}"
        for m in req.history[-6:]
    )
    prompt = (
        f"DATA:\n{context}\n\n"
        + (f"CONVERSATION SO FAR:\n{transcript}\n\n" if transcript else "")
        + f"User: {req.message.strip()}"
    )
    reply = await gemini.generate(prompt, system_instruction=system, temperature=0.4)
    return ChatResponse(reply=reply, emergency=False, agents_used=[], contributions=[])
