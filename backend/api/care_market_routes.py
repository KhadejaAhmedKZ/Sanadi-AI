"""Outside-hospital care marketplace — external treatment booking + medication delivery.

Prototype / synthetic data: providers, pharmacies, prices and delivery states are
demonstration content for the AIMED Track-5 hackathon. Bookings are kept in sync
with the patient's appointment history; delivery status changes notify the
Primary Carer through the existing notification service.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import (
    Appointment,
    AppointmentStatus,
    BookingStatus,
    DeliveryStatus,
    ExternalBooking,
    Medication,
    MedicationDelivery,
)
from backend.services import appointment_service, notification_service, patient_service

router = APIRouter(prefix="/care-market", tags=["care-market"])

# ---------------------------------------------------------------- provider catalog
# Fictional out-of-hospital providers — UAE plus international destinations.
PROVIDERS: dict[str, list[dict]] = {
    "Physiotherapy": [
        {"name": "MoveWell Physiotherapy", "location": "Jumeirah, Dubai", "country": "UAE", "price": "AED 220 / session"},
        {"name": "Sanad Rehab Clinic", "location": "Al Barsha, Dubai", "country": "UAE", "price": "AED 180 / session"},
        {"name": "Riyadh Physio Center", "location": "Riyadh, Saudi Arabia", "country": "Saudi Arabia", "price": "SAR 250 / session"},
        {"name": "London Physio Clinic", "location": "London, United Kingdom", "country": "United Kingdom", "price": "£75 / session"},
    ],
    "Home Nursing": [
        {"name": "CareAtHome Nursing", "location": "Home visit · Dubai", "country": "UAE", "price": "AED 250 / visit"},
        {"name": "Noor Home Health", "location": "Home visit · Abu Dhabi", "country": "UAE", "price": "AED 300 / visit"},
        {"name": "Doha Home Care", "location": "Home visit · Doha, Qatar", "country": "Qatar", "price": "QAR 300 / visit"},
        {"name": "Apollo HomeCare", "location": "Home visit · Chennai, India", "country": "India", "price": "₹1,200 / visit"},
    ],
    "Rehabilitation": [
        {"name": "Rehab First Center", "location": "Dubai Healthcare City", "country": "UAE", "price": "AED 400 / session"},
        {"name": "Recover+ Therapy", "location": "Al Nahda, Sharjah", "country": "UAE", "price": "AED 320 / session"},
        {"name": "NeuroRehab Istanbul", "location": "Istanbul, Türkiye", "country": "Türkiye", "price": "€180 / session"},
        {"name": "Schön Klinik Rehab", "location": "Munich, Germany", "country": "Germany", "price": "€260 / session"},
    ],
    "Specialist Consultation": [
        {"name": "Dubai Ortho & Sports", "location": "Dubai Healthcare City", "country": "UAE", "price": "AED 500 / consult"},
        {"name": "NeuroCare Clinic", "location": "Al Reem, Abu Dhabi", "country": "UAE", "price": "AED 600 / consult"},
        {"name": "Harley Street Specialists", "location": "London, United Kingdom", "country": "United Kingdom", "price": "£250 / consult"},
        {"name": "Apollo Hospitals", "location": "New Delhi, India", "country": "India", "price": "₹2,500 / consult"},
        {"name": "Acıbadem Clinic", "location": "Istanbul, Türkiye", "country": "Türkiye", "price": "€200 / consult"},
    ],
    "Home Lab / Diagnostics": [
        {"name": "HomeLab Diagnostics", "location": "Home sample · Dubai", "country": "UAE", "price": "AED 150 + tests"},
        {"name": "GlobalLab", "location": "Home sample · Riyadh, Saudi Arabia", "country": "Saudi Arabia", "price": "SAR 180 + tests"},
        {"name": "Thyrocare Home", "location": "Home sample · Mumbai, India", "country": "India", "price": "₹900 + tests"},
    ],
}

PHARMACIES = ["Sanadi Partner Pharmacy", "LifePlus Pharmacy", "Aster Pharmacy", "BinSina Pharmacy"]

# Delivery lifecycle, in order.
_DELIVERY_FLOW = [
    DeliveryStatus.requested,
    DeliveryStatus.confirmed,
    DeliveryStatus.dispatched,
    DeliveryStatus.out_for_delivery,
    DeliveryStatus.delivered,
]
_DELIVERY_COPY = {
    DeliveryStatus.requested: "Delivery requested",
    DeliveryStatus.confirmed: "Pharmacy confirmed the prescription",
    DeliveryStatus.dispatched: "Medication dispatched",
    DeliveryStatus.out_for_delivery: "Out for delivery",
    DeliveryStatus.delivered: "Delivered",
    DeliveryStatus.cancelled: "Delivery cancelled",
}


def _slots(days: int = 6) -> list[str]:
    """Available appointment slots over the next few days (ISO strings)."""
    out, now = [], datetime.utcnow()
    for d in range(1, days + 1):
        day = (now + timedelta(days=d)).replace(minute=0, second=0, microsecond=0)
        for hour in (9, 11, 14, 16):
            out.append(day.replace(hour=hour).isoformat())
    return out


# ---------------------------------------------------------------- serializers
def _booking(b: ExternalBooking) -> dict:
    return {
        "id": b.id, "patient_id": b.patient_id, "service_type": b.service_type,
        "provider": b.provider, "location": b.location, "price": b.price,
        "scheduled_for": b.scheduled_for.isoformat(), "status": b.status.value,
        "notes": b.notes, "created_by": b.created_by, "created_at": b.created_at.isoformat(),
    }


def _delivery(d: MedicationDelivery) -> dict:
    return {
        "id": d.id, "patient_id": d.patient_id, "medication_id": d.medication_id,
        "medication_name": d.medication_name, "pharmacy": d.pharmacy, "address": d.address,
        "status": d.status.value, "status_label": _DELIVERY_COPY.get(d.status, d.status.value),
        "eta": d.eta, "tracking_code": d.tracking_code, "created_by": d.created_by,
        "created_at": d.created_at.isoformat(), "updated_at": d.updated_at.isoformat(),
    }


# ---------------------------------------------------------------- providers
@router.get("/providers")
def providers(service_type: str | None = None) -> dict:
    if service_type:
        items = PROVIDERS.get(service_type, [])
        return {"service_type": service_type, "providers": items, "slots": _slots()}
    return {"services": list(PROVIDERS), "catalog": PROVIDERS, "slots": _slots()}


# ---------------------------------------------------------------- bookings
class BookingCreate(BaseModel):
    patient_id: int
    service_type: str = Field(min_length=1, max_length=80)
    provider: str = Field(min_length=1, max_length=160)
    location: str = ""
    price: str = ""
    scheduled_for: datetime
    notes: str = Field(default="", max_length=300)
    created_by: str = "patient"


@router.get("/patients/{patient_id}/bookings")
def list_bookings(patient_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(ExternalBooking)
        .where(ExternalBooking.patient_id == patient_id)
        .order_by(ExternalBooking.scheduled_for.desc())
    ).all()
    return [_booking(b) for b in rows]


@router.post("/bookings", status_code=201)
def create_booking(payload: BookingCreate, db: Session = Depends(get_db)) -> dict:
    patient = patient_service.get_patient(db, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Sync with appointment history: a confirmed external booking also appears as
    # an appointment so the whole care team sees it in one timeline.
    appt = appointment_service.book(
        db,
        patient_id=payload.patient_id,
        scheduled_for=payload.scheduled_for,
        department=payload.service_type,
        reason=f"{payload.provider} · {payload.location}".strip(" ·"),
        is_video=False,
    )
    b = ExternalBooking(
        patient_id=payload.patient_id, service_type=payload.service_type,
        provider=payload.provider, location=payload.location, price=payload.price,
        scheduled_for=payload.scheduled_for, status=BookingStatus.confirmed,
        notes=payload.notes, appointment_id=appt.id, created_by=payload.created_by,
    )
    db.add(b)
    db.commit()
    db.refresh(b)

    notification_service.notify_caregivers(
        db, patient_id=payload.patient_id,
        title="External treatment booked",
        body=f"{payload.service_type} with {payload.provider} on "
             f"{payload.scheduled_for.strftime('%b %d, %H:%M')} ({payload.price or 'price on site'}).",
        scope="appointments",
    )
    return _booking(b)


class RescheduleRequest(BaseModel):
    scheduled_for: datetime


@router.post("/bookings/{booking_id}/reschedule")
def reschedule_booking(booking_id: int, payload: RescheduleRequest, db: Session = Depends(get_db)) -> dict:
    b = db.get(ExternalBooking, booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b.scheduled_for = payload.scheduled_for
    b.status = BookingStatus.confirmed
    if b.appointment_id:
        appointment_service.reschedule(db, b.appointment_id, payload.scheduled_for)
    db.commit()
    db.refresh(b)
    notification_service.notify_caregivers(
        db, patient_id=b.patient_id, title="Treatment rescheduled",
        body=f"{b.service_type} with {b.provider} moved to {payload.scheduled_for.strftime('%b %d, %H:%M')}.",
        scope="appointments",
    )
    return _booking(b)


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db)) -> dict:
    b = db.get(ExternalBooking, booking_id)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b.status = BookingStatus.cancelled
    if b.appointment_id:
        appointment_service.cancel(db, b.appointment_id)
    db.commit()
    db.refresh(b)
    notification_service.notify_caregivers(
        db, patient_id=b.patient_id, title="Treatment cancelled",
        body=f"{b.service_type} with {b.provider} was cancelled.",
        scope="appointments",
    )
    return _booking(b)


# ---------------------------------------------------------------- deliveries
class DeliveryCreate(BaseModel):
    patient_id: int
    medication_id: int | None = None
    medication_name: str = ""
    pharmacy: str = ""
    address: str = Field(default="", max_length=200)
    created_by: str = "patient"


def _eta_text(minutes: int) -> str:
    return (datetime.utcnow() + timedelta(minutes=minutes)).strftime("Today, %H:%M")


@router.get("/patients/{patient_id}/deliveries")
def list_deliveries(patient_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(MedicationDelivery)
        .where(MedicationDelivery.patient_id == patient_id)
        .order_by(MedicationDelivery.created_at.desc())
    ).all()
    return [_delivery(d) for d in rows]


@router.post("/deliveries", status_code=201)
def create_delivery(payload: DeliveryCreate, db: Session = Depends(get_db)) -> dict:
    patient = patient_service.get_patient(db, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    name = payload.medication_name.strip()
    if payload.medication_id:
        med = db.get(Medication, payload.medication_id)
        if med:
            name = med.name + (f" ({med.dosage})" if med.dosage else "")
    if not name:
        raise HTTPException(status_code=400, detail="A medication is required")

    d = MedicationDelivery(
        patient_id=payload.patient_id, medication_id=payload.medication_id, medication_name=name,
        pharmacy=payload.pharmacy or PHARMACIES[0], address=payload.address,
        status=DeliveryStatus.requested, eta=_eta_text(90),
        tracking_code="SND-" + "".join(random.choices("0123456789", k=7)),
        created_by=payload.created_by,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    notification_service.notify_caregivers(
        db, patient_id=payload.patient_id, title="Medication delivery requested",
        body=f"{name} — {d.pharmacy}. Tracking {d.tracking_code}.",
        scope="medications",
    )
    return _delivery(d)


@router.post("/deliveries/{delivery_id}/advance")
def advance_delivery(delivery_id: int, db: Session = Depends(get_db)) -> dict:
    """Move the delivery to its next lifecycle stage (demo simulation of the courier)."""
    d = db.get(MedicationDelivery, delivery_id)
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if d.status in (DeliveryStatus.delivered, DeliveryStatus.cancelled):
        return _delivery(d)
    idx = _DELIVERY_FLOW.index(d.status)
    d.status = _DELIVERY_FLOW[min(idx + 1, len(_DELIVERY_FLOW) - 1)]
    d.eta = "Delivered" if d.status == DeliveryStatus.delivered else _eta_text(
        {DeliveryStatus.confirmed: 75, DeliveryStatus.dispatched: 45, DeliveryStatus.out_for_delivery: 15}.get(d.status, 60)
    )
    db.commit()
    db.refresh(d)
    # Notify the carer on the meaningful courier milestones.
    if d.status in (DeliveryStatus.dispatched, DeliveryStatus.out_for_delivery, DeliveryStatus.delivered):
        notification_service.notify_caregivers(
            db, patient_id=d.patient_id,
            title=f"Delivery {_DELIVERY_COPY[d.status].lower()}",
            body=f"{d.medication_name} — {d.pharmacy}. {('ETA ' + d.eta) if d.status != DeliveryStatus.delivered else 'Delivered.'}",
            scope="medications",
        )
    return _delivery(d)


@router.post("/deliveries/{delivery_id}/cancel")
def cancel_delivery(delivery_id: int, db: Session = Depends(get_db)) -> dict:
    d = db.get(MedicationDelivery, delivery_id)
    if not d:
        raise HTTPException(status_code=404, detail="Delivery not found")
    d.status = DeliveryStatus.cancelled
    db.commit()
    db.refresh(d)
    return _delivery(d)
