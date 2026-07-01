"""Sanadi AI — FastAPI application entry point.

Run with:  uvicorn backend.main:app --reload
Docs at:   http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.ai.gemini_client import gemini
from backend.api import (
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
    logger.info(
        "Sanadi AI starting — Gemini %s",
        "online" if gemini.online else "OFFLINE (no API key)",
    )
    yield
    logger.info("Sanadi AI shutting down.")


app = FastAPI(
    title=settings.app_name,
    description="An intelligent multi-agent healthcare companion.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — open in dev; lock this down for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else [],
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
