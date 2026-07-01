"""Notifications — used by the Safety Agent to alert caregivers, etc."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import CareLink, Notification


def notify(
    db: Session, recipient_id: int, title: str, body: str, urgent: bool = False
) -> Notification:
    note = Notification(
        recipient_id=recipient_id, title=title, body=body, urgent=urgent
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def notify_caregivers(
    db: Session, patient_id: int, title: str, body: str, scope: str = "safety"
) -> list[Notification]:
    """Notify every caregiver who has the given permission scope for this patient."""
    links = db.scalars(
        select(CareLink).where(CareLink.patient_id == patient_id)
    ).all()
    sent: list[Notification] = []
    for link in links:
        scopes = {s.strip() for s in (link.scopes or "").split(",")}
        if scope in scopes:
            sent.append(notify(db, link.caregiver_id, title, body, urgent=True))
    return sent


def list_notifications(db: Session, recipient_id: int) -> list[Notification]:
    return list(
        db.scalars(
            select(Notification)
            .where(Notification.recipient_id == recipient_id)
            .order_by(Notification.created_at.desc())
        ).all()
    )
