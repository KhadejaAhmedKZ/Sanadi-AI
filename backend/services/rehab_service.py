"""Rehabilitation / VR physiotherapy data and session logging."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import RehabSession

# Static catalog of VR-guided exercises. In a full deployment these would be
# authored per-protocol by a physiotherapist.
EXERCISES = [
    {
        "id": "knee-flexion",
        "name": "Seated Knee Flexion",
        "area": "Knee / Orthopedic",
        "target_reps": 12,
        "description": "Slowly bend and straighten the knee while seated.",
        "vr_scene": "garden",
        "levels": ["easy", "medium", "hard"],
    },
    {
        "id": "shoulder-raise",
        "name": "Assisted Shoulder Raise",
        "area": "Shoulder / Stroke",
        "target_reps": 10,
        "description": "Raise the arm forward and upward, then lower with control.",
        "vr_scene": "beach",
        "levels": ["easy", "medium", "hard"],
    },
    {
        "id": "ankle-circles",
        "name": "Ankle Circles",
        "area": "Fracture recovery",
        "target_reps": 15,
        "description": "Rotate the ankle clockwise and counter-clockwise.",
        "vr_scene": "forest",
        "levels": ["easy", "medium"],
    },
    {
        "id": "grip-strength",
        "name": "Virtual Grip Squeeze",
        "area": "Hand / Stroke",
        "target_reps": 20,
        "description": "Squeeze and release to rebuild grip strength.",
        "vr_scene": "space",
        "levels": ["easy", "medium", "hard"],
    },
    {
        "id": "balance-reach",
        "name": "Standing Balance Reach",
        "area": "Balance / Neuro",
        "target_reps": 8,
        "description": "Reach for virtual targets while maintaining balance.",
        "vr_scene": "mountain",
        "levels": ["easy", "medium", "hard"],
    },
]

_DIFFICULTY_POINTS = {"easy": 10, "medium": 20, "hard": 35}


def log_session(
    db: Session,
    patient_id: int,
    exercise: str,
    reps_completed: int,
    reps_target: int,
    difficulty: str = "easy",
    pain_level: int | None = None,
    accuracy: int | None = None,
) -> RehabSession:
    base = _DIFFICULTY_POINTS.get(difficulty, 10)
    completion = reps_completed / reps_target if reps_target else 1
    # A little bonus for high movement accuracy.
    quality = 1 + (max(0, (accuracy or 0) - 60) / 100) if accuracy is not None else 1
    points = int(base * completion * quality)
    session = RehabSession(
        patient_id=patient_id,
        exercise=exercise,
        accuracy=accuracy,
        reps_completed=reps_completed,
        reps_target=reps_target,
        difficulty=difficulty,
        pain_level=pain_level,
        points=points,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def progress(db: Session, patient_id: int) -> dict:
    sessions = db.scalars(
        select(RehabSession)
        .where(RehabSession.patient_id == patient_id)
        .order_by(RehabSession.completed_at.desc())
    ).all()
    total_points = sum(s.points for s in sessions)
    pains = [s.pain_level for s in sessions if s.pain_level is not None]
    accs = [s.accuracy for s in sessions if s.accuracy is not None]
    # Simple gamified level: every 100 points is a level.
    level = total_points // 100 + 1
    return {
        "total_sessions": len(sessions),
        "total_points": total_points,
        "level": level,
        "avg_pain": round(sum(pains) / len(pains), 1) if pains else None,
        "avg_accuracy": round(sum(accs) / len(accs)) if accs else None,
        "recent": [
            {
                "exercise": s.exercise,
                "reps": f"{s.reps_completed}/{s.reps_target}",
                "accuracy": s.accuracy,
                "difficulty": s.difficulty,
                "points": s.points,
                "pain_level": s.pain_level,
                "completed_at": s.completed_at.isoformat(),
            }
            for s in sessions[:10]
        ],
    }
