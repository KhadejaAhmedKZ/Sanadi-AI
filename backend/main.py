"""Sanadi AI — FastAPI application entry point.

Run with:  uvicorn backend.main:app --reload
Docs at:   http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.ai.gemini_client import gemini
from backend.api import (
    body_routes,
    lab_routes,
    analytics_routes,
    appointment_routes,
    care_routes,
    caregiver_routes,
    chat_routes,
    doctor_routes,
    patient_routes,
    rehab_routes,
)
from backend.config import settings
from backend.database import init_db
from backend.utils.logger import configure_logging, get_logger

logger = get_logger("sanadi.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_db()
    if settings.seed_on_start:
        _maybe_seed()
    logger.info(
        "Sanadi AI starting — Gemini %s",
        "online" if gemini.online else "OFFLINE (no API key)",
    )
    yield
    logger.info("Sanadi AI shutting down.")


def _maybe_seed() -> None:
    """Seed demo data if there are no users yet (safe on fresh hosts)."""
    from backend.database import SessionLocal
    from backend.models import User

    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            from backend.seed import seed

            seed()
            logger.info("Seeded demo data on startup.")
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Startup seed skipped: %s", exc)
    finally:
        db.close()


app = FastAPI(
    title=settings.app_name,
    description="An intelligent multi-agent healthcare companion.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — configurable via ALLOWED_ORIGINS ("*" or comma-separated list).
_origins = (
    ["*"]
    if settings.allowed_origins.strip() == "*"
    else [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (
    chat_routes,
    patient_routes,
    caregiver_routes,
    doctor_routes,
    appointment_routes,
    analytics_routes,
    rehab_routes,
    care_routes,
    lab_routes,
    body_routes,
):
    app.include_router(module.router)


@app.get("/", tags=["meta"])
def root():
    return {
        "app": settings.app_name,
        "tagline": "Your AI-powered healthcare support, always by your side.",
        "gemini": "online" if gemini.online else "offline",
        "docs": "/docs",
    }


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "gemini_online": gemini.online}
