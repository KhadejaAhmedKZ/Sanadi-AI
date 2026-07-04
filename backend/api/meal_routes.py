"""Meal logging — patients log what they ate (typed or a photo) and get AI
nutrition feedback grounded in their conditions (e.g. diabetes → carbs/sugar).
Not a diagnosis; encouraging, practical guidance only.
"""
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.ai.prompts import GLOBAL_GUARDRAILS
from backend.database import get_db
from backend.models import Meal
from backend.services import patient_service
from backend.agents.vision_agent import ALLOWED_MIME_TYPES, MAX_IMAGE_BYTES

router = APIRouter(prefix="/meals", tags=["meals"])

NUTRITION_SYSTEM = (
    GLOBAL_GUARDRAILS
    + "\n\nYou are a friendly NUTRITION COACH (not a dietitian issuing a plan). "
    "Given a patient's conditions and a meal, reply in 2–3 short sentences: a "
    "quick estimate (rough calories / key nutrients if obvious), one encouraging "
    "note, and — if relevant to their condition — one gentle suggestion. If the "
    "meal is a clear concern for their condition (e.g. high sugar for diabetes), "
    "say so kindly. Never shame. End with 'FLAG: yes' on its own line if it is a "
    "notable concern for this patient, otherwise 'FLAG: no'."
)


def _parse_flag(text: str) -> tuple[str, bool]:
    flagged = False
    lines = []
    for ln in text.splitlines():
        if ln.strip().lower().startswith("flag:"):
            flagged = "yes" in ln.lower()
        else:
            lines.append(ln)
    return "\n".join(lines).strip(), flagged


def _serialize(m: Meal) -> dict:
    return {
        "id": m.id, "kind": m.kind, "description": m.description,
        "ai_note": m.ai_note, "flagged": m.flagged,
        "created_at": m.created_at.isoformat(),
    }


class MealText(BaseModel):
    patient_id: int
    description: str = Field(min_length=1, max_length=500)


@router.post("", status_code=201)
async def log_meal(payload: MealText, db: Session = Depends(get_db)):
    patient = patient_service.get_patient(db, payload.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    prompt = (
        f"Patient conditions: {patient.conditions or 'none recorded'}.\n"
        f"They ate: {payload.description.strip()}"
    )
    raw = await gemini.generate(prompt, system_instruction=NUTRITION_SYSTEM, temperature=0.4)
    note, flagged = _parse_flag(raw)
    meal = Meal(patient_id=patient.id, kind="text", description=payload.description.strip()[:500], ai_note=note, flagged=flagged)
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return _serialize(meal)


@router.post("/image", status_code=201)
async def log_meal_image(
    patient_id: int = Form(...),
    note: str = Form(""),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if image.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type. Use JPEG, PNG, or WebP.")
    data = await image.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 8MB).")

    prompt = (
        f"This is a photo of a patient's meal. Patient conditions: "
        f"{patient.conditions or 'none recorded'}.\n"
        f"{('Their note: ' + note.strip()) if note.strip() else ''}\n"
        "First name the main foods you see, then give the nutrition feedback."
    )
    raw = await gemini.analyze_image(data, image.content_type, prompt, system_instruction=NUTRITION_SYSTEM, temperature=0.4)
    note_text, flagged = _parse_flag(raw)
    desc = note.strip()[:500] if note.strip() else "Meal photo"
    meal = Meal(patient_id=patient.id, kind="photo", description=desc, ai_note=note_text, flagged=flagged)
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return _serialize(meal)


@router.get("/patients/{patient_id}")
def list_meals(patient_id: int, db: Session = Depends(get_db)):
    if not patient_service.get_patient(db, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    rows = db.scalars(
        select(Meal).where(Meal.patient_id == patient_id).order_by(Meal.created_at.desc()).limit(40)
    ).all()
    return [_serialize(m) for m in rows]
