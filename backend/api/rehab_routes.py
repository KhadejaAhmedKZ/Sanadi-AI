"""Rehabilitation / VR physiotherapy endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services import patient_service, rehab_service

router = APIRouter(prefix="/rehab", tags=["rehabilitation"])


class SessionLog(BaseModel):
    patient_id: int
    exercise: str
    reps_completed: int
    reps_target: int
    difficulty: str = "easy"
    pain_level: int | None = None


@router.get("/exercises")
def exercises():
    return rehab_service.EXERCISES


@router.post("/sessions", status_code=201)
def log_session(payload: SessionLog, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    s = rehab_service.log_session(
        db,
        patient_id=payload.patient_id,
        exercise=payload.exercise,
        reps_completed=payload.reps_completed,
        reps_target=payload.reps_target,
        difficulty=payload.difficulty,
        pain_level=payload.pain_level,
    )
    return {"id": s.id, "points": s.points, "completed_at": s.completed_at}


@router.get("/patients/{patient_id}/progress")
def rehab_progress(patient_id: int, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return rehab_service.progress(db, patient_id)
