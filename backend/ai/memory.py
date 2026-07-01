"""Conversation memory helpers backed by the ``messages`` table."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Message


def load_history(db: Session, patient_id: int, limit: int = 8) -> list[Message]:
    """Return the most recent messages (oldest-first) for a patient."""
    rows = db.scalars(
        select(Message)
        .where(Message.patient_id == patient_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    ).all()
    return list(reversed(rows))


def format_history(messages: list[Message]) -> str:
    if not messages:
        return "(no prior conversation)"
    lines = []
    for m in messages:
        who = "Patient" if m.role == "user" else "Sanadi"
        lines.append(f"{who}: {m.content}")
    return "\n".join(lines)


def save_turn(
    db: Session,
    patient_id: int,
    user_message: str,
    assistant_message: str,
    agents_used: str | None = None,
) -> None:
    db.add(Message(patient_id=patient_id, role="user", content=user_message))
    db.add(
        Message(
            patient_id=patient_id,
            role="assistant",
            content=assistant_message,
            agents_used=agents_used,
        )
    )
    db.commit()
