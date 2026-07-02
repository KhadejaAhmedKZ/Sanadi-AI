# Sanadi AI (سندي) — Multi-Agent Healthcare Companion

> Your AI-powered healthcare support, always by your side.

Sanadi AI is a multi-agent healthcare platform. Instead of one chatbot, a set of
specialized agents collaborate behind a single conversation: an **Orchestrator**
routes each message, a **Safety** agent screens for emergencies first, and
**Clinical / Operations / Engagement / Analytics / Accessibility / Rehabilitation**
agents handle their domains. Their answers are synthesized into one reply.

This repository is a **full-stack, deployed** app: a FastAPI + Gemini backend and
a hospital-themed **React (Vite)** frontend with role-based portals for patients,
caregivers and providers, an AI chat, an interactive VR rehabilitation module,
six specialized care modules, and a full accessibility suite (hands-free face
control, screen-reader mode, voice input/output, large text, high contrast).

## 🌐 Live demo

| | |
|---|---|
| **App** | https://khadejaahmedkz.github.io/Sanadi-AI/ |
| **API** | https://sanadi-ai-backend.onrender.com |

Demo accounts (password `demo1234` for all):

| Role | Email |
|------|-------|
| 👤 Patient | `sara@example.com` |
| 👨‍👩‍👧 Caregiver | `care@example.com` (pre-linked to Sara) |
| 👨‍⚕️ Provider | `doctor@example.com` |

> The backend is on Render's free tier, which sleeps when idle — the first
> request after a nap takes ~30s, then it's fast. AI chat is limited to ~5
> messages/minute (Gemini free tier); everything else is unlimited.

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
      ├─ Clinical         (medical Q&A, education)
      ├─ Operations       (appointments, logistics — books to DB)
      ├─ Engagement       (reminders, symptom/pain tracking — logs to DB)
      ├─ Analytics        (adherence & recovery insight from real data)
      ├─ Accessibility    (adapts tone/format to the patient's needs)
      └─ Rehabilitation   (VR physiotherapy guidance, session-aware)
      │
      ▼
   One combined reply ──► saved to conversation memory
```

Key design points:
- **Safety-first.** Every message is screened before anything else. A keyword
  fail-safe catches critical phrases with **zero API calls**, even offline.
- **Single-call orchestration.** The free Gemini tier allows only 5 requests/min,
  so by default one Gemini call does safety + routing + reply + structured
  actions (booking, symptom logging) per message — see `SINGLE_CALL_MODE` below.
- **Real side-effects.** Agents don't just talk — Operations books appointments,
  Engagement logs symptoms, Rehab logs VR sessions, Analytics reads actual
  adherence numbers.
- **Role-based access.** Patients, caregivers, and providers each get their own
  portal and navigation; route guards keep each role in their own lane. A
  caregiver only sees the scopes a patient granted (`medications`,
  `appointments`, `symptoms`, `safety`).
- **Offline-degrading.** With no `GEMINI_API_KEY`, the DB, routing, dashboards,
  and the safety net all still work — handy for development and tests.

## Project layout

```
backend/
  main.py            FastAPI app + router registration, startup auto-seed
  config.py          Settings (.env) — CORS, SINGLE_CALL_MODE, etc.
  database.py        SQLAlchemy engine/session
  models.py          Users, meds, appointments, symptoms, rehab sessions, messages, care links
  schemas.py         Pydantic request/response models
  ai/                gemini_client, prompts, memory
  agents/            orchestrator + safety + 6 specialists (incl. rehabilitation)
  services/          medication / appointment / patient / notification / rehab logic
  api/               chat, patient, caregiver, doctor, appointment, analytics, rehab, care
  seed.py            Demo patients + caregiver + provider loader
  data/              sample_patients.json

frontend/
  src/
    pages/           Home, Chat, dashboards, Appointments, Medications, Analytics,
                      SpecializedCare, CareModule, Rehab, Accessibility, auth
    components/      Layout, Sidebar (role-aware), TopBar, FaceControl,
                      SpeechAnnouncer, RehabSkeleton, BreathingExercise, ui
    context/          AuthContext, AccessibilityContext
    hooks/           useVoice (speech-to-text), useFaceControl (MediaPipe)
    api/client.js     Central fetch wrapper for the backend

render.yaml                        Render blueprint (backend deploy)
.github/workflows/deploy-pages.yml GitHub Actions → gh-pages → GitHub Pages
```

## Setup (local)

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
python -m backend.seed          # creates sanadi.db with demo patient/caregiver/provider
uvicorn backend.main:app --reload
```

Open the interactive API docs at http://localhost:8000/docs.

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173  (proxies /api -> :8000)
```

Run the backend alongside it. Routes:

| Route | Role | What it does |
|-------|------|--------------|
| `/login`, `/register` | anyone | Auth |
| `/` | all | Home — patients see live stats; caregivers/providers redirect to their portal |
| `/chat` | patient | Multi-agent AI chat — shows which agents replied; voice input & TTS; attach a photo (📷) for the Clinical agent to analyze |
| `/dashboard` | patient | Meds, appointments, symptoms, adherence |
| `/appointments` | patient | Book / cancel appointments |
| `/medications` | patient | Add meds, log doses taken/missed |
| `/analytics` | patient | Adherence + pain-trend charts |
| `/care` | all | Specialized care modules directory |
| `/care/rehabilitation` | patient | 🥽 Interactive VR physiotherapy — animated holographic skeleton synced to reps, gamified points/levels |
| `/care/:module` | all | Memory / Chronic / Respiratory (guided 4-7-8 breathing timer) / Pediatric / Maternity |
| `/caregiver` | caregiver | Permission-gated patient overview + alerts |
| `/provider` | provider | Patient list + AI pre-visit summaries + population insights |
| `/accessibility` | all | Face control, screen reader, voice, large text, high contrast |

### Accessibility suite

All of these run **entirely in the browser** — no data leaves the device beyond
normal API calls:

- **Large text / high contrast** — global CSS modes.
- **Voice output** — text-to-speech for AI chat replies (Web Speech API).
- **Speech-to-text** — dictate chat messages via the mic button.
- **👁️ Face Control** (`useFaceControl.js`) — for users with limited hand/arm
  mobility. Uses **MediaPipe Tasks Vision** (WASM, runs fully client-side) to
  track head position and drive an on-screen cursor; a deliberate **blink**
  taps whatever is under it. Includes a live camera preview, blink meter, and
  sensitivity sliders.
- **📢 Screen Reader mode** (`SpeechAnnouncer.jsx`) — for blind/low-vision
  users. Announces each page on navigation, reads the accessible name of any
  button/link/field on focus (Tab key) or hover, and a "Read page" button
  reads the full page on demand. AI replies are spoken automatically.

## Try the API directly

```bash
# Chat (the main entry point)
curl -s localhost:8000/chat -H 'content-type: application/json' \
  -d '{"patient_id":1,"message":"What does ibuprofen do and can you book me a checkup?"}'

# Patient dashboard
curl -s localhost:8000/patients/1/dashboard

# Provider pre-visit AI summary
curl -s localhost:8000/providers/patients/1/summary

# VR rehab progress
curl -s localhost:8000/rehab/patients/1/progress
```

## Key endpoints

| Method | Path | Purpose |
|-------|------|---------|
| POST | `/chat` | Talk to the multi-agent system |
| POST | `/chat/image` | Upload a photo (rash, wound, medication…) for the Clinical agent to review |
| POST | `/patients/register`, `/patients/login` | Auth |
| GET  | `/patients/{id}/dashboard` | Meds, appointments, symptoms, adherence |
| POST | `/patients/symptoms` | Log a symptom |
| POST | `/medications`, `/medications/log` | Add med / log a dose |
| POST | `/appointments`, DELETE `/appointments/{id}` | Book / cancel |
| POST | `/caregivers/link` | Grant a caregiver scoped access |
| GET  | `/caregivers/{cid}/patients/{pid}/overview` | Permission-gated view |
| GET  | `/providers/patients/{id}/summary` | AI pre-visit summary |
| GET  | `/providers/patients` | All patients (provider view) |
| GET  | `/analytics/population` | Provider population insights |
| GET  | `/rehab/exercises`, POST `/rehab/sessions` | VR exercise catalog / log a session |
| GET  | `/rehab/patients/{id}/progress` | Points, level, session history |
| GET  | `/care/modules` | Specialized care module metadata |
| GET  | `/health` | Liveness + whether Gemini is online |

## Deploy (GitHub Pages + Render)

GitHub Pages hosts static files only, so the React frontend goes on Pages and the
Python backend goes on Render (free). This repo is already wired for both.

**1. Backend → Render**
1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New + → Blueprint**, connect this repo.
   Render reads `render.yaml` and creates the `sanadi-ai-backend` web service.
3. In the service's **Environment** tab, set `GEMINI_API_KEY` to your key.
4. Deploy. Copy the service URL, e.g. `https://sanadi-ai-backend.onrender.com`.
   (Free instances sleep when idle; the first request after a nap takes ~30s.
   The DB is ephemeral on Render — it resets and re-seeds demo data on each
   redeploy.)

**2. Frontend → GitHub Pages**
1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables → New variable**:
   name `VITE_API_URL`, value = your Render URL (no trailing slash).
3. Push to `main` (or re-run the **Deploy frontend to GitHub Pages** workflow
   from the Actions tab). It builds `frontend/` and publishes to the
   `gh-pages` branch, which GitHub Pages serves.
4. Your site: `https://<username>.github.io/<repo>/`

The Vite base path is `/Sanadi-AI/` and routing uses `HashRouter`, so deep links
and refreshes work on Pages with no server-side routing. If you rename the repo,
update `base` in `frontend/vite.config.js` to match.

> Note: this project deploys via the `gh-pages` branch method
> (`peaceiris/actions-gh-pages`), not the native `actions/deploy-pages`, because
> the latter was unreliable ("Deployment cancelled") right after Pages was
> first enabled via API on this repo.

## Notes & known limitations

- Auth issues JWTs but routes aren't yet protected by a dependency — add a
  `require_user` dependency before handling real patient data in production.
- `bcrypt` is pinned to 4.2.1 because passlib 1.7.4 breaks on bcrypt 5.x.
- Voice and face-control features use browser APIs (Web Speech API, MediaPipe
  WASM) — best in Chrome/Edge/Safari with a webcam and microphone.
- **Free Gemini tier = 5 requests/min.** By default `SINGLE_CALL_MODE=true`
  collapses the whole multi-agent pipeline into ONE Gemini call per message
  (safety + routing + reply + booking/symptom actions) so the free tier works.
  Set `SINGLE_CALL_MODE=false` in `.env` to use the full fan-out pipeline on a
  paid/higher-quota key. The emergency safety net runs offline (zero API calls)
  regardless of this setting.
- The `vr/` Unity module from the original concept doc is a possible future
  native companion to the in-browser VR rehab experience, which today is a
  fully interactive (non-Unity) web simulation with an animated SVG skeleton,
  AI-guided rep tracking, and gamified points/levels.

## Security

Never hardcode or share API keys. Keep them in `.env` (git-ignored) locally and
in the host's environment settings (Render dashboard) in production. If a key
is ever exposed, rotate it immediately in Google AI Studio.
