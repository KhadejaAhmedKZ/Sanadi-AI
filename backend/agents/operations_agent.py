"""Operations Agent — appointments and healthcare logistics.

When the message expresses intent to book an appointment with a concrete date and
time, the agent actually creates it via the appointment service and reports the
confirmation. Otherwise it answers logistics questions conversationally.
"""
from __future__ import annotations

from datetime import datetime

from backend.agents.base import AgentContext, AgentResult, BaseAgent
from backend.ai.gemini_client import gemini
from backend.ai.prompts import OPERATIONS_AGENT
from backend.services import appointment_service


class OperationsAgent(BaseAgent):
    name = "operations"
    system_prompt = OPERATIONS_AGENT
    temperature = 0.3

    async def run(self, ctx: AgentContext) -> AgentResult:
        data: dict = {}
        booking_note = ""

        if ctx.patient:
            intent = await self._extract_booking(ctx.message)
            if intent.get("action") == "book" and intent.get("datetime"):
                when = _parse_dt(intent["datetime"])
                if when:
                    appt = appointment_service.book(
                        ctx.db,
                        patient_id=ctx.patient.id,
                        scheduled_for=when,
                        department=intent.get("department", "General"),
                        reason=intent.get("reason", ""),
                    )
                    data["appointment_booked"] = {
                        "id": appt.id,
                        "department": appt.department,
                        "scheduled_for": appt.scheduled_for.isoformat(),
                    }
                    booking_note = (
                        f"\n\n(An appointment was created: {appt.department} on "
                        f"{appt.scheduled_for:%Y-%m-%d %H:%M}. Confirm this to the user.)"
                    )

        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"Message: {ctx.message}{booking_note}"
        )
        content = await gemini.generate(
            prompt, system_instruction=self.system_prompt, temperature=self.temperature
        )
        return AgentResult(agent=self.name, content=content, data=data or None)

    async def _extract_booking(self, message: str) -> dict:
        instruction = (
            "Extract appointment intent from the message. Return ONLY JSON: "
            '{"action": "book|reschedule|cancel|none", '
            '"department": "string or General", "reason": "short", '
            '"datetime": "ISO 8601 like 2026-07-05T14:00 or null"}. '
            "Only set action=book if a specific date AND time are present."
        )
        return await gemini.generate_json(
            f"Now is {datetime.utcnow().isoformat()}. Message: {message}",
            system_instruction=instruction,
            temperature=0.0,
        )


def _parse_dt(value: str) -> datetime | None:
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(value, fmt)
        except (ValueError, TypeError):
            continue
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
