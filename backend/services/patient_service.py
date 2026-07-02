"""Patient profile, symptom logging, and care-link permission helpers."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import CareLink, SymptomLog, User, UserRole


def get_patient(db: Session, patient_id: int) -> User | None:
    user = db.get(User, patient_id)
    if user and user.role == UserRole.patient:
        return user
    return None


def patient_summary(user: User) -> str:
    """A compact, prompt-friendly description of the patient for the agents."""
    if not user:
        return "Unknown patient."
    parts = [f"Name: {user.name}"]
    if user.conditions:
        parts.append(f"Conditions: {user.conditions}")
    if user.accessibility_needs:
        parts.append(f"Accessibility needs: {user.accessibility_needs}")
    return " | ".join(parts)


def clamp_pain(value):
    """Coerce an untrusted (e.g. LLM-extracted) pain level to a valid int 0-10, else None."""
    try:
        return max(0, min(10, int(value)))
    except (TypeError, ValueError):
        return None


def log_symptom(
    db: Session, patient_id: int, description: str, pain_level: int | None = None
) -> SymptomLog:
    log = SymptomLog(
        patient_id=patient_id, description=description, pain_level=pain_level
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def recent_symptoms(db: Session, patient_id: int, limit: int = 5) -> list[SymptomLog]:
    return list(
        db.scalars(
            select(SymptomLog)
            .where(SymptomLog.patient_id == patient_id)
            .order_by(SymptomLog.logged_at.desc())
            .limit(limit)
        ).all()
    )


# ---------- Caregiver permission model ----------
def link_caregiver(
    db: Session, caregiver_id: int, patient_id: int, scopes: list[str]
) -> CareLink:
    """Create or update the caregiver↔patient link (one row per pair).

    Re-granting must UPDATE the existing link: inserting a duplicate would
    leave scope reads pinned to the first row (new scopes silently ignored)
    and double-send caregiver safety notifications.
    """
    link = db.scalar(
        select(CareLink).where(
            CareLink.caregiver_id == caregiver_id,
            CareLink.patient_id == patient_id,
        )
    )
    if link:
        link.scopes = ",".join(scopes)
    else:
        link = CareLink(
            caregiver_id=caregiver_id,
            patient_id=patient_id,
            scopes=",".join(scopes),
        )
        db.add(link)
    db.commit()
    db.refresh(link)
    return link


def caregiver_scopes(db: Session, caregiver_id: int, patient_id: int) -> set[str]:
    link = db.scalar(
        select(CareLink).where(
            CareLink.caregiver_id == caregiver_id,
            CareLink.patient_id == patient_id,
        )
    )
    if not link or not link.scopes:
        return set()
    return {s.strip() for s in link.scopes.split(",") if s.strip()}


def caregiver_can_see(
    db: Session, caregiver_id: int, patient_id: int, scope: str
) -> bool:
    return scope in caregiver_scopes(db, caregiver_id, patient_id)
