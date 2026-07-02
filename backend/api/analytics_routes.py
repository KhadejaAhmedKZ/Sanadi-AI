"""Analytics endpoints for patients and providers."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, UserRole
from backend.services import medication_service, patient_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/patients/{patient_id}")
def patient_analytics(patient_id: int, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    symptoms = patient_service.recent_symptoms(db, patient_id, limit=20)
    pain = [s.pain_level for s in symptoms if s.pain_level is not None]

    # Chronological (oldest→newest) dated series for trend charts.
    pain_series = [
        {"date": s.logged_at.strftime("%b %d"), "pain": s.pain_level}
        for s in reversed(symptoms)
        if s.pain_level is not None
    ]

    # Daily dose outcomes for the last 14 days.
    from collections import defaultdict
    from datetime import datetime, timedelta

    from sqlalchemy import select
    from backend.models import Medication, MedicationLog

    cutoff = datetime.utcnow() - timedelta(days=14)
    logs = db.scalars(
        select(MedicationLog)
        .join(Medication)
        .where(Medication.patient_id == patient_id, MedicationLog.logged_at >= cutoff)
        .order_by(MedicationLog.logged_at)
    ).all()
    daily: dict[str, dict] = defaultdict(lambda: {"taken": 0, "missed": 0})
    for log in logs:
        day = log.logged_at.strftime("%b %d")
        daily[day]["taken" if log.taken else "missed"] += 1
    dose_series = [{"date": d, **v} for d, v in daily.items()]

    return {
        "adherence_rate": medication_service.adherence_rate(db, patient_id),
        "active_medications": len(medication_service.list_medications(db, patient_id)),
        "recent_symptom_count": len(symptoms),
        "avg_recent_pain": round(sum(pain) / len(pain), 1) if pain else None,
        "pain_trend": pain[:10],
        "pain_series": pain_series,
        "dose_series": dose_series,
    }


@router.get("/population")
def population_insights(db: Session = Depends(get_db)):
    """High-risk / adherence overview across all patients (provider view)."""
    patients = db.query(User).filter(User.role == UserRole.patient).all()
    rows = [
        {
            "id": p.id,
            "name": p.name,
            "adherence_rate": medication_service.adherence_rate(db, p.id),
            "missed_doses": len(medication_service.missed_doses(db, p.id)),
        }
        for p in patients
    ]
    high_risk = [r for r in rows if r["adherence_rate"] < 0.7]
    return {
        "total_patients": len(rows),
        "avg_adherence": (
            round(sum(r["adherence_rate"] for r in rows) / len(rows), 2) if rows else 0
        ),
        "high_risk_patients": high_risk,
    }
