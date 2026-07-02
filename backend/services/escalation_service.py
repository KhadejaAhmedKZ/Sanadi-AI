"""Caregiver→provider escalations: the connected-care loop.

A caregiver raises an urgent review request; it lands at the top of every
provider's queue; when the provider acknowledges/resolves it, the caregiver
is notified back — closing the loop.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Escalation, EscalationStatus, User, UserRole
from backend.services import notification_service


def raise_escalation(
    db: Session, caregiver_id: int, patient_id: int, reason: str
) -> Escalation:
    # One open escalation per patient — refresh the reason instead of stacking.
    esc = db.scalar(
        select(Escalation).where(
            Escalation.patient_id == patient_id,
            Escalation.status == EscalationStatus.open,
        )
    )
    if esc:
        esc.reason = reason
        esc.raised_by = caregiver_id
    else:
        esc = Escalation(patient_id=patient_id, raised_by=caregiver_id, reason=reason)
        db.add(esc)
    db.commit()
    db.refresh(esc)

    # Ping every provider's notification feed.
    patient = db.get(User, patient_id)
    providers = db.scalars(select(User).where(User.role == UserRole.provider)).all()
    for p in providers:
        notification_service.notify(
            db,
            p.id,
            f"Urgent review requested for {patient.name if patient else f'patient {patient_id}'}",
            reason,
            urgent=True,
        )
    return esc


def list_escalations(db: Session, include_resolved: bool = False) -> list[dict]:
    stmt = select(Escalation).order_by(Escalation.created_at.desc())
    if not include_resolved:
        stmt = stmt.where(Escalation.status != EscalationStatus.resolved)
    rows = db.scalars(stmt).all()
    users = {u.id: u.name for u in db.scalars(select(User)).all()}
    return [
        {
            "id": e.id,
            "patient_id": e.patient_id,
            "patient_name": users.get(e.patient_id, "Unknown"),
            "raised_by_name": users.get(e.raised_by, "Caregiver"),
            "reason": e.reason,
            "status": e.status.value,
            "created_at": e.created_at.isoformat(),
        }
        for e in rows
    ]


def update_status(
    db: Session, escalation_id: int, status: EscalationStatus, provider_id: int
) -> Escalation | None:
    esc = db.get(Escalation, escalation_id)
    if not esc:
        return None
    esc.status = status
    if status == EscalationStatus.resolved:
        esc.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(esc)

    # Close the loop: tell the caregiver their request was seen/handled.
    provider = db.get(User, provider_id)
    patient = db.get(User, esc.patient_id)
    verb = "is reviewing" if status == EscalationStatus.acknowledged else "has reviewed"
    notification_service.notify(
        db,
        esc.raised_by,
        f"{provider.name if provider else 'The care team'} {verb} your request",
        f"Your urgent review request for {patient.name if patient else 'the patient'} "
        f"has been {status.value}.",
        urgent=False,
    )
    return esc
