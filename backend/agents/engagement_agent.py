"""Patient Engagement Agent — reminders, check-ins, and symptom/pain tracking.

Beyond generating an encouraging reply, this agent has a real side-effect: when
the message describes a symptom or pain level, it records it to the database so
the Analytics Agent and dashboards can use it.
"""
from __future__ import annotations

import re

from backend.agents.base import AgentContext, AgentResult, BaseAgent
from backend.ai.gemini_client import gemini
from backend.ai.prompts import ENGAGEMENT_AGENT
from backend.services import medication_service, patient_service


class EngagementAgent(BaseAgent):
    name = "engagement"
    system_prompt = ENGAGEMENT_AGENT
    temperature = 0.5

    async def run(self, ctx: AgentContext) -> AgentResult:
        data: dict = {}

        # Extract a structured symptom/pain observation, if any.
        if ctx.patient:
            extracted = await self._extract_symptom(ctx.message)
            if extracted.get("is_symptom"):
                log = patient_service.log_symptom(
                    ctx.db,
                    patient_id=ctx.patient.id,
                    description=extracted.get("description", ctx.message),
                    pain_level=extracted.get("pain_level"),
                )
                data["symptom_logged"] = {
                    "id": log.id,
                    "pain_level": log.pain_level,
                    "description": log.description,
                }

        # Give the agent context about current meds + adherence.
        med_context = ""
        if ctx.patient:
            meds = medication_service.list_medications(ctx.db, ctx.patient.id)
            rate = medication_service.adherence_rate(ctx.db, ctx.patient.id)
            med_names = ", ".join(m.name for m in meds) or "none on file"
            med_context = (
                f"Current medications: {med_names}. "
                f"Adherence so far: {int(rate * 100)}%."
            )

        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"{med_context}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"Message: {ctx.message}"
        )
        if data.get("symptom_logged"):
            prompt += "\n\n(Note: this symptom has been recorded for tracking.)"

        content = await gemini.generate(
            prompt, system_instruction=self.system_prompt, temperature=self.temperature
        )
        return AgentResult(agent=self.name, content=content, data=data or None)

    async def _extract_symptom(self, message: str) -> dict:
        instruction = (
            "Decide if the message reports a physical symptom or pain. "
            'Return ONLY JSON: {"is_symptom": true|false, '
            '"description": "short text", "pain_level": 0-10 or null}. '
            "pain_level should be an integer only if the user gives or implies a scale."
        )
        result = await gemini.generate_json(
            f"Message: {message}", system_instruction=instruction, temperature=0.0
        )
        if not result:
            # Offline / failure fallback: light heuristic for a pain number.
            match = re.search(r"\b(?:pain|hurts?)\b.*?(\d{1,2})\s*/?\s*10", message.lower())
            if match:
                return {
                    "is_symptom": True,
                    "description": message,
                    "pain_level": int(match.group(1)),
                }
        return result
