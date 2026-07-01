"""Clinical Agent — medical knowledge and education."""
from backend.agents.base import BaseAgent
from backend.ai.prompts import CLINICAL_AGENT


class ClinicalAgent(BaseAgent):
    name = "clinical"
    system_prompt = CLINICAL_AGENT
    temperature = 0.3
