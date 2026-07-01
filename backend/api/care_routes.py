"""Specialized care module metadata (Rehab, Memory, Chronic, Respiratory, etc.)."""
from fastapi import APIRouter

router = APIRouter(prefix="/care", tags=["care modules"])

CARE_MODULES = [
    {
        "id": "rehabilitation",
        "icon": "🥽",
        "name": "Rehabilitation Care",
        "tagline": "Stroke, fractures & orthopedic recovery",
        "features": [
            "VR physiotherapy",
            "AI rep counting & posture cues",
            "Adaptive difficulty",
            "Physiotherapist progress reports",
            "Session reminders",
        ],
        "route": "/care/rehabilitation",
        "color": "#0ea5e9",
    },
    {
        "id": "memory",
        "icon": "🧠",
        "name": "Memory Care",
        "tagline": "Alzheimer's & dementia support",
        "features": [
            "Medication reminders",
            "Daily routine assistance",
            "Memory exercises",
            "Caregiver support & alerts",
            "Safety monitoring",
        ],
        "route": "/care/memory",
        "color": "#8b5cf6",
    },
    {
        "id": "chronic",
        "icon": "❤️",
        "name": "Chronic Disease Care",
        "tagline": "Diabetes, hypertension & heart disease",
        "features": [
            "Blood pressure & glucose tracking",
            "Medication management",
            "Lifestyle guidance",
            "Health trend analysis",
        ],
        "route": "/care/chronic",
        "color": "#ef4444",
    },
    {
        "id": "respiratory",
        "icon": "🫁",
        "name": "Respiratory Care",
        "tagline": "Asthma & COPD",
        "features": [
            "Guided breathing exercises",
            "Symptom & trigger tracking",
            "Inhaler reminders",
            "Emergency guidance",
        ],
        "route": "/care/respiratory",
        "color": "#14b8a6",
    },
    {
        "id": "pediatric",
        "icon": "🧒",
        "name": "Pediatric Care",
        "tagline": "Care for children",
        "features": [
            "Vaccination tracking",
            "Growth monitoring",
            "Medication reminders",
            "Parent education",
            "Development milestones",
        ],
        "route": "/care/pediatric",
        "color": "#f59e0b",
    },
    {
        "id": "maternity",
        "icon": "🤰",
        "name": "Maternity Care",
        "tagline": "Pregnancy support",
        "features": [
            "Pregnancy timeline",
            "Appointment reminders",
            "Pregnancy education",
            "Health tracking",
            "Preparation checklist",
        ],
        "route": "/care/maternity",
        "color": "#ec4899",
    },
]


@router.get("/modules")
def modules():
    return CARE_MODULES
