"""Body-map pain assessments — visual symptom logging with AI triage.

Every saved assessment also writes a SymptomLog entry, so body-map data
automatically feeds the existing risk triage, pain trends, caregiver
overview, and provider dashboards.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.ai.prompts import CLINICAL_AGENT
from backend.database import get_db
from backend.models import BodyAssessment
from backend.services import notification_service, patient_service

router = APIRouter(prefix="/body", tags=["body-map"])

# Rule-based specialist routing (free, deterministic). Departments match the
# booking form so "Book appointment" can prefill.
SPECIALIST_MAP = {
    "Head": ("Neurology", "Persistent or severe headaches are best evaluated by a neurologist."),
    "Neck": ("Orthopedics", "Neck pain is usually musculoskeletal — orthopedics or physiotherapy."),
    "Chest": ("Cardiology", "Chest symptoms should be reviewed by a cardiologist."),
    "Abdomen": ("General", "Abdominal complaints start with a general physician."),
    "Upper Back": ("Physiotherapy", "Upper-back strain responds well to physiotherapy."),
    "Mid Back": ("Physiotherapy", "Mid-back pain is commonly muscular — physiotherapy first."),
    "Lower Back": ("Orthopedics", "Persistent lower-back pain is best assessed by orthopedics."),
    "Left Shoulder": ("Physiotherapy", "Shoulder pain is often treated effectively with physiotherapy."),
    "Right Shoulder": ("Physiotherapy", "Shoulder pain is often treated effectively with physiotherapy."),
    "Left Arm": ("Orthopedics", "Arm pain is usually musculoskeletal."),
    "Right Arm": ("Orthopedics", "Arm pain is usually musculoskeletal."),
    "Left Hand": ("Orthopedics", "Hand complaints go to orthopedics."),
    "Right Hand": ("Orthopedics", "Hand complaints go to orthopedics."),
    "Left Hip": ("Orthopedics", "Hip pain is best evaluated by orthopedics."),
    "Right Hip": ("Orthopedics", "Hip pain is best evaluated by orthopedics."),
    "Left Knee": ("Orthopedics", "Knee pain is best evaluated by an orthopedic specialist."),
    "Right Knee": ("Orthopedics", "Knee pain is best evaluated by an orthopedic specialist."),
    "Left Ankle": ("Orthopedics", "Ankle pain is best evaluated by orthopedics."),
    "Right Ankle": ("Orthopedics", "Ankle pain is best evaluated by orthopedics."),
    "Left Thigh": ("Physiotherapy", "Thigh/muscle pain responds well to physiotherapy."),
    "Right Thigh": ("Physiotherapy", "Thigh/muscle pain responds well to physiotherapy."),
    "Left Calf": ("General", "Calf pain deserves a general check first (rule out circulation issues)."),
    "Right Calf": ("General", "Calf pain deserves a general check first (rule out circulation issues)."),
    "Face": ("General", "Facial pain or swelling starts with a general physician."),
    "Heart": ("Cardiology", "Heart-area symptoms should be reviewed by a cardiologist."),
    "Lower Abdomen": ("General", "Lower-abdominal complaints start with a general physician."),
    "Groin": ("General", "Groin pain deserves a general check first."),
    "Left Elbow": ("Orthopedics", "Elbow pain is usually musculoskeletal."),
    "Right Elbow": ("Orthopedics", "Elbow pain is usually musculoskeletal."),
    "Left Forearm": ("Orthopedics", "Forearm pain is usually musculoskeletal."),
    "Right Forearm": ("Orthopedics", "Forearm pain is usually musculoskeletal."),
    "Left Shin": ("Orthopedics", "Shin pain is best evaluated by orthopedics."),
    "Right Shin": ("Orthopedics", "Shin pain is best evaluated by orthopedics."),
    "Left Foot": ("Orthopedics", "Foot complaints go to orthopedics."),
    "Right Foot": ("Orthopedics", "Foot complaints go to orthopedics."),
    "Left Heel": ("Orthopedics", "Heel pain is best evaluated by orthopedics."),
    "Right Heel": ("Orthopedics", "Heel pain is best evaluated by orthopedics."),
    "Left Glute": ("Physiotherapy", "Gluteal/hip muscle pain responds well to physiotherapy."),
    "Right Glute": ("Physiotherapy", "Gluteal/hip muscle pain responds well to physiotherapy."),
}
VALID_REGIONS = set(SPECIALIST_MAP)

# Offline emergency rules — zero AI calls, mirror the chat safety net.
def _emergency_check(region: str, intensity: int, notes: str) -> str | None:
    low = (notes or "").lower()
    if region in ("Chest", "Heart") and intensity >= 6:
        return (
            "🚨 Severe chest or heart-area pain can be an emergency. Please call your local "
            "emergency number or go to the nearest emergency department NOW — "
            "do not wait for an appointment."
        )
    if intensity >= 9:
        return (
            "🚨 Pain this severe (9-10/10) needs urgent medical attention. "
            "Please contact your care team immediately or go to an emergency "
            "department."
        )
    if any(k in low for k in ("can't move", "cannot move", "numb", "no feeling", "blue", "bleeding heavily")):
        return (
            "🚨 Loss of movement, numbness, or heavy bleeding are warning signs. "
            "Seek urgent medical care now."
        )
    return None


class AssessmentCreate(BaseModel):
    patient_id: int
    region: str
    side: str = "front"
    intensity: int = Field(ge=0, le=10)
    pain_type: str = Field(default="", max_length=30)
    started: str = Field(default="", max_length=60)
    worse_with: str = Field(default="", max_length=120)
    swelling: bool = False
    redness: bool = False
    injury: bool = False
    notes: str = Field(default="", max_length=400)


def _serialize(a: BodyAssessment) -> dict:
    return {
        "id": a.id, "region": a.region, "side": a.side, "intensity": a.intensity,
        "pain_type": a.pain_type, "started": a.started, "worse_with": a.worse_with,
        "swelling": a.swelling, "redness": a.redness, "injury": a.injury,
        "notes": a.notes, "created_at": a.created_at.isoformat(),
    }


@router.post("/assessments", status_code=201)
async def create_assessment(payload: AssessmentCreate, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if payload.region not in VALID_REGIONS:
        raise HTTPException(status_code=422, detail="Unknown body region")

    a = BodyAssessment(
        patient_id=payload.patient_id, region=payload.region, side=payload.side,
        intensity=payload.intensity, pain_type=payload.pain_type,
        started=payload.started, worse_with=payload.worse_with,
        swelling=payload.swelling, redness=payload.redness, injury=payload.injury,
        notes=payload.notes.strip(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)

    # Feed the shared clinical record: trends, triage, caregiver overview.
    desc = f"Body map — {payload.region}: {payload.pain_type or 'pain'}"
    if payload.notes.strip():
        desc += f" ({payload.notes.strip()[:120]})"
    patient_service.log_symptom(db, payload.patient_id, desc, payload.intensity)

    # Safety net (offline, zero AI calls) + caregiver alert on emergencies.
    emergency = _emergency_check(payload.region, payload.intensity, payload.notes)
    if emergency:
        notification_service.notify_caregivers(
            db,
            patient_id=payload.patient_id,
            title="⚠️ Urgent: severe pain reported on the body map",
            body=f"{patient.name} reported {payload.region} pain {payload.intensity}/10.",
            scope="safety",
        )

    specialist, why = SPECIALIST_MAP[payload.region]
    return {
        **_serialize(a),
        "emergency": emergency,
        "specialist": specialist,
        "specialist_why": why,
    }


@router.get("/patients/{patient_id}/assessments")
def list_assessments(patient_id: int, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    rows = db.scalars(
        select(BodyAssessment)
        .where(BodyAssessment.patient_id == patient_id)
        .order_by(BodyAssessment.created_at.desc())
        .limit(100)
    ).all()
    # Latest entry per region drives the marker colors; history drives the timeline.
    latest: dict[str, dict] = {}
    for r in rows:
        if r.region not in latest:
            latest[r.region] = _serialize(r)
    return {"latest": latest, "history": [_serialize(r) for r in rows]}


@router.post("/assessments/{assessment_id}/analyze")
async def analyze_assessment(assessment_id: int, db: Session = Depends(get_db)):
    """One-call AI preliminary assessment, grounded in the patient's history."""
    a = db.get(BodyAssessment, assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    patient = patient_service.get_patient(db, a.patient_id)

    emergency = _emergency_check(a.region, a.intensity, a.notes)
    if emergency:
        return {"assessment": emergency, "emergency": True}

    history = db.scalars(
        select(BodyAssessment)
        .where(BodyAssessment.patient_id == a.patient_id, BodyAssessment.region == a.region)
        .order_by(BodyAssessment.created_at.desc())
        .limit(5)
    ).all()
    trend = "; ".join(f"{h.created_at:%b %d}: {h.intensity}/10" for h in reversed(history))

    prompt = (
        f"A patient reports pain via a body map. Patient conditions: "
        f"{patient.conditions or 'none recorded'}.\n"
        f"Region: {a.region} · intensity {a.intensity}/10 · type: {a.pain_type or 'unspecified'} · "
        f"started {a.started or 'unspecified'} · worse with: {a.worse_with or 'unspecified'} · "
        f"swelling: {a.swelling} · redness: {a.redness} · recent injury: {a.injury}.\n"
        f"Notes: {a.notes or 'none'}.\n"
        f"Pain history for this region: {trend or 'first report'}.\n\n"
        "Write a short PRELIMINARY assessment for the patient (2-4 sentences, "
        "plain language): likely everyday explanations, one or two self-care "
        "steps, and when to seek care. State clearly this is not a diagnosis. "
        "Do not name medications."
    )
    text = await gemini.generate(prompt, system_instruction=CLINICAL_AGENT, temperature=0.3)
    return {"assessment": text, "emergency": False}
