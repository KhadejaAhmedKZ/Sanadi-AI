# Sanadi AI (سندي) — Multi-Agent Healthcare Companion

> Your AI-powered healthcare support, always by your side.

Sanadi AI is a multi-agent healthcare platform. Instead of one chatbot, a set of
specialized agents collaborate behind a single conversation: an **Orchestrator**
routes each message, a **Safety** agent screens for emergencies first, and
**Clinical / Operations / Engagement / Analytics / Accessibility** agents handle
their domains. Their answers are synthesized into one reply.

This repository contains a **full-stack** app: a FastAPI + Gemini backend and a
hospital-themed **React (Vite)** frontend with working dashboards for patients,
caregivers and providers, an AI chat, a VR rehabilitation module, specialized
care modules, and full accessibility (voice, TTS/STT, large text, high contrast).

## Architecture

```
Patient message
      │
      ▼
Orchestrator ──► Safety screen ──(emergency?)──► stop + emergency guidance + alert caregivers
      │  no
      ▼
   Router (LLM) picks agents
      │
      ├─ Clinical        (medical Q&A, education)
      ├─ Operations      (appointments, logistics — books to DB)
      ├─ Engagement      (reminders, symptom/pain tracking — logs to DB)
      ├─ Analytics       (adherence & recovery insight from real data)
      └─ Accessibility   (adapts tone/format to the patient's needs)
      │
      ▼
   Synthesis (LLM) ──► one cohesive reply ──► saved to conversation memory
```

Key design points:
- **Safety-first.** Every message is screened before anything else. A keyword
  fail-safe catches critical phrases even if the model is unavailable.
- **Real side-effects.** Agents don't just talk — Operations books appointments,
  Engagement logs symptoms, Analytics reads actual adherence numbers.
- **Permission-gated caregivers.** A caregiver only sees the scopes the patient
  granted (`medications`, `appointments`, `symptoms`, `safety`).
- **Offline-degrading.** With no `GEMINI_API_KEY`, the DB, routing, dashboards,
  and the safety net all still work — handy for development and tests.

## Project layout

```
backend/
  main.py            FastAPI app + router registration
  config.py          Settings (.env)
  database.py        SQLAlchemy engine/session
  models.py          Users, meds, appointments, symptoms, messages, care links
  schemas.py         Pydantic request/response models
  ai/                gemini_client, prompts, memory
  agents/            orchestrator + safety + 5 specialists
  services/          medication / appointment / patient / notification logic
  api/               chat, patient, caregiver, doctor, appointment, analytics
  seed.py            Sample data loader
  data/              sample_patients.json
```

## Setup

```bash
cd "Sanadi Ai"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env      # then edit .env
```

Put a **fresh** Gemini API key in `.env` (`GEMINI_API_KEY=...`). Get one at
https://aistudio.google.com/apikey. `.env` is git-ignored — never commit it.

Seed sample patients and run:

```bash
python -m backend.seed          # creates sanadi.db with 2 demo patients
uvicorn backend.main:app --reload
```

Open the interactive API docs at http://localhost:8000/docs.

## Try it

```bash
# Chat (the main entry point)
curl -s localhost:8000/chat -H 'content-type: application/json' \
  -d '{"patient_id":1,"message":"What does ibuprofen do and can you book me a checkup?"}'

# Patient dashboard
curl -s localhost:8000/patients/1/dashboard

# Provider pre-visit AI summary
curl -s localhost:8000/providers/patients/1/summary
```

Demo logins (after seeding): `sara@example.com` / `demo1234`,
`ahmed@example.com` / `demo1234`.

## Key endpoints

| Method | Path | Purpose |
|-------|------|---------|
| POST | `/chat` | Talk to the multi-agent system |
| POST | `/patients/register`, `/patients/login` | Auth |
| GET  | `/patients/{id}/dashboard` | Meds, appointments, symptoms, adherence |
| POST | `/patients/symptoms` | Log a symptom |
| POST | `/medications`, `/medications/log` | Add med / log a dose |
| POST | `/appointments`, DELETE `/appointments/{id}` | Book / cancel |
| POST | `/caregivers/link` | Grant a caregiver scoped access |
| GET  | `/caregivers/{cid}/patients/{pid}/overview` | Permission-gated view |
| GET  | `/providers/patients/{id}/summary` | AI pre-visit summary |
| GET  | `/analytics/population` | Provider population insights |

## Frontend (React + Vite)

Hospital-themed single-page app in `frontend/`.

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173  (proxies /api -> :8000)
```

Run the backend (`uvicorn backend.main:app --reload`) alongside it. Pages:

| Route | What it does |
|-------|--------------|
| `/login`, `/register` | Auth (demo: sara@example.com / demo1234) |
| `/` | Home with live health stats & quick actions |
| `/chat` | Multi-agent AI chat — shows which agents replied; voice input & TTS |
| `/dashboard` | Meds, appointments, symptoms, adherence |
| `/appointments` | Book / cancel appointments |
| `/medications` | Add meds, log doses taken/missed |
| `/analytics` | Adherence + pain-trend charts |
| `/care` | Specialized care modules |
| `/care/rehabilitation` | 🥽 Interactive VR physiotherapy with AI rep counting & gamified levels |
| `/care/:module` | Memory / Chronic / Respiratory / Pediatric / Maternity |
| `/caregiver` | Permission-gated caregiver portal + alerts |
| `/provider` | Provider portal with AI pre-visit summaries |
| `/accessibility` | Voice control, TTS, STT, large text, high contrast |

## Notes & next steps

- Auth issues JWTs but routes aren't yet protected by a dependency — add a
  `require_user` dependency before production.
- `bcrypt` is pinned to 4.2.1 because passlib 1.7.4 breaks on bcrypt 5.x.
- Voice features use the browser Web Speech API (best in Chrome/Edge).
- The `vr/` Unity module from the concept doc is a future native companion to the
  in-browser VR rehab experience.

## Security

Never hardcode or share API keys. Keep them in `.env`. If a key is ever exposed,
rotate it immediately in Google AI Studio.
