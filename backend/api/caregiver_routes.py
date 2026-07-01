"""Caregiver endpoints — permission-gated patient overview and notifications."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import CareLinkCreate, NotificationOut
from backend.services import (
    appointment_service,
    medication_service,
    notification_service,
    patient_service,
)

router = APIRouter(prefix="/caregivers", tags=["caregivers"])


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
