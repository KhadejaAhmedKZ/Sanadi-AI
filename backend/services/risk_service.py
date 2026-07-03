"""Rule-based patient risk triage.

Deterministic and free (no LLM call) so the provider's patient list can be
ranked on every load. Each factor contributes points and a human-readable
reason; the AI explains, the rules decide.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Escalation, EscalationStatus, RehabSession, SymptomLog
from backend.services import medication_service


def _pain_series(db: Session, patient_id: int, limit: int = 12) -> list[int]:
    """Chronological (oldest→newest) recent pain levels."""
    rows = db.scalars(
        select(SymptomLog)
        .where(SymptomLog.patient_id == patient_id, SymptomLog.pain_level.is_not(None))
        .order_by(SymptomLog.logged_at.desc())
        .limit(limit)
    ).all()
    return [r.pain_level for r in reversed(rows)]


def compute_risk(db: Session, patient_id: int) -> dict:
    score = 0
    reasons: list[str] = []

    adherence = medication_service.adherence_rate(db, patient_id)
    if adherence < 0.7:
        score += 40
        reasons.append(f"Low medication adherence ({int(adherence * 100)}%)")
    elif adherence < 0.85:
        score += 15
        reasons.append(f"Slipping medication adherence ({int(adherence * 100)}%)")

    pain = _pain_series(db, patient_id)
    if len(pain) >= 4:
        older = pain[: len(pain) // 2]
        recent = pain[len(pain) // 2 :]
        older_avg = sum(older) / len(older)
        recent_avg = sum(recent) / len(recent)
        if recent_avg - older_avg >= 1.5:
            score += 30
            reasons.append(
                f"Pain trending up ({older_avg:.0f} → {recent_avg:.0f} avg)"
            )
    if pain and sum(pain[-3:]) / len(pain[-3:]) >= 7:
        score += 20
        reasons.append("High recent pain (≥7/10)")

    open_esc = db.scalar(
        select(Escalation).where(
            Escalation.patient_id == patient_id,
            Escalation.status == EscalationStatus.open,
        )
    )
    if open_esc:
        score += 30
        reasons.append("Primary Carer requested urgent review")

    # Rehab drop-off: had sessions before, but nothing in the last 7 days.
    last_session = db.scalar(
        select(RehabSession)
        .where(RehabSession.patient_id == patient_id)
        .order_by(RehabSession.completed_at.desc())
    )
    if last_session and last_session.completed_at < datetime.utcnow() - timedelta(days=7):
        score += 10
        reasons.append("No rehab activity in 7+ days")

    score = min(score, 100)
    level = "high" if score >= 50 else "watch" if score >= 20 else "stable"
    return {"score": score, "level": level, "reasons": reasons}
