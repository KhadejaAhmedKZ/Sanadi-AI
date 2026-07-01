"""Orchestrator Agent — the brain of Sanadi AI.

Flow for each patient message:

1. Build context (patient summary + recent conversation history).
2. SAFETY pre-screen. A true emergency short-circuits the normal workflow.
3. ROUTE: an LLM router picks the smallest set of specialist agents.
4. RUN the chosen agents concurrently.
5. SYNTHESIZE their contributions into one natural reply.
6. PERSIST the turn to conversation memory.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from backend.agents.accessibility_agent import AccessibilityAgent
from backend.agents.analytics_agent import AnalyticsAgent
from backend.agents.base import AgentContext, AgentResult
from backend.agents.clinical_agent import ClinicalAgent
from backend.agents.engagement_agent import EngagementAgent
from backend.agents.operations_agent import OperationsAgent, _parse_dt
from backend.agents.rehab_agent import RehabAgent
from backend.agents.safety_agent import SafetyAgent, _looks_critical
from backend.ai import memory
from backend.ai.gemini_client import gemini
from backend.ai.prompts import COMBINED_ORCHESTRATOR, ORCHESTRATOR_ROUTER, SYNTHESIS
from backend.config import settings
from backend.services import appointment_service, notification_service, patient_service

logger = logging.getLogger("sanadi.orchestrator")

# Registry of routable specialist agents (safety is handled separately).
SPECIALISTS = {
    "clinical": ClinicalAgent(),
    "operations": OperationsAgent(),
    "engagement": EngagementAgent(),
    "analytics": AnalyticsAgent(),
    "accessibility": AccessibilityAgent(),
    "rehabilitation": RehabAgent(),
}

DEFAULT_AGENTS = ["clinical", "engagement"]

_EMERGENCY_TEXT = (
    "🚨 This sounds like it could be urgent.\n\n"
    "If you may be in danger, please contact your local emergency number or go "
    "to the nearest emergency department right now. I've flagged this and, if "
    "permitted, notified your caregiver."
)


class Orchestrator:
    def __init__(self) -> None:
        self.safety = SafetyAgent()

    async def handle(self, db: Session, patient_id: int, message: str) -> dict:
        patient = patient_service.get_patient(db, patient_id)
        history = memory.load_history(db, patient_id)
        ctx = AgentContext(
            message=message,
            patient=patient,
            db=db,
            history_text=memory.format_history(history),
            patient_summary=patient_service.patient_summary(patient) if patient else "",
        )

        if settings.single_call_mode:
            return await self._handle_single_call(ctx, db, patient_id, message)
        return await self._handle_pipeline(ctx, db, patient_id, message)

    async def _handle_single_call(
        self, ctx: AgentContext, db: Session, patient_id: int, message: str
    ) -> dict:
        """One Gemini call does safety + routing + reply + structured actions.

        Free-tier friendly (fits 5 requests/min). The offline keyword safety net
        still runs first and costs zero API calls.
        """
        # Offline safety net first — catches critical phrases with no API call.
        if _looks_critical(message):
            if ctx.patient:
                notification_service.notify_caregivers(
                    db,
                    patient_id=patient_id,
                    title="⚠️ Urgent: possible emergency reported",
                    body=f"{ctx.patient.name} reported: “{message}”",
                    scope="safety",
                )
            reply = _EMERGENCY_TEXT
            memory.save_turn(db, patient_id, message, reply, agents_used=json.dumps(["safety"]))
            return {"reply": reply, "emergency": True, "agents_used": ["safety"], "contributions": []}

        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"Now: {datetime.utcnow().isoformat()}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"User message: {message}"
        )
        result = await gemini.generate_json(
            prompt, system_instruction=COMBINED_ORCHESTRATOR, temperature=0.4
        )

        if not result or not result.get("reply"):
            reply = (
                "I'm getting a lot of requests right now (free-tier limit). "
                "Please wait about a minute and try again — everything else in "
                "the app works without delay."
            )
            memory.save_turn(db, patient_id, message, reply, agents_used=json.dumps([]))
            return {"reply": reply, "emergency": False, "agents_used": [], "contributions": []}

        emergency = bool(result.get("emergency"))
        reply = result.get("reply", "")
        agents = result.get("agents") or (["safety"] if emergency else DEFAULT_AGENTS)

        # Execute structured side-effects locally (no extra API calls).
        if ctx.patient and not emergency:
            action = result.get("action")
            if isinstance(action, dict) and action.get("type") == "book_appointment":
                when = _parse_dt(action.get("datetime", ""))
                if when:
                    appointment_service.book(
                        db,
                        patient_id=patient_id,
                        scheduled_for=when,
                        department=action.get("department", "General"),
                        reason=action.get("reason", ""),
                    )
                    if "operations" not in agents:
                        agents.append("operations")
            sym = result.get("symptom")
            if isinstance(sym, dict) and sym.get("description"):
                patient_service.log_symptom(
                    db, patient_id, sym["description"], sym.get("pain_level")
                )
                if "engagement" not in agents:
                    agents.append("engagement")

        if emergency and ctx.patient:
            notification_service.notify_caregivers(
                db,
                patient_id=patient_id,
                title="⚠️ Urgent: possible emergency reported",
                body=f"{ctx.patient.name} reported: “{message}”",
                scope="safety",
            )

        memory.save_turn(db, patient_id, message, reply, agents_used=json.dumps(agents))
        return {"reply": reply, "emergency": emergency, "agents_used": agents, "contributions": []}

    async def _handle_pipeline(
        self, ctx: AgentContext, db: Session, patient_id: int, message: str
    ) -> dict:
        # --- 1. Safety first ---
        safety = await self.safety.screen(ctx)
        if safety.urgent:
            reply = self._emergency_reply(safety)
            memory.save_turn(
                db, patient_id, message, reply, agents_used=json.dumps(["safety"])
            )
            return {
                "reply": reply,
                "emergency": True,
                "agents_used": ["safety"],
                "contributions": [_contribution(safety)],
            }

        # --- 2. Route ---
        agent_keys = await self._route(ctx)

        # --- 3. Run specialists concurrently ---
        agents = [SPECIALISTS[k] for k in agent_keys if k in SPECIALISTS]
        results: list[AgentResult] = await asyncio.gather(
            *(a.run(ctx) for a in agents)
        )

        # --- 4. Synthesize ---
        reply = await self._synthesize(ctx, results)

        # --- 5. Persist ---
        used = [r.agent for r in results]
        memory.save_turn(db, patient_id, message, reply, agents_used=json.dumps(used))

        return {
            "reply": reply,
            "emergency": False,
            "agents_used": used,
            "contributions": [_contribution(r) for r in results],
        }

    async def _route(self, ctx: AgentContext) -> list[str]:
        prompt = (
            f"Patient profile: {ctx.patient_summary or 'unknown'}\n"
            f"Recent conversation:\n{ctx.history_text}\n\n"
            f"User message: {ctx.message}"
        )
        result = await gemini.generate_json(
            prompt, system_instruction=ORCHESTRATOR_ROUTER, temperature=0.0
        )
        agents = result.get("agents") if isinstance(result, dict) else None
        if not agents:
            logger.info("Router returned nothing; using defaults.")
            return DEFAULT_AGENTS
        # Keep only known agents, preserve order, dedupe.
        seen, cleaned = set(), []
        for a in agents:
            if a in SPECIALISTS and a not in seen:
                seen.add(a)
                cleaned.append(a)
        return cleaned or DEFAULT_AGENTS

    async def _synthesize(self, ctx: AgentContext, results: list[AgentResult]) -> str:
        if not results:
            return "I'm here to help. Could you tell me a bit more about what you need?"
        if len(results) == 1:
            return results[0].content

        blocks = "\n\n".join(
            f"[{r.agent} agent]\n{r.content}" for r in results if r.content
        )
        prompt = (
            f"User message: {ctx.message}\n\n"
            f"Specialist contributions:\n{blocks}\n\n"
            "Write the single final reply to the user."
        )
        return await gemini.generate(prompt, system_instruction=SYNTHESIS, temperature=0.3)

    @staticmethod
    def _emergency_reply(safety: AgentResult) -> str:
        guidance = safety.content or (
            "This may be a medical emergency. Please seek immediate care."
        )
        return (
            "🚨 This sounds like it could be urgent.\n\n"
            f"{guidance}\n\n"
            "If you are in immediate danger, contact your local emergency number now. "
            "I've flagged this and, if permitted, notified your caregiver."
        )


def _contribution(r: AgentResult) -> dict:
    return {"agent": r.agent, "content": r.content, "urgent": r.urgent, "data": r.data}


# Shared singleton used by the API layer.
orchestrator = Orchestrator()
