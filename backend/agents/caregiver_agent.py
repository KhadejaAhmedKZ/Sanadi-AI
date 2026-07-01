"""Caregiver Assistant — supports a family member helping a patient."""
from backend.agents.base import BaseAgent
from backend.ai.prompts import CAREGIVER_AGENT


class CaregiverAgent(BaseAgent):
    name = "caregiver"
    system_prompt = CAREGIVER_AGENT
    temperature = 0.4
