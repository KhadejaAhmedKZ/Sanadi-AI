"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime, date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from backend.models import AppointmentStatus, UserRole


# ---------- Auth / Users ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.patient
    date_of_birth: date | None = None
    conditions: str | None = None
    accessibility_needs: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    role: UserRole
    conditions: str | None = None
    accessibility_needs: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Chat ----------
class ChatRequest(BaseModel):
    patient_id: int
    message: str


class AgentContribution(BaseModel):
    agent: str
    content: str
    urgent: bool = False
    data: dict | None = None


class ChatResponse(BaseModel):
    reply: str
    emergency: bool = False
    agents_used: list[str] = []
    contributions: list[AgentContribution] = []


# ---------- Medications ----------
class MedicationCreate(BaseModel):
    patient_id: int
    name: str
    dosage: str = ""
    schedule: str = ""


class MedicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    dosage: str
    schedule: str
    active: bool


class MedicationTake(BaseModel):
    medication_id: int
    taken: bool = True


# ---------- Appointments ----------
class AppointmentCreate(BaseModel):
    patient_id: int
    department: str = "General"
    reason: str = ""
    scheduled_for: datetime
    provider_id: int | None = None


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department: str
    reason: str
    scheduled_for: datetime
    status: AppointmentStatus


# ---------- Symptoms ----------
class SymptomCreate(BaseModel):
    patient_id: int
    description: str
    pain_level: int | None = Field(default=None, ge=0, le=10)


class SymptomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    description: str
    pain_level: int | None
    logged_at: datetime


# ---------- Caregiver ----------
class CareLinkCreate(BaseModel):
    caregiver_id: int
    patient_id: int
    scopes: list[str] = []


# ---------- Dashboards ----------
class PatientDashboard(BaseModel):
    patient: UserOut
    medications: list[MedicationOut]
    appointments: list[AppointmentOut]
    recent_symptoms: list[SymptomOut]
    adherence_rate: float


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str
    urgent: bool
    read: bool
    created_at: datetime
