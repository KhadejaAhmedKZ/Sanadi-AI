"""Safety Agent — pre-screens every message and can halt the normal workflow."""
from __future__ import annotations

from backend.agents.base import AgentContext, AgentResult, BaseAgent
from backend.ai.gemini_client import gemini
from backend.ai.prompts import SAFETY_AGENT
from backend.services import notification_service


class SafetyAgent(BaseAgent):
    name = "safety"
    system_prompt = SAFETY_AGENT
    temperature = 0.0

    async def screen(self, ctx: AgentContext) -> AgentResult:
        """Return an AgentResult where ``data`` holds the structured screening."""
        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"Message to screen: {ctx.message}"
        )
        result = await gemini.generate_json(
            prompt, system_instruction=self.system_prompt, temperature=0.0
        )

        emergency = bool(result.get("emergency"))
        severity = result.get("severity", "none")
        guidance = result.get("guidance", "")
        reason = result.get("reason", "")

        # Fail-safe keyword net in case the model is offline or misses it.
        if not emergency and _looks_critical(ctx.message):
            emergency = True
            severity = "high"
            guidance = guidance or (
                "This may be a medical emergency. Please contact your local "
                "emergency number or go to the nearest emergency department now."
            )

        # If there's a real emergency, alert any caregivers with the 'safety' scope.
        if emergency and ctx.patient:
            notification_service.notify_caregivers(
                ctx.db,
                patient_id=ctx.patient.id,
                title="⚠️ Urgent: possible emergency reported",
                body=f"{ctx.patient.name} reported: “{ctx.message}”. Reason: {reason}",
                scope="safety",
            )

        content = (
            guidance
            if emergency
            else "No safety concerns detected."
        )
        return AgentResult(
            agent=self.name,
            content=content,
            urgent=emergency,
            data={"severity": severity, "reason": reason, "emergency": emergency},
        )


_CRITICAL_KEYWORDS = (
    "chest pain",
    "chest tightness",
    "crushing chest",
    "heart attack",
    "can't breathe",
    "cannot breathe",
    "difficulty breathing",
    "trouble breathing",
    "gasping",
    "not breathing",
    "choking",
    "suicidal",
    "kill myself",
    "want to die",
    "end my life",
    "hurt myself",
    "unconscious",
    "passed out",
    "fainted",
    "collapsed",
    "seizure",
    "severe bleeding",
    "vomiting blood",
    "coughing blood",
    "stroke",
    "face drooping",
    "slurred speech",
    "numb on one side",
    "can't feel my",
    "worst headache",
    "overdose",
    "anaphylaxis",
    "allergic reaction",
    "call an ambulance",
    "call 911",
    "call 999",
    "call 112",
)


def _looks_critical(message: str) -> bool:
    low = message.lower()
    return any(k in low for k in _CRITICAL_KEYWORDS)
