"""Rehabilitation Agent — VR physiotherapy guidance and progress awareness."""
from __future__ import annotations

from sqlalchemy import select

from backend.agents.base import AgentContext, AgentResult, BaseAgent
from backend.ai.gemini_client import gemini
from backend.ai.prompts import REHAB_AGENT
from backend.models import RehabSession


class RehabAgent(BaseAgent):
    name = "rehabilitation"
    system_prompt = REHAB_AGENT
    temperature = 0.4

    async def run(self, ctx: AgentContext) -> AgentResult:
        progress = ""
        if ctx.patient:
            sessions = ctx.db.scalars(
                select(RehabSession)
                .where(RehabSession.patient_id == ctx.patient.id)
                .order_by(RehabSession.completed_at.desc())
                .limit(5)
            ).all()
            if sessions:
                total_points = sum(s.points for s in sessions)
                last = sessions[0]
                progress = (
                    f"Recent rehab: {len(sessions)} sessions, {total_points} points. "
                    f"Last: {last.exercise} {last.reps_completed}/{last.reps_target} "
                    f"reps at {last.difficulty} difficulty."
                )

        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"{progress}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"Message: {ctx.message}"
        )
        content = await gemini.generate(
            prompt, system_instruction=self.system_prompt, temperature=self.temperature
        )
        return AgentResult(agent=self.name, content=content)
