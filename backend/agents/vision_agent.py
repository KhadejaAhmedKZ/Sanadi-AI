"""Vision Agent — image analysis, attributed to the Clinical agent in the UI.

Kept separate from the text orchestrator since it's a distinct, one-shot
multimodal call rather than the routed multi-agent pipeline.
"""
from __future__ import annotations

from backend.ai.gemini_client import gemini
from backend.ai.prompts import VISION_AGENT

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


class VisionAgent:
    name = "clinical"

    async def analyze(
        self, image_bytes: bytes, mime_type: str, message: str, patient_summary: str
    ) -> str:
        prompt = (
            f"Patient profile: {patient_summary or 'unknown'}\n"
            f"Patient's message about the photo: {message or '(no additional message provided)'}\n\n"
            "Analyze the attached image."
        )
        return await gemini.analyze_image(
            image_bytes, mime_type, prompt, system_instruction=VISION_AGENT
        )


vision_agent = VisionAgent()
