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
    finally:
        db.close()
    print("\nDone. Log in with e.g. sara@example.com / demo1234")


if __name__ == "__main__":
    seed()
