"""Accessibility Agent — adapts tone and format to the patient's needs."""
from backend.agents.base import AgentContext, BaseAgent
from backend.ai.prompts import ACCESSIBILITY_AGENT


class AccessibilityAgent(BaseAgent):
    name = "accessibility"
    system_prompt = ACCESSIBILITY_AGENT
    temperature = 0.3

    def build_prompt(self, ctx: AgentContext) -> str:
        needs = (
            ctx.patient.accessibility_needs
            if ctx.patient and ctx.patient.accessibility_needs
            else "none specified"
        )
        return (
            f"Patient accessibility needs: {needs}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"Message: {ctx.message}\n\n"
            "Provide clear, accessible guidance and, if useful, suggest interface "
            "adaptations (larger text, high contrast, voice) tailored to these needs."
        )
