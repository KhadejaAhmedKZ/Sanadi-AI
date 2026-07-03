"""Caregiver endpoints — permission-gated patient overview and notifications."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.database import get_db
from backend.schemas import CareLinkCreate, NotificationOut
from backend.services import (
    appointment_service,
    escalation_service,
    medication_service,
    notification_service,
    patient_service,
)

router = APIRouter(prefix="/caregivers", tags=["caregivers"])


class EscalationCreate(BaseModel):
    caregiver_id: int
    patient_id: int
    reason: str = Field(min_length=3, max_length=400)


@router.post("/link", status_code=201)
def link(payload: CareLinkCreate, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    link = patient_service.link_caregiver(
        db, payload.caregiver_id, payload.patient_id, payload.scopes
    )
    return {"id": link.id, "scopes": link.scopes}


@router.get("/{caregiver_id}/patients/{patient_id}/overview")
def overview(caregiver_id: int, patient_id: int, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    scopes = patient_service.caregiver_scopes(db, caregiver_id, patient_id)
    if not scopes:
        raise HTTPException(
            status_code=403, detail="No permission to view this patient"
        )

    overview: dict = {"patient": {"id": patient.id, "name": patient.name}}
    if "medications" in scopes:
        overview["adherence_rate"] = medication_service.adherence_rate(db, patient_id)
        overview["missed_doses"] = len(medication_service.missed_doses(db, patient_id))
    if "appointments" in scopes:
        appts = appointment_service.list_appointments(db, patient_id, upcoming_only=True)
        overview["upcoming_appointments"] = [
            {"department": a.department, "when": a.scheduled_for.isoformat()}
            for a in appts
        ]
    if "symptoms" in scopes:
        overview["recent_symptoms"] = [
            {"description": s.description, "pain_level": s.pain_level}
            for s in patient_service.recent_symptoms(db, patient_id)
        ]
    return overview


@router.get("/{caregiver_id}/notifications", response_model=list[NotificationOut])
def notifications(caregiver_id: int, db: Session = Depends(get_db)):
    return notification_service.list_notifications(db, caregiver_id)


@router.post("/escalations", status_code=201)
def raise_escalation(payload: EscalationCreate, db: Session = Depends(get_db)):
    """Caregiver requests an urgent provider review of their patient."""
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    scopes = patient_service.caregiver_scopes(db, payload.caregiver_id, payload.patient_id)
    if not scopes:
        raise HTTPException(status_code=403, detail="No permission for this patient")
    esc = escalation_service.raise_escalation(
        db, payload.caregiver_id, payload.patient_id, payload.reason.strip()
    )
    return {"id": esc.id, "status": esc.status.value}


@router.get("/{caregiver_id}/patients/{patient_id}/education")
async def education(caregiver_id: int, patient_id: int, db: Session = Depends(get_db)):
    """AI guide for the caregiver: what's normal for this patient right now,
    condition facts, and the red flags that genuinely warrant concern."""
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    scopes = patient_service.caregiver_scopes(db, caregiver_id, patient_id)
    if not scopes:
        raise HTTPException(status_code=403, detail="No permission for this patient")

    symptoms = patient_service.recent_symptoms(db, patient_id)
    symptom_text = (
        "; ".join(
            f"{s.description} (pain {s.pain_level}/10)" if s.pain_level is not None else s.description
            for s in symptoms
        )
        or "none recorded recently"
    )
    prompt = (
        "You are writing for a worried PRIMARY CARER — a trusted family member or support person (not a clinician). "
        f"They care for a patient with: {patient.conditions or 'no recorded conditions'}. "
        f"Recent symptoms: {symptom_text}.\n\n"
        "Write a short, warm, plain-language guide in markdown with exactly these sections:\n"
        "## Is this normal?\n(reassure honestly: which of these feelings/symptoms are "
        "expected for this condition and recovery stage)\n"
        "## About the condition\n(3 short facts that help them understand what the patient "
        "is going through)\n"
        "## When to actually worry\n(3-4 specific red flags that mean call a doctor)\n"
        "## How you can help today\n(2-3 practical things)\n\n"
        "Keep it under 250 words total. Do not diagnose. Be kind and specific."
    )
    guide = await gemini.generate(prompt, temperature=0.4)
    return {"patient_id": patient_id, "guide": guide}
