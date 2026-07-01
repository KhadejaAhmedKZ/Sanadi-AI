"""Patient auth, profile, dashboard, and symptom logging."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.schemas import (
    LoginRequest,
    PatientDashboard,
    SymptomCreate,
    SymptomOut,
    Token,
    UserCreate,
    UserOut,
)
from backend.services import (
    appointment_service,
    medication_service,
    patient_service,
)
from backend.utils.security import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        date_of_birth=payload.date_of_birth,
        conditions=payload.conditions,
        accessibility_needs=payload.accessibility_needs,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.id, extra={"role": user.role.value})
    return Token(access_token=token, user=user)


@router.get("/{patient_id}", response_model=UserOut)
def get_profile(patient_id: int, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/{patient_id}/dashboard", response_model=PatientDashboard)
def dashboard(patient_id: int, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientDashboard(
        patient=patient,
        medications=medication_service.list_medications(db, patient_id),
        appointments=appointment_service.list_appointments(
            db, patient_id, upcoming_only=True
        ),
        recent_symptoms=patient_service.recent_symptoms(db, patient_id),
        adherence_rate=medication_service.adherence_rate(db, patient_id),
    )


@router.post("/symptoms", response_model=SymptomOut, status_code=201)
def log_symptom(payload: SymptomCreate, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, payload.patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient_service.log_symptom(
        db, payload.patient_id, payload.description, payload.pain_level
    )
