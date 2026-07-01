"""Base classes shared by all specialist agents.

An agent receives an :class:`AgentContext` (the user message plus everything it
might need — the patient record, conversation history, and a DB session) and
returns an :class:`AgentResult` (its contribution to the final answer plus any
structured side-data or urgency flag).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from backend.ai.gemini_client import gemini
from backend.models import User


@dataclass
class AgentContext:
    message: str
    patient: User | None
    db: Session
    history_text: str = "(no prior conversation)"
    patient_summary: str = ""
    # Free-form scratch space agents can read/write during one orchestration run
    shared: dict = field(default_factory=dict)


@dataclass
class AgentResult:
    agent: str
    content: str
    urgent: bool = False
    data: dict | None = None


class BaseAgent:
    #: unique key used by the router (e.g. "clinical")
    name: str = "base"
    #: system prompt from ``backend.ai.prompts``
    system_prompt: str = ""
    #: sampling temperature for this agent
    temperature: float = 0.4

    def build_prompt(self, ctx: AgentContext) -> str:
        """Default prompt assembly. Agents may override for tool use."""
        return (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"Current message: {ctx.message}"
        )

    async def run(self, ctx: AgentContext) -> AgentResult:
        prompt = self.build_prompt(ctx)
        content = await gemini.generate(
            prompt,
            system_instruction=self.system_prompt,
            temperature=self.temperature,
        )
        return AgentResult(agent=self.name, content=content)
