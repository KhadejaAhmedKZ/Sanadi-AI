"""Healthcare provider endpoints — patient list and AI-generated visit summaries."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.ai.prompts import CLINICAL_AGENT
from backend.database import get_db
from backend.models import User, UserRole
from backend.services import (
    appointment_service,
    medication_service,
    patient_service,
)

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/patients")
def all_patients(db: Session = Depends(get_db)):
    patients = db.query(User).filter(User.role == UserRole.patient).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "conditions": p.conditions,
            "adherence_rate": medication_service.adherence_rate(db, p.id),
        }
        for p in patients
    ]


@router.get("/patients/{patient_id}/summary")
async def ai_summary(patient_id: int, db: Session = Depends(get_db)):
    """Clinical-Agent-generated pre-visit summary to save the provider time."""
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    meds = medication_service.list_medications(db, patient_id)
    symptoms = patient_service.recent_symptoms(db, patient_id)
    adherence = medication_service.adherence_rate(db, patient_id)
    upcoming = appointment_service.list_appointments(db, patient_id, upcoming_only=True)

    data = (
        f"Patient: {patient.name}\n"
        f"Conditions: {patient.conditions or 'none recorded'}\n"
        f"Medication adherence: {int(adherence * 100)}%\n"
        f"Active medications: {', '.join(m.name for m in meds) or 'none'}\n"
        f"Recent symptoms: "
        + (
            "; ".join(
                f"{s.description} (pain {s.pain_level})"
                if s.pain_level is not None
                else s.description
                for s in symptoms
            )
            or "none"
        )
        + f"\nUpcoming appointments: {len(upcoming)}"
    )

    prompt = (
        "Create a concise pre-visit clinical summary for a doctor based on this "
        "data. Include: recent concerns, current treatment, and suggested "
        "discussion points. Keep it brief and factual.\n\n" + data
    )
    summary = await gemini.generate(
        prompt, system_instruction=CLINICAL_AGENT, temperature=0.2
    )
    return {"patient_id": patient_id, "summary": summary, "data": data}
