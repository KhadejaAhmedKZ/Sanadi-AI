"""AI Vision Emergency Monitoring — event log + auto Primary Carer alerting.

Detection itself runs 100% on the patient's device (browser camera, frames
analyzed locally, never uploaded). This API only records emergency EVENTS
the device reports, and — when the patient doesn't confirm they're OK — fans
out a safety alert to their linked Primary Carers through the existing
notification pipeline.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import EmergencyEvent
from backend.services import notification_service, patient_service

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

EVENT_LABELS = {
    "possible_fall": "Possible fall",
    "sudden_inactivity": "Sudden inactivity",
    "no_movement": "No movement after motion spike",
    "calling_for_help": "Possible call for help",
    "manual_test": "Monitoring test",
}


class EventCreate(BaseModel):
    patient_id: int
    event_type: str = "possible_fall"
    confidence: int = Field(default=0, ge=0, le=100)
    detail: str = Field(default="", max_length=300)


class EventRespond(BaseModel):
    status: str  # confirmed_ok | help_needed | auto_escalated


def _serialize(e: EmergencyEvent) -> dict:
    return {
        "id": e.id,
        "event_type": e.event_type,
        "label": EVENT_LABELS.get(e.event_type, e.event_type.replace("_", " ").title()),
        "status": e.status,
        "confidence": e.confidence,
        "detail": e.detail,
        "created_at": e.created_at.isoformat(),
        "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
    }


@router.post("/events", status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    e = EmergencyEvent(
        patient_id=payload.patient_id,
        event_type=payload.event_type,
        confidence=payload.confidence,
        detail=payload.detail.strip(),
        status="detected",
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return _serialize(e)


@router.post("/events/{event_id}/respond")
def respond_event(event_id: int, payload: EventRespond, db: Session = Depends(get_db)):
    e = db.get(EmergencyEvent, event_id)
    if not e:
        raise HTTPException(status_code=404, detail="Event not found")
    if payload.status not in ("confirmed_ok", "help_needed", "auto_escalated"):
        raise HTTPException(status_code=422, detail="Invalid status")
    e.status = payload.status
    e.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(e)

    # Escalate to Primary Carers unless the patient confirmed they're OK.
    if payload.status in ("help_needed", "auto_escalated"):
        patient = patient_service.get_patient(db, e.patient_id)
        label = EVENT_LABELS.get(e.event_type, "Emergency")
        how = "asked for help" if payload.status == "help_needed" else "did not respond"
        notification_service.notify_caregivers(
            db,
            patient_id=e.patient_id,
            title=f"🚨 Emergency: {label} — {patient.name if patient else 'patient'}",
            body=(
                f"AI Vision monitoring detected: {label}. The patient {how} within "
                f"the safety countdown. Please check on them now."
            ),
            scope="safety",
        )
    return _serialize(e)


@router.get("/patients/{patient_id}/events")
def list_events(patient_id: int, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    rows = db.scalars(
        select(EmergencyEvent)
        .where(EmergencyEvent.patient_id == patient_id)
        .order_by(EmergencyEvent.created_at.desc())
        .limit(50)
    ).all()
    events = [_serialize(r) for r in rows]
    emergencies = [e for e in events if e["status"] in ("help_needed", "auto_escalated")]
    false_alarms = [e for e in events if e["status"] == "confirmed_ok"]
    return {
        "events": events,
        "emergency_count": len(emergencies),
        "false_alarm_count": len(false_alarms),
    }
