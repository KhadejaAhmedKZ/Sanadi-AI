"""Database models for Sanadi AI.

The schema is intentionally small but covers the core entities the agents and
dashboards need: users (patient / caregiver / provider), care links, medications
and their logs, appointments, symptom check-ins, and conversation history.
"""
from __future__ import annotations

import enum
from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class UserRole(str, enum.Enum):
    patient = "patient"
    caregiver = "caregiver"
    provider = "provider"


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.patient)

    # Patient-facing profile fields (null for caregivers/providers)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma list
    accessibility_needs: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    medications: Mapped[list["Medication"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
        foreign_keys="Appointment.patient_id",
    )
    symptoms: Mapped[list["SymptomLog"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class CareLink(Base):
    """Links a caregiver to a patient, gated by explicit permission scopes."""

    __tablename__ = "care_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    caregiver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    # Comma-separated scopes the patient granted, e.g. "medications,appointments,safety"
    scopes: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(160))
    dosage: Mapped[str] = mapped_column(String(120), default="")
    schedule: Mapped[str] = mapped_column(String(120), default="")  # e.g. "08:00,20:00"
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    patient: Mapped["User"] = relationship(back_populates="medications")
    logs: Mapped[list["MedicationLog"]] = relationship(
        back_populates="medication", cascade="all, delete-orphan"
    )


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id"))
    taken: Mapped[bool] = mapped_column(Boolean, default=False)
    scheduled_for: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    medication: Mapped["Medication"] = relationship(back_populates="logs")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    provider_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    department: Mapped[str] = mapped_column(String(120), default="General")
    reason: Mapped[str] = mapped_column(String(300), default="")
    scheduled_for: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus), default=AppointmentStatus.scheduled
    )
    is_video: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["User"] = relationship(
        back_populates="appointments", foreign_keys=[patient_id]
    )


class BodyAssessment(Base):
    """A body-map pain assessment — one region, one moment in time."""

    __tablename__ = "body_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    region: Mapped[str] = mapped_column(String(60))       # e.g. "Left Knee"
    side: Mapped[str] = mapped_column(String(10), default="front")  # front|back
    intensity: Mapped[int] = mapped_column(Integer, default=0)      # 0-10
    pain_type: Mapped[str] = mapped_column(String(30), default="")  # sharp|dull|burning|throbbing
    started: Mapped[str] = mapped_column(String(60), default="")    # e.g. "2 days ago"
    worse_with: Mapped[str] = mapped_column(String(120), default="")
    swelling: Mapped[bool] = mapped_column(Boolean, default=False)
    redness: Mapped[bool] = mapped_column(Boolean, default=False)
    injury: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(String(400), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LabResult(Base):
    """A lab test result — added by a provider, visible to the patient."""

    __tablename__ = "lab_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    test_name: Mapped[str] = mapped_column(String(160))
    value: Mapped[str] = mapped_column(String(60))
    unit: Mapped[str] = mapped_column(String(40), default="")
    reference_range: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(20), default="normal")  # normal|high|low
    notes: Mapped[str] = mapped_column(String(300), default="")
    taken_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SymptomLog(Base):
    __tablename__ = "symptom_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    description: Mapped[str] = mapped_column(Text)
    pain_level: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-10
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["User"] = relationship(back_populates="symptoms")


class Meal(Base):
    """A logged meal — typed or from a photo — with AI nutrition feedback."""

    __tablename__ = "meals"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(10), default="text")  # text | photo
    description: Mapped[str] = mapped_column(String(500))
    ai_note: Mapped[str] = mapped_column(Text, default="")
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)  # concern for this patient
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    """Conversation history for the orchestrator's memory."""

    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(20))  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text)
    # JSON string of which agents contributed, for transparency / debugging
    agents_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RehabSession(Base):
    """A completed VR physiotherapy session."""

    __tablename__ = "rehab_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    exercise: Mapped[str] = mapped_column(String(160))
    reps_completed: Mapped[int] = mapped_column(Integer, default=0)
    reps_target: Mapped[int] = mapped_column(Integer, default=0)
    difficulty: Mapped[str] = mapped_column(String(40), default="easy")
    pain_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    accuracy: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100 motion accuracy
    points: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EscalationStatus(str, enum.Enum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"


class Escalation(Base):
    """A caregiver-raised urgent review request, triaged by providers."""

    __tablename__ = "escalations"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    raised_by: Mapped[int] = mapped_column(ForeignKey("users.id"))  # caregiver
    reason: Mapped[str] = mapped_column(String(400))
    status: Mapped[EscalationStatus] = mapped_column(
        Enum(EscalationStatus), default=EscalationStatus.open
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class EmergencyEvent(Base):
    """A patient-safety event from AI Vision monitoring (fall, inactivity…)."""

    __tablename__ = "emergency_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(60))          # e.g. "possible_fall"
    status: Mapped[str] = mapped_column(String(24), default="detected")  # detected|confirmed_ok|help_needed|auto_escalated
    confidence: Mapped[int] = mapped_column(Integer, default=0)  # 0-100
    detail: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
