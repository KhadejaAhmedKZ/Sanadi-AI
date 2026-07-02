"""Healthcare provider endpoints — patient list and AI-generated visit summaries."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.ai.prompts import CLINICAL_AGENT
from backend.database import get_db
from backend.models import (
    Appointment,
    AppointmentStatus,
    EscalationStatus,
    RehabSession,
    User,
    UserRole,
)
from backend.services import (
    appointment_service,
    escalation_service,
    medication_service,
    patient_service,
    risk_service,
)

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/patients")
def all_patients(db: Session = Depends(get_db)):
    """Roster with rule-based risk triage, highest risk first."""
    patients = db.query(User).filter(User.role == UserRole.patient).all()
    rows = []
    for p in patients:
        risk = risk_service.compute_risk(db, p.id)
        rows.append(
            {
                "id": p.id,
                "name": p.name,
                "conditions": p.conditions,
                "adherence_rate": medication_service.adherence_rate(db, p.id),
                "risk_score": risk["score"],
                "risk_level": risk["level"],
                "risk_reasons": risk["reasons"],
            }
        )
    rows.sort(key=lambda r: r["risk_score"], reverse=True)
    return rows


@router.get("/appointments/queue")
def appointment_queue(days: int = 7, db: Session = Depends(get_db)):
    """Upcoming scheduled appointments across all patients, soonest first."""
    now = datetime.utcnow()
    window_end = now + timedelta(days=days)
    rows = db.scalars(
        select(Appointment)
        .where(
            Appointment.status == AppointmentStatus.scheduled,
            Appointment.scheduled_for >= now,
            Appointment.scheduled_for <= window_end,
        )
        .order_by(Appointment.scheduled_for)
    ).all()
    patients = {p.id: p.name for p in db.query(User).filter(User.role == UserRole.patient).all()}
    return [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": patients.get(a.patient_id, "Unknown"),
            "department": a.department,
            "reason": a.reason,
            "scheduled_for": a.scheduled_for,
        }
        for a in rows
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


# ---------- Escalations (caregiver → provider loop) ----------
class EscalationStatusUpdate(BaseModel):
    status: EscalationStatus
    provider_id: int


@router.get("/escalations")
def escalations(include_resolved: bool = False, db: Session = Depends(get_db)):
    return escalation_service.list_escalations(db, include_resolved)


@router.post("/escalations/{escalation_id}/status")
def set_escalation_status(
    escalation_id: int, payload: EscalationStatusUpdate, db: Session = Depends(get_db)
):
    esc = escalation_service.update_status(
        db, escalation_id, payload.status, payload.provider_id
    )
    if not esc:
        raise HTTPException(status_code=404, detail="Escalation not found")
    return {"id": esc.id, "status": esc.status.value}


# ---------- Case Insights: learn from panel outcomes ----------
def _case_profile(db: Session, p: User) -> dict:
    """Anonymous outcome snapshot of one patient for cohort comparison."""
    pain = risk_service._pain_series(db, p.id)
    adherence = medication_service.adherence_rate(db, p.id)
    sessions = db.scalars(
        select(RehabSession).where(RehabSession.patient_id == p.id)
    ).all()
    early = sum(pain[: len(pain) // 2]) / max(len(pain) // 2, 1) if len(pain) >= 2 else None
    late = sum(pain[len(pain) // 2 :]) / max(len(pain) - len(pain) // 2, 1) if len(pain) >= 2 else None
    if early is not None and late is not None:
        outcome = "improved" if late < early - 0.5 else "worsened" if late > early + 0.5 else "stable"
    else:
        outcome = "unknown"
    return {
        "conditions": p.conditions or "unrecorded",
        "adherence_pct": int(adherence * 100),
        "rehab_sessions": len(sessions),
        "pain_start": round(early, 1) if early is not None else None,
        "pain_now": round(late, 1) if late is not None else None,
        "outcome": outcome,
    }


@router.get("/patients/{patient_id}/case-insights")
async def case_insights(patient_id: int, db: Session = Depends(get_db)):
    """AI analysis of past panel outcomes: what worked, what failed, and how
    to keep THIS patient off the failure path. Cases are anonymized."""
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    others = (
        db.query(User)
        .filter(User.role == UserRole.patient, User.id != patient_id)
        .all()
    )
    cohort = []
    for i, p in enumerate(others):
        prof = _case_profile(db, p)
        if prof["outcome"] != "unknown":
            cohort.append(f"Case {chr(65 + i)}: {prof}")
    if not cohort:
        return {
            "patient_id": patient_id,
            "insights": (
                "Not enough historical cases in the panel yet to compare outcomes. "
                "Insights will appear as more patient history accumulates."
            ),
            "cases_analyzed": 0,
        }

    current = _case_profile(db, patient)
    prompt = (
        "You are advising a physician. Below are ANONYMIZED outcome snapshots of "
        "previous patients from this clinic's panel, followed by the current "
        "patient.\n\nPast cases:\n" + "\n".join(cohort) +
        f"\n\nCurrent patient ({patient.name}): {current}\n\n"
        "Write a concise markdown briefing with exactly these sections:\n"
        "## ✅ What worked in similar cases\n"
        "## ⚠️ What preceded setbacks\n"
        "## 🎯 Recommendations for this patient\n(3 specific actions to keep them "
        "off the failure path)\n\n"
        "Ground every claim in the data shown (adherence %, rehab sessions, pain "
        "trajectory). Under 220 words. No diagnosis, no medication changes."
    )
    insights = await gemini.generate(
        prompt, system_instruction=CLINICAL_AGENT, temperature=0.3
    )
    return {
        "patient_id": patient_id,
        "insights": insights,
        "cases_analyzed": len(cohort),
    }
