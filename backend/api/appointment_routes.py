"""Appointment and medication management endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas import (
    AppointmentCreate,
    AppointmentOut,
    MedicationCreate,
    MedicationOut,
    MedicationTake,
)
from backend.services import appointment_service, medication_service, patient_service

router = APIRouter(tags=["appointments & medications"])


# ---------- Appointments ----------
@router.get("/patients/{patient_id}/appointments", response_model=list[AppointmentOut])
def list_appts(patient_id: int, upcoming: bool = False, db: Session = Depends(get_db)):
    return appointment_service.list_appointments(db, patient_id, upcoming_only=upcoming)


@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def create_appt(payload: AppointmentCreate, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return appointment_service.book(
        db,
        patient_id=payload.patient_id,
        scheduled_for=payload.scheduled_for,
        department=payload.department,
        reason=payload.reason,
        provider_id=payload.provider_id,
    )


@router.delete("/appointments/{appointment_id}", response_model=AppointmentOut)
def cancel_appt(appointment_id: int, db: Session = Depends(get_db)):
    appt = appointment_service.cancel(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


# ---------- Medications ----------
@router.get("/patients/{patient_id}/medications", response_model=list[MedicationOut])
def list_meds(patient_id: int, db: Session = Depends(get_db)):
    return medication_service.list_medications(db, patient_id)


@router.post("/medications", response_model=MedicationOut, status_code=201)
def add_med(payload: MedicationCreate, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return medication_service.add_medication(
        db, payload.patient_id, payload.name, payload.dosage, payload.schedule
    )


@router.post("/medications/log")
def log_dose(payload: MedicationTake, db: Session = Depends(get_db)):
    from backend.models import Medication

    if not db.get(Medication, payload.medication_id):
        raise HTTPException(status_code=404, detail="Medication not found")
    log = medication_service.log_dose(db, payload.medication_id, payload.taken)
    return {"id": log.id, "taken": log.taken, "logged_at": log.logged_at}
