"""Appointment booking, rescheduling, and cancellation."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Appointment, AppointmentStatus


def list_appointments(
    db: Session, patient_id: int, upcoming_only: bool = False
) -> list[Appointment]:
    stmt = select(Appointment).where(Appointment.patient_id == patient_id)
    if upcoming_only:
        stmt = stmt.where(
            Appointment.scheduled_for >= datetime.utcnow(),
            Appointment.status == AppointmentStatus.scheduled,
        )
    return list(db.scalars(stmt.order_by(Appointment.scheduled_for)).all())


def book(
    db: Session,
    patient_id: int,
    scheduled_for: datetime,
    department: str = "General",
    reason: str = "",
    provider_id: int | None = None,
) -> Appointment:
    appt = Appointment(
        patient_id=patient_id,
        scheduled_for=scheduled_for,
        department=department,
        reason=reason,
        provider_id=provider_id,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def reschedule(db: Session, appointment_id: int, new_time: datetime) -> Appointment | None:
    appt = db.get(Appointment, appointment_id)
    if not appt:
        return None
    appt.scheduled_for = new_time
    appt.status = AppointmentStatus.scheduled
    db.commit()
    db.refresh(appt)
    return appt


def cancel(db: Session, appointment_id: int) -> Appointment | None:
    appt = db.get(Appointment, appointment_id)
    if not appt:
        return None
    appt.status = AppointmentStatus.cancelled
    db.commit()
    db.refresh(appt)
    return appt
