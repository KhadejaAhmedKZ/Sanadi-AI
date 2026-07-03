"""Lab results — providers add results, patients view them, AI explains them."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.database import get_db
from backend.models import LabResult, User, UserRole
from backend.services import patient_service

router = APIRouter(prefix="/labs", tags=["labs"])

ALLOWED_STATUSES = {"normal", "high", "low"}


class LabCreate(BaseModel):
    patient_id: int
    provider_id: int
    test_name: str = Field(min_length=1, max_length=160)
    value: str = Field(min_length=1, max_length=60)
    unit: str = Field(default="", max_length=40)
    reference_range: str = Field(default="", max_length=80)
    status: str = "normal"
    notes: str = Field(default="", max_length=300)
    taken_at: datetime | None = None


def _serialize(r: LabResult) -> dict:
    return {
        "id": r.id,
        "test_name": r.test_name,
        "value": r.value,
        "unit": r.unit,
        "reference_range": r.reference_range,
        "status": r.status,
        "notes": r.notes,
        "taken_at": r.taken_at.isoformat(),
    }


@router.post("", status_code=201)
def add_lab(payload: LabCreate, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    provider = db.get(User, payload.provider_id)
    if not provider or provider.role != UserRole.provider:
        raise HTTPException(status_code=403, detail="Only providers can add lab results")
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=422, detail="status must be normal, high, or low")
    lab = LabResult(
        patient_id=payload.patient_id,
        test_name=payload.test_name.strip(),
        value=payload.value.strip(),
        unit=payload.unit.strip(),
        reference_range=payload.reference_range.strip(),
        status=payload.status,
        notes=payload.notes.strip(),
        taken_at=payload.taken_at or datetime.utcnow(),
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return _serialize(lab)


@router.get("/patients/{patient_id}")
def list_labs(patient_id: int, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    rows = db.scalars(
        select(LabResult)
        .where(LabResult.patient_id == patient_id)
        .order_by(LabResult.taken_at.desc())
    ).all()
    return [_serialize(r) for r in rows]


@router.get("/patients/{patient_id}/explain")
async def explain_labs(patient_id: int, db: Session = Depends(get_db)):
    """Plain-language AI explanation of the patient's most recent results."""
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    rows = db.scalars(
        select(LabResult)
        .where(LabResult.patient_id == patient_id)
        .order_by(LabResult.taken_at.desc())
        .limit(12)
    ).all()
    if not rows:
        return {"patient_id": patient_id, "explanation": "No lab results on file yet."}

    lines = "\n".join(
        f"- {r.test_name}: {r.value} {r.unit} (reference {r.reference_range or 'n/a'}, "
        f"flagged {r.status}) on {r.taken_at:%b %d}"
        for r in rows
    )
    prompt = (
        f"You are explaining lab results to a PATIENT (not a clinician). "
        f"Patient conditions: {patient.conditions or 'none recorded'}.\n"
        f"Results:\n{lines}\n\n"
        "Write a warm, plain-language explanation in markdown: start with the "
        "overall picture in one sentence, then explain what each flagged (high/low) "
        "result means in everyday terms and what typically helps, and close with "
        "what to discuss with the doctor. Do not diagnose. Under 200 words."
    )
    explanation = await gemini.generate(prompt, temperature=0.4)
    return {"patient_id": patient_id, "explanation": explanation}
