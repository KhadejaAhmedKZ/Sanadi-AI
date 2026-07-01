"""Thin async wrapper around the Google Gemini SDK (``google-genai``).

Every agent shares one client instance. The wrapper exposes two helpers:

* ``generate`` — free-form text generation with a system instruction.
* ``generate_json`` — same, but forces a JSON response and parses it.

If no API key is configured the client runs in a degraded "offline" mode that
returns a clear placeholder instead of crashing, so the rest of the app (DB,
routing, dashboards) stays testable without network access.
"""
from __future__ import annotations

import json
import logging

from backend.config import settings

logger = logging.getLogger("sanadi.gemini")


class GeminiClient:
    def __init__(self) -> None:
        self._model = settings.gemini_model
        self._client = None
        if settings.gemini_api_key:
            try:
                from google import genai

                self._client = genai.Client(api_key=settings.gemini_api_key)
            except Exception as exc:  # pragma: no cover - defensive
                logger.warning("Could not initialise Gemini client: %s", exc)
                self._client = None
        else:
            logger.warning("GEMINI_API_KEY not set — running in offline mode.")

    @property
    def online(self) -> bool:
        return self._client is not None

    async def generate(
        self,
        prompt: str,
        system_instruction: str = "",
        temperature: float = 0.4,
    ) -> str:
        if not self._client:
            return "[offline] Gemini API key not configured."
        from google.genai import types

        try:
            resp = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction or None,
                    temperature=temperature,
                ),
            )
            return (resp.text or "").strip()
        except Exception as exc:
            logger.error("Gemini generate failed: %s", exc)
            return "I'm having trouble reaching my knowledge service right now. Please try again shortly."

    async def generate_json(
        self,
        prompt: str,
        system_instruction: str = "",
        temperature: float = 0.1,
    ) -> dict:
        """Return a parsed JSON object. Falls back to ``{}`` on any error."""
        if not self._client:
            return {}
        from google.genai import types

        try:
            resp = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction or None,
                    temperature=temperature,
                    response_mime_type="application/json",
                ),
            )
            return json.loads(resp.text or "{}")
        except Exception as exc:
            logger.error("Gemini generate_json failed: %s", exc)
            return {}


# Shared singleton
gemini = GeminiClient()
