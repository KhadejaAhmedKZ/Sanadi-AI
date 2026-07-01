"""Medication CRUD, adherence, and dose logging."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Medication, MedicationLog


def list_medications(db: Session, patient_id: int) -> list[Medication]:
    return list(
        db.scalars(
            select(Medication).where(
                Medication.patient_id == patient_id, Medication.active.is_(True)
            )
        ).all()
    )


def add_medication(
    db: Session, patient_id: int, name: str, dosage: str = "", schedule: str = ""
) -> Medication:
    med = Medication(patient_id=patient_id, name=name, dosage=dosage, schedule=schedule)
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def log_dose(db: Session, medication_id: int, taken: bool = True) -> MedicationLog:
    log = MedicationLog(
        medication_id=medication_id, taken=taken, logged_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def adherence_rate(db: Session, patient_id: int) -> float:
    """Fraction of logged doses that were actually taken (0.0–1.0)."""
    logs = db.scalars(
        select(MedicationLog)
        .join(Medication)
        .where(Medication.patient_id == patient_id)
    ).all()
    if not logs:
        return 1.0
    taken = sum(1 for log in logs if log.taken)
    return round(taken / len(logs), 2)


def missed_doses(db: Session, patient_id: int) -> list[MedicationLog]:
    return list(
        db.scalars(
            select(MedicationLog)
            .join(Medication)
            .where(Medication.patient_id == patient_id, MedicationLog.taken.is_(False))
        ).all()
    )
