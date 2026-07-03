"""Seed the database with sample patients, medications, and symptoms.

Run from the project root:  python -m backend.seed
"""
import json
from datetime import datetime, timedelta
from pathlib import Path

from backend.database import SessionLocal, init_db
from backend.models import Appointment, LabResult, MedicationLog, RehabSession, SymptomLog, User, UserRole
from backend.services import medication_service, patient_service
from backend.utils.security import hash_password

DATA_FILE = Path(__file__).parent / "data" / "sample_patients.json"

# Backdated history per patient email, so trend charts, risk triage, and
# case-insight cohort comparisons have real trajectories to work with.
# pain: list of (days_ago, level, description) — oldest first.
# doses: (days_of_history, taken_probability_pattern as list cycled daily, doses_per_day)
# rehab: list of (days_ago, exercise, completed, target, difficulty, pain)
HISTORY = {
    # Sara: the recovery SUCCESS story — pain falling, meds taken, steady rehab.
    "sara@example.com": {
        "pain": [
            (21, 7, "Sharp knee pain climbing stairs"),
            (18, 6, "Knee stiffness in the morning"),
            (15, 6, "Aching after physiotherapy"),
            (12, 5, "Mild swelling after walking"),
            (9, 4, "Knee pain after physiotherapy"),
            (6, 3, "Slight discomfort on long walks"),
            (3, 3, "Occasional twinge going downstairs"),
            (1, 2, "Feeling much steadier today"),
        ],
        "doses": (14, [True, True, True, True, True, True, False], 2),
        "rehab": [
            (20, "Seated Leg Raises", 8, 10, "easy", 6),
            (17, "Seated Leg Raises", 10, 10, "easy", 5),
            (14, "Ankle Circles", 12, 12, "easy", 4),
            (11, "Seated Leg Raises", 12, 12, "medium", 4),
            (8, "Standing Knee Bends", 10, 12, "medium", 3),
            (5, "Standing Knee Bends", 12, 12, "medium", 3),
            (2, "Step-ups", 10, 12, "hard", 2),
        ],
    },
    # Ahmed: the DETERIORATING case — pain rising, doses missed, rehab dropped.
    "ahmed@example.com": {
        "pain": [
            (18, 3, "Mild headache in the evening"),
            (15, 3, "Feet feel slightly numb"),
            (12, 4, "Dizzy standing up quickly"),
            (9, 5, "Persistent headache and fatigue"),
            (6, 5, "Tingling in both feet"),
            (3, 6, "Blurry vision reading labels"),
            (1, 7, "Strong headache, felt faint this morning"),
        ],
        "doses": (14, [True, False, True, False, False, True, False], 2),
        "rehab": [
            (16, "Gentle Stretching", 8, 10, "easy", 3),
            (13, "Gentle Stretching", 6, 10, "easy", 4),
        ],
    },
    # Fatima: RECOVERED — the cohort's proof that adherence + rehab works.
    "fatima@example.com": {
        "pain": [
            (30, 8, "Severe knee pain post-surgery"),
            (25, 6, "Pain when bending the knee"),
            (20, 5, "Stiffness after sitting"),
            (15, 3, "Mild ache after exercises"),
            (11, 2, "Barely noticeable discomfort"),
            (8, 1, "Feeling almost back to normal"),
        ],
        "doses": (21, [True, True, True, True, True, True, True, True, True, False], 2),
        "rehab": [
            (28, "Seated Leg Raises", 6, 10, "easy", 7),
            (25, "Seated Leg Raises", 10, 10, "easy", 5),
            (22, "Ankle Circles", 12, 12, "easy", 4),
            (19, "Standing Knee Bends", 10, 12, "medium", 3),
            (16, "Standing Knee Bends", 12, 12, "medium", 2),
            (13, "Step-ups", 12, 12, "hard", 2),
            (10, "Step-ups", 14, 14, "hard", 1),
        ],
    },
}


LABS = {
    "sara@example.com": [
        (10, "Hemoglobin", "13.4", "g/dL", "12.0-15.5", "normal", ""),
        (10, "White blood cells", "6.8", "x10⁹/L", "4.0-11.0", "normal", ""),
        (10, "C-reactive protein", "4.1", "mg/L", "< 5", "normal", "post-surgery inflammation settling"),
        (10, "Vitamin D", "22", "ng/mL", "30-100", "low", "supplement recommended for bone healing"),
    ],
    "ahmed@example.com": [
        (7, "HbA1c", "8.9", "%", "< 7.0", "high", "diabetes control slipping"),
        (7, "Fasting glucose", "165", "mg/dL", "70-100", "high", ""),
        (7, "LDL cholesterol", "148", "mg/dL", "< 100", "high", ""),
        (7, "Blood pressure (clinic)", "152/94", "mmHg", "< 130/80", "high", "consistent with home readings"),
        (7, "Creatinine", "1.0", "mg/dL", "0.7-1.3", "normal", "kidneys OK"),
    ],
    "fatima@example.com": [
        (14, "Hemoglobin", "13.9", "g/dL", "12.0-15.5", "normal", ""),
        (14, "C-reactive protein", "1.2", "mg/L", "< 5", "normal", "full recovery confirmed"),
    ],
}


def _seed_labs_and_video(db, patient: User) -> None:
    now = datetime.utcnow()
    for days_ago, test, value, unit, ref, status, notes in LABS.get(patient.email, []):
        db.add(LabResult(
            patient_id=patient.id, test_name=test, value=value, unit=unit,
            reference_range=ref, status=status, notes=notes,
            taken_at=now - timedelta(days=days_ago, hours=6),
        ))
    # A scheduled video visit for each demo patient, so the Join button is
    # ready to demo on both sides.
    db.add(Appointment(
        patient_id=patient.id,
        department="Telehealth — follow-up",
        reason="Video check-in with Dr. Hassan",
        scheduled_for=now + timedelta(days=1, hours=2),
        is_video=True,
    ))
    db.commit()


def _seed_history(db, patient: User) -> None:
    spec = HISTORY.get(patient.email)
    if not spec:
        return
    now = datetime.utcnow()

    for days_ago, level, desc in spec["pain"]:
        db.add(
            SymptomLog(
                patient_id=patient.id,
                description=desc,
                pain_level=level,
                logged_at=now - timedelta(days=days_ago, hours=3),
            )
        )

    meds = medication_service.list_medications(db, patient.id)
    days, pattern, per_day = spec["doses"]
    if meds:
        i = 0
        for d in range(days, 0, -1):
            for dose in range(per_day):
                med = meds[dose % len(meds)]
                taken = pattern[i % len(pattern)]
                i += 1
                when = now - timedelta(days=d, hours=12 - dose * 8)
                db.add(
                    MedicationLog(
                        medication_id=med.id,
                        taken=taken,
                        scheduled_for=when,
                        logged_at=when,
                    )
                )

    for days_ago, exercise, done, target, diff, pain in spec.get("rehab", []):
        completion = done / target if target else 0
        db.add(
            RehabSession(
                patient_id=patient.id,
                exercise=exercise,
                reps_completed=done,
                reps_target=target,
                difficulty=diff,
                pain_level=pain,
                points=int({"easy": 50, "medium": 80, "hard": 120}.get(diff, 50) * completion),
                completed_at=now - timedelta(days=days_ago, hours=5),
            )
        )
    db.commit()
    print(f"  ↳ history: {len(spec['pain'])} symptoms, {days * per_day} dose logs, {len(spec.get('rehab', []))} rehab sessions")


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
            _seed_history(db, patient)
            _seed_labs_and_video(db, patient)
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
