"""Seed the database with sample patients, medications, and symptoms.

Run from the project root:  python -m backend.seed
"""
import json
from pathlib import Path

from backend.database import SessionLocal, init_db
from backend.models import User, UserRole
from backend.services import medication_service, patient_service
from backend.utils.security import hash_password

DATA_FILE = Path(__file__).parent / "data" / "sample_patients.json"


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        records = json.loads(DATA_FILE.read_text())
        for rec in records:
            if db.query(User).filter(User.email == rec["email"]).first():
                print(f"• {rec['email']} already exists — skipping")
                continue
            patient = User(
                name=rec["name"],
                email=rec["email"],
                hashed_password=hash_password(rec["password"]),
                role=UserRole.patient,
                conditions=rec.get("conditions"),
                accessibility_needs=rec.get("accessibility_needs"),
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

            for med in rec.get("medications", []):
                medication_service.add_medication(
                    db, patient.id, med["name"], med.get("dosage", ""), med.get("schedule", "")
                )
            for sym in rec.get("symptoms", []):
                patient_service.log_symptom(
                    db, patient.id, sym["description"], sym.get("pain_level")
                )
            print(f"✓ Seeded patient {patient.name} (id={patient.id})")

        _seed_staff(db)
    finally:
        db.close()
    print(
        "\nDone. Demo logins (password demo1234):\n"
        "  Patient:   sara@example.com\n"
        "  Caregiver: care@example.com\n"
        "  Provider:  doctor@example.com"
    )


def _seed_staff(db) -> None:
    """Create a demo caregiver + provider and link the caregiver to a patient."""
    # Provider
    if not db.query(User).filter(User.email == "doctor@example.com").first():
        provider = User(
            name="Dr. Layla Hassan",
            email="doctor@example.com",
            hashed_password=hash_password("demo1234"),
            role=UserRole.provider,
        )
        db.add(provider)
        db.commit()
        print("✓ Seeded provider Dr. Layla Hassan")

    # Caregiver, linked to the first patient (Sara) with full scopes.
    if not db.query(User).filter(User.email == "care@example.com").first():
        caregiver = User(
            name="Omar Ahmed",
            email="care@example.com",
            hashed_password=hash_password("demo1234"),
            role=UserRole.caregiver,
        )
        db.add(caregiver)
        db.commit()
        db.refresh(caregiver)
        sara = db.query(User).filter(User.email == "sara@example.com").first()
        if sara:
            patient_service.link_caregiver(
                db, caregiver.id, sara.id,
                ["medications", "appointments", "symptoms", "safety"],
            )
        print("✓ Seeded caregiver Omar Ahmed (linked to Sara)")


if __name__ == "__main__":
    seed()
