# Sanadi AI (سندي) — Multi-Agent Healthcare Companion

> Your AI-powered healthcare support, always by your side.

Sanadi AI is a full-stack, **deployed** healthcare platform: a FastAPI + Gemini
multi-agent backend, and a premium, animated React frontend with role-based
portals for patients, caregivers, and providers — AI chat with image analysis,
an interactive VR rehabilitation module, six specialized care modules, a full
hands-free/screen-reader accessibility suite, dark mode, and live charts.

## 🌐 Live demo

| | |
|---|---|
| **App** | https://khadejaahmedkz.github.io/Sanadi-AI/ |
| **API** | https://sanadi-ai-backend.onrender.com |

Demo accounts (password `demo1234` for all):

| Role | Email | Notes |
|------|-------|-------|
| 👤 Patient | `sara@example.com` | Full patient experience |
| 👨‍👩‍👧 Caregiver | `care@example.com` | Pre-linked to Sara with all permission scopes |
| 👨‍⚕️ Provider | `doctor@example.com` | Sees all patients |

> The backend is on Render's free tier and sleeps when idle — the first request
> after a nap takes ~30s, then it's fast. AI chat is limited to ~5
> messages/minute (Gemini free tier); everything else is unlimited. The
> database is ephemeral on Render and re-seeds demo data on every redeploy.

---

## 1. The multi-agent AI system

A single conversation is handled by an **Orchestrator** that coordinates six
specialist agents plus a dedicated **Safety** agent:

```
Patient message
      │
      ▼
Orchestrator ──► Safety screen ──(emergency?)──► stop + emergency guidance + alert caregivers
      │  no
      ▼
   Router (LLM) picks agents
      │
      ├─ 👨‍⚕️ Clinical         medical Q&A, education, and photo analysis
      ├─ 📅 Operations       appointments & logistics — books to the DB
      ├─ ❤️ Engagement       reminders, symptom/pain tracking — logs to the DB
      ├─ 📊 Analytics        adherence & recovery insight from real data
      ├─ ♿ Accessibility    adapts tone/format to the patient's needs
      └─ 🥽 Rehabilitation   VR physiotherapy guidance, session-aware
      │
      ▼
   One combined reply ──► saved to conversation memory
```

**Design decisions:**
- **Safety-first.** Every message is screened before anything else. A keyword
  fail-safe (chest pain, severe bleeding, suicidal ideation, etc.) catches
  critical phrases with **zero API calls**, even if Gemini is offline, and
  notifies the patient's caregiver.
- **Single-call orchestration.** The free Gemini tier allows only 5
  requests/minute. By default (`SINGLE_CALL_MODE=true`), one Gemini call does
  safety + agent routing + the reply + structured actions (booking an
  appointment, logging a symptom) per message. A full multi-agent fan-out
  pipeline exists behind `SINGLE_CALL_MODE=false` for a paid/higher-quota key.
- **Real side-effects, not just talk.** Operations books appointments,
  Engagement logs symptoms, Rehab logs VR sessions, Analytics reads actual
  adherence numbers — the AI can act, not just answer.
- **Image analysis.** A patient can attach a photo (rash, wound, medication
  label, printed test result) in chat. Gemini's multimodal vision analyzes it
  under strict guardrails: no definitive diagnosis, flags likely emergencies,
  always recommends in-person evaluation. File-type/size validated both
  client- and server-side (JPEG/PNG/WebP/HEIC, max 8MB).
- **Role-based access.** Patients, caregivers, and providers each get their
  own portal and navigation; route guards keep each role in its own lane. A
  caregiver only sees the permission scopes a patient granted
  (`medications`, `appointments`, `symptoms`, `safety`).
- **Offline-degrading.** With no `GEMINI_API_KEY`, the DB, routing,
  dashboards, and the safety net all still work.

---

## 2. Full feature list

### Patient experience
- **Home** — greeting, current date, an animated health-score ring (computed
  from real adherence + pain + rehab-level data), upcoming appointment card,
  medication reminder, recovery-progress card, a weather widget (clearly
  labeled demo — no weather API key wired up), quick actions, and a 10-tile
  animated stat grid (adherence, appointments, recovery %, and any vitals the
  patient has actually logged are real; heart rate/sleep/steps/water/calories
  are deterministic per-day demo values, since there's no wearable
  integration — visually distinct from real data).
- **My Health dashboard** — medications, upcoming appointments, and a recent
  symptom timeline with color-coded pain badges.
- **Appointments** — book (department, reason, date/time) and cancel; list of
  scheduled/completed/cancelled visits.
- **Medications** — add a prescription, log each dose taken/missed (feeds
  adherence rate everywhere else in the app).
- **Analytics** — Recharts area chart of the pain trend, adherence progress
  ring, and a plain-language insight card.
- **AI Assistant (Chat)** — ChatGPT-style bubbles, typing/"thinking"
  indicator, suggested prompts, markdown rendering (bold/italic/code/lists/
  links/code-blocks with copy buttons — a dependency-free renderer with no
  `dangerouslySetInnerHTML`), timestamps, voice input (Web Speech API),
  text-to-speech output, and photo upload for the Clinical agent. A
  **multi-agent status board** shows the Orchestrator pulsing while it works,
  then lights up each agent that actually contributed with a green checkmark.
- **Specialized Care** — a directory of six condition-specific modules, each
  with its own *real* interactive tools (not just a link to chat):
  - 🥽 **Rehabilitation** → the full VR Rehab page (below).
  - 🧠 **Memory Care** → a real memory-matching card game, a routine-reminder
    list, and a shortcut to the Caregiver Portal.
  - ❤️ **Chronic Disease** → blood-glucose and blood-pressure loggers (write
    real entries via the API, visible on the dashboard/Analytics), and a
    shortcut to Analytics.
  - 🫁 **Respiratory** → a guided **4-7-8 breathing exercise** with a live
    countdown and an expanding/contracting circle synced to inhale/hold/
    exhale (4 cycles, ~76 seconds total, verified with a state-machine
    simulation), a trigger logger (dust/smoke/pollen/etc. + note), and inhaler
    reminders.
  - 🧒 **Pediatric** → a vaccination-schedule checklist, a growth chart
    (height/weight over time), and a development-milestones checklist.
  - 🤰 **Maternity** → a pregnancy week timeline (1–40) with trimester tips, a
    shortcut to Appointments, and a delivery-preparation checklist.
  - Checklists/reminders/growth entries persist in the browser, scoped per
    logged-in account (so switching demo users doesn't mix data).
- **🥽 VR Rehabilitation** — a futuristic control-center hero, an animated
  **holographic SVG skeleton** whose active limb bends/rotates smoothly
  through each rep (knee flexion, shoulder raise, ankle circles, grip
  strength, or a reach-to-target for balance work), a live session timer,
  estimated calories, mobility %, achievement badges (unlocked from real
  session/level/point thresholds), a confetti completion animation, and
  gamified points/levels that persist across sessions.
- **Accessibility settings** (own page, plus quick toggles everywhere):
  - Large text / high-contrast display modes.
  - Text-to-speech for AI replies + a standalone TTS tester.
  - Speech-to-text dictation for chat.
  - **👁️ Face Control** — for users with limited hand/arm mobility. Uses
    **MediaPipe Tasks Vision** (WASM, 100% client-side — the camera feed never
    leaves the device) to track head position and drive an on-screen cursor;
    a deliberate blink taps whatever is under it. Includes a live camera
    preview, a blink meter, and sensitivity sliders.
  - **📢 Screen Reader mode** — for blind/low-vision users. Announces each
    page on navigation, reads the accessible name of any button/link/field on
    keyboard focus (Tab) or hover, and a "Read page" button reads the whole
    page on demand. Works alongside the device's built-in screen reader.

### Caregiver portal
- Connect to a patient by ID and grant/adjust access scopes.
- Patient hero card, adherence/missed-dose/appointment stat cards.
- A real **appointment mini-calendar** highlighting the patient's actual
  scheduled visit dates.
- A patient-location placeholder (explicitly not implemented — no fake GPS).
- Recent symptoms list, a shared daily-routine reminder tracker, and a safety
  alerts feed (fed by the same Safety-agent emergency notifications).

### Provider portal
- Sortable patient table (click a row for an AI pre-visit summary).
- Recharts bar chart of adherence-by-patient and a pie chart of population
  risk distribution.
- **Appointment queue** — upcoming visits across all patients in the next 14
  days (dedicated backend endpoint).
- Private **clinical notes** per patient (persisted in the browser).
- High-risk patient alert list (adherence < 70%).

### Platform-wide
- **Dark mode / light mode**, persisted, respects OS preference by default.
- Collapsible, animated sidebar with a notification badge and profile card.
- Topbar with cross-page quick-search, real per-role notifications (derived
  from actual backend data — not fabricated counts), a dark-mode toggle, an
  "Ask AI" shortcut, and language-selector / Google-login / Face-ID UI
  elements that are **clearly labeled placeholders** (no i18n/OAuth backend
  exists yet — nothing here fakes functionality).
- Toast notification system for booking/cancelling/logging actions.
- Skeleton loading states, a 404 page, and an offline banner
  (`navigator.onLine`).
- Lazy-loaded routes (Analytics, Rehab, care modules, Caregiver/Provider
  dashboards) — Recharts (~340KB) only downloads when a chart page is
  actually opened.

---

## 3. Architecture & project layout

```
backend/
  main.py            FastAPI app + router registration, startup auto-seed
  config.py          Settings (.env) — CORS, SINGLE_CALL_MODE, etc.
  database.py        SQLAlchemy engine/session
  models.py          Users, meds, appointments, symptoms, rehab sessions, messages, care links
  schemas.py         Pydantic request/response models
  ai/
    gemini_client.py   generate / generate_json / analyze_image (multimodal)
    prompts.py         System prompts incl. safety & vision guardrails
    memory.py          Conversation history helpers
  agents/             orchestrator + safety + vision + 6 specialists
  services/           medication / appointment / patient / notification / rehab logic
  api/                chat (text + image), patient, caregiver, doctor, appointment, analytics, rehab, care
  seed.py             Demo patient + caregiver + provider loader
  data/               sample_patients.json

frontend/
  src/
    pages/            Login, Register, Home, Chat, PatientDashboard, Appointments,
                       Medications, Analytics, SpecializedCare, CareModule, Rehab,
                       CaregiverDashboard, DoctorDashboard, Accessibility, NotFound
    components/        Layout, Sidebar, TopBar, AccessibilityBar, FaceControl,
                       SpeechAnnouncer, RehabSkeleton, BreathingExercise, MemoryGame,
                       CareTools (vitals/checklist/growth/timeline/reminder),
                       Modal, Skeleton, ProgressRing, AnimatedCounter,
                       AgentStatusBoard, Markdown, Table, MiniCalendar, OfflineNotice, ui
    context/           AuthContext, AccessibilityContext, ThemeContext, ToastContext
    hooks/             useVoice, useFaceControl, useLocalStorage, useNotifications
    api/client.js      Central fetch wrapper (incl. multipart image upload)
    nav.js             Single source of truth for role-based navigation

render.yaml                        Render blueprint (backend deploy)
.github/workflows/deploy-pages.yml GitHub Actions → gh-pages → GitHub Pages
```

### Design system

- **Palette:** primary `#2563EB`, secondary `#14B8A6`, accent `#06B6D4`,
  success `#22C55E`, warning `#F59E0B`, danger `#EF4444`, background
  `#F8FAFC` — implemented as CSS custom properties (`theme.css`) with a full
  dark-mode variant swapped via `[data-theme]`.
- **Typography:** Inter (body) + Lexend (display/headings).
- **Motion:** Framer Motion throughout — animated route transitions, card
  hover-lift, animated counters, progress rings, confetti bursts, staggered
  list entrances, the multi-agent status board.
- **Charts:** Recharts (area, bar, pie) plus a hand-built animated
  `ProgressRing` for circular progress.

---

## 4. Setup (local)

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

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173  (proxies /api -> :8000)
```

Run the backend alongside it.

---

## 5. Route map

| Route | Role | What it does |
|-------|------|--------------|
| `/login`, `/register` | anyone | Auth |
| `/` | all | Home — patients see live stats; caregivers/providers redirect to their portal |
| `/chat` | patient | Multi-agent AI chat — agent status board, markdown, voice, photo upload |
| `/dashboard` | patient | Meds, appointments, symptoms, adherence |
| `/appointments` | patient | Book / cancel appointments |
| `/medications` | patient | Add meds, log doses taken/missed |
| `/analytics` | patient | Adherence + pain-trend charts (lazy-loaded) |
| `/care` | all | Specialized care modules directory (lazy-loaded) |
| `/care/rehabilitation` | patient | 🥽 VR physiotherapy (lazy-loaded) |
| `/care/:module` | all | Memory / Chronic / Respiratory / Pediatric / Maternity (lazy-loaded) |
| `/caregiver` | caregiver | Permission-gated patient overview + alerts (lazy-loaded) |
| `/provider` | provider | Patient table + AI summaries + charts + queue (lazy-loaded) |
| `/accessibility` | all | Face control, screen reader, voice, large text, high contrast |
| `*` (unmatched) | all | 404 page inside the shell (unauthenticated visitors are redirected to login) |

---

## 6. API reference

```bash
# Chat (text)
curl -s localhost:8000/chat -H 'content-type: application/json' \
  -d '{"patient_id":1,"message":"What does ibuprofen do and can you book me a checkup?"}'

# Chat with an image attached
curl -s -F "patient_id=1" -F "message=Is this concerning?" -F "image=@photo.jpg;type=image/jpeg" \
  localhost:8000/chat/image

# Patient dashboard
curl -s localhost:8000/patients/1/dashboard

# Provider pre-visit AI summary
curl -s localhost:8000/providers/patients/1/summary

# VR rehab progress
curl -s localhost:8000/rehab/patients/1/progress
```

| Method | Path | Purpose |
|-------|------|---------|
| POST | `/chat` | Talk to the multi-agent system |
| POST | `/chat/image` | Upload a photo (rash, wound, medication…) for the Clinical agent to review |
| POST | `/patients/register`, `/patients/login` | Auth |
| GET  | `/patients/{id}` | Patient profile |
| GET  | `/patients/{id}/dashboard` | Meds, appointments, symptoms, adherence |
| POST | `/patients/symptoms` | Log a symptom |
| GET  | `/patients/{id}/medications`, POST `/medications`, POST `/medications/log` | List / add / log a dose |
| GET  | `/patients/{id}/appointments`, POST `/appointments`, DELETE `/appointments/{id}` | List / book / cancel |
| POST | `/caregivers/link` | Grant a caregiver scoped access |
| GET  | `/caregivers/{cid}/patients/{pid}/overview` | Permission-gated view |
| GET  | `/caregivers/{cid}/notifications` | Safety alerts for a caregiver |
| GET  | `/providers/patients` | All patients (provider view) |
| GET  | `/providers/patients/{id}/summary` | AI pre-visit summary |
| GET  | `/providers/appointments/queue` | Upcoming appointments across all patients |
| GET  | `/analytics/patients/{id}`, `/analytics/population` | Patient / population insights |
| GET  | `/rehab/exercises`, POST `/rehab/sessions`, GET `/rehab/patients/{id}/progress` | VR exercise catalog / log a session / points & level |
| GET  | `/care/modules` | Specialized care module metadata |
| GET  | `/health` | Liveness + whether Gemini is online |

---

## 7. Deploy (GitHub Pages + Render)

GitHub Pages hosts static files only, so the React frontend goes on Pages and
the Python backend goes on Render (free). This repo is already wired for both.

**1. Backend → Render**
1. Push this repo to GitHub.
2. On [render.com](https://render.com): **New + → Blueprint**, connect this
   repo. Render reads `render.yaml` and creates the `sanadi-ai-backend` web
   service.
3. In the service's **Environment** tab, set `GEMINI_API_KEY` to your key.
4. Deploy. Copy the service URL, e.g. `https://sanadi-ai-backend.onrender.com`.

**2. Frontend → GitHub Pages**
1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Repo **Settings → Secrets and variables → Actions → Variables → New
   variable**: name `VITE_API_URL`, value = your Render URL (no trailing
   slash).
3. Push to `main` (or re-run the **Deploy frontend to GitHub Pages** workflow
   from the Actions tab). It builds `frontend/` and publishes to the
   `gh-pages` branch, which GitHub Pages serves.
4. Your site: `https://<username>.github.io/<repo>/`.

The Vite base path is `/Sanadi-AI/` and routing uses `HashRouter`, so deep
links and refreshes work on Pages with no server-side routing. If you rename
the repo, update `base` in `frontend/vite.config.js` to match.

> This project deploys via the `gh-pages` branch method
> (`peaceiris/actions-gh-pages`), not the native `actions/deploy-pages`,
> because the latter was unreliable ("Deployment cancelled") right after
> Pages was first enabled via API on this repo.

---

## 8. Notes & known limitations

- Auth issues JWTs but routes aren't yet protected by a dependency — add a
  `require_user` dependency before handling real patient data in production.
- `bcrypt` is pinned to 4.2.1 because passlib 1.7.4 breaks on bcrypt 5.x.
- Voice and face-control features use browser APIs (Web Speech API, MediaPipe
  WASM) — best in Chrome/Edge/Safari with a webcam and microphone.
- **Free Gemini tier = 5 requests/min.** `SINGLE_CALL_MODE=true` (default)
  collapses the pipeline into one Gemini call per message so the free tier
  works; set it to `false` for the full fan-out pipeline on a paid key. The
  emergency safety net runs offline (zero API calls) regardless.
- The DB is SQLite and **ephemeral on Render** — it resets and re-seeds on
  every redeploy. Swap in Postgres for persistence.
- Several dashboard tiles are intentionally clearly-labeled placeholders or
  demo data, not fake functionality: the weather widget, Google login, Face
  ID, the language selector, and heart-rate/sleep/steps/water/calories
  (deterministic per-day values — there's no wearable/device integration).
- The `vr/` Unity module from the original concept doc is a possible future
  native companion to the in-browser VR rehab experience, which today is a
  fully interactive (non-Unity) web simulation with an animated SVG skeleton,
  AI-guided rep tracking, and gamified points/levels.

## Security

Never hardcode or share API keys. Keep them in `.env` (git-ignored) locally
and in the host's environment settings (Render dashboard) in production. If a
key is ever exposed, rotate it immediately in Google AI Studio.
