"""Analytics Agent — turns the patient's real data into plain-language insight."""
from __future__ import annotations

from backend.agents.base import AgentContext, AgentResult, BaseAgent
from backend.ai.gemini_client import gemini
from backend.ai.prompts import ANALYTICS_AGENT
from backend.services import appointment_service, medication_service, patient_service


class AnalyticsAgent(BaseAgent):
    name = "analytics"
    system_prompt = ANALYTICS_AGENT
    temperature = 0.2

    async def run(self, ctx: AgentContext) -> AgentResult:
        stats = self.compute_stats(ctx)
        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"Data snapshot:\n{_format_stats(stats)}\n\n"
            f"Message: {ctx.message}\n\n"
            "Give a short, encouraging insight grounded ONLY in the numbers above."
        )
        content = await gemini.generate(
            prompt, system_instruction=self.system_prompt, temperature=self.temperature
        )
        return AgentResult(agent=self.name, content=content, data=stats)

    def compute_stats(self, ctx: AgentContext) -> dict:
        if not ctx.patient:
            return {}
        pid = ctx.patient.id
        symptoms = patient_service.recent_symptoms(ctx.db, pid, limit=10)
        pain_points = [s.pain_level for s in symptoms if s.pain_level is not None]
        return {
            "adherence_rate": medication_service.adherence_rate(ctx.db, pid),
            "active_medications": len(medication_service.list_medications(ctx.db, pid)),
            "upcoming_appointments": len(
                appointment_service.list_appointments(ctx.db, pid, upcoming_only=True)
            ),
            "recent_symptom_count": len(symptoms),
            "avg_recent_pain": (
                round(sum(pain_points) / len(pain_points), 1) if pain_points else None
            ),
        }


def _format_stats(stats: dict) -> str:
    if not stats:
        return "(no data available)"
    return "\n".join(f"- {k.replace('_', ' ')}: {v}" for k, v in stats.items())
