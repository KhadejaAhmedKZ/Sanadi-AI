"""AI Care Coordinator — agentic, multi-step orchestration from one message.

Given a single patient utterance, the Coordinator autonomously *plans and acts*:
it reviews medications & adherence, checks the recent symptom/pain trend, forms
an assessment, then takes the safe steps itself (logs the symptom, notifies the
Primary Carer, prepares a doctor briefing) and *proposes* the steps that need a
human sign-off (e.g. booking a visit). The response is a visible plan trace.

Prototype / decision-support: irreversible actions require confirmation, the
reasoning is rule-based (with an optional LLM summary), and all data is
synthetic. This is not a medical device and does not replace clinicians.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.database import get_db
from backend.services import (
    appointment_service,
    medication_service,
    notification_service,
    patient_service,
    risk_service,
)

router = APIRouter(prefix="/coordinator", tags=["coordinator"])

# Prototype heuristic: route a complaint to a plausible department.
_DEPT_KEYWORDS = {
    "Cardiology": ["chest", "heart", "palpitation", "pressure in"],
    "Neurology": ["dizzy", "dizziness", "headache", "migraine", "numb", "faint", "vision", "balance"],
    "Orthopedics": ["knee", "back", "joint", "shoulder", "hip", "ankle", "bone", "muscle"],
    "Endocrinology": ["sugar", "diabetes", "glucose", "insulin", "thirst"],
    "Pulmonology": ["cough", "asthma", "wheeze", "breath", "breathing"],
}


def _route_department(text: str) -> str:
    t = text.lower()
    for dept, keys in _DEPT_KEYWORDS.items():
        if any(k in t for k in keys):
            return dept
    return "General"


def _step(key, icon, title, detail, status="done", category="review", action=None):
    return {
        "key": key, "icon": icon, "title": title, "detail": detail,
        "status": status, "category": category, "action": action,
    }


def _fallback_summary(name: str, msg: str, dept: str, notified: bool) -> str:
    carer = "let your Primary Carer know, " if notified else ""
    return (
        f"I looked into “{msg}” for you — I reviewed your medications, checked your recent "
        f"symptom trend, logged it to your record, {carer}and prepared a briefing for your "
        f"doctor. I'd suggest a {dept} follow-up; just confirm and I'll book it."
    )


class RunRequest(BaseModel):
    patient_id: int
    message: str = Field(min_length=1, max_length=500)


class ConfirmRequest(BaseModel):
    patient_id: int
    action: str
    department: str = "General"
    reason: str = ""


@router.post("/run")
async def run(req: RunRequest, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    msg = req.message.strip()

    meds = medication_service.list_medications(db, req.patient_id)
    adherence = medication_service.adherence_rate(db, req.patient_id)
    missed = medication_service.missed_doses(db, req.patient_id)
    risk = risk_service.compute_risk(db, req.patient_id)
    dept = _route_department(msg)

    steps: list[dict] = []

    # ---- the AI "thinks": reviews the record ----
    steps.append(_step("understand", "🧠", "Understood your message", f"“{msg}”", category="review"))

    med_detail = f"{len(meds)} active medication(s) · adherence {int(adherence * 100)}%"
    if missed:
        med_detail += f" · {len(missed)} recent missed dose(s)"
    steps.append(_step("meds", "💊", "Reviewed your medications", med_detail, category="review"))

    pain_reason = next((r for r in risk["reasons"] if "pain" in r.lower()), None)
    steps.append(_step(
        "trend", "📈", "Checked your recent symptom trend",
        pain_reason or "No significant change in your recent pain trend.",
        category="review",
    ))

    if risk["reasons"]:
        assess = "Likely contributors — " + "; ".join(risk["reasons"][:3])
    else:
        assess = "No high-risk factors detected right now; continuing to monitor."
    steps.append(_step(
        "assess", "🩺", "Formed an assessment",
        f"{assess}.  (risk {risk['score']}/100 · {risk['level']})",
        category="insight",
    ))

    # ---- the AI acts: safe, reversible steps run now ----
    patient_service.log_symptom(db, req.patient_id, msg, None)
    steps.append(_step(
        "log", "📝", "Logged this symptom for your care team",
        "Saved to your health record so your doctor sees the full picture.",
        category="action",
    ))

    sent = notification_service.notify_caregivers(
        db,
        patient_id=req.patient_id,
        title="Sanadi flagged something worth a check-in",
        body=(f"{patient.name} reported: “{msg}”. The AI Care Coordinator logged it, "
              f"reviewed medications & trends, and prepared a doctor briefing."),
        scope="symptoms",
    )
    if sent:
        steps.append(_step(
            "notify", "👥", "Notified your Primary Carer",
            f"Sent to {len(sent)} carer(s) with permission — they can check in on you.",
            category="notify",
        ))
    else:
        steps.append(_step(
            "notify", "👥", "Primary Carer notification",
            "No carer is linked with symptom access yet, so nothing was sent.",
            status="skipped", category="notify",
        ))

    steps.append(_step(
        "brief", "🗂️", "Prepared a briefing for your doctor",
        f"A concise pre-visit summary is ready for the {dept} team.",
        category="brief",
    ))

    # ---- the AI proposes: irreversible step needs your OK ----
    steps.append(_step(
        "book", "📅", f"Book a {dept} follow-up",
        "The Coordinator can schedule this for you — your confirmation is required.",
        status="proposed", category="action", action="book_appointment",
    ))

    # Optional warm summary from Gemini, with a deterministic fallback so the
    # demo never depends on the network / free-tier limit.
    summary = _fallback_summary(patient.name, msg, dept, bool(sent))
    if gemini.online:
        try:
            prompt = (
                f"Patient {patient.name} said: '{msg}'. Facts — {med_detail}. "
                f"Assessment — {assess}. In 1–2 warm, plain sentences, tell the patient what you "
                f"(their AI care coordinator) just did on their behalf — reviewed medications, checked "
                f"trends, logged it, alerted their carer, prepared a doctor briefing — and that you "
                f"suggest a {dept} follow-up pending their approval. No diagnosis; supportive tone."
            )
            out = await gemini.generate(
                prompt,
                system_instruction="You are Sanadi's AI Care Coordinator. Be brief, warm and non-diagnostic.",
                temperature=0.4,
            )
            if out and not out.startswith("[offline]") and "trouble reaching" not in out:
                summary = out
        except Exception:
            pass

    return {
        "patient": {"id": patient.id, "name": patient.name},
        "message": msg,
        "department": dept,
        "risk": risk,
        "summary": summary,
        "steps": steps,
        "ai_online": gemini.online,
    }


@router.post("/confirm")
def confirm(req: ConfirmRequest, db: Session = Depends(get_db)):
    """Execute a step the Coordinator proposed but held for human sign-off."""
    patient = patient_service.get_patient(db, req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if req.action != "book_appointment":
        raise HTTPException(status_code=400, detail="Unknown action")

    when = (datetime.utcnow() + timedelta(days=2)).replace(
        hour=10, minute=0, second=0, microsecond=0
    )
    appt = appointment_service.book(
        db,
        patient_id=req.patient_id,
        scheduled_for=when,
        department=req.department or "General",
        reason=req.reason or "AI Care Coordinator follow-up",
        is_video=True,
    )
    return {
        "ok": True,
        "appointment": {
            "id": appt.id,
            "department": appt.department,
            "scheduled_for": appt.scheduled_for.isoformat(),
            "is_video": appt.is_video,
        },
    }
