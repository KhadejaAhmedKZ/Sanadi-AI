# Sanadi AI (سندي) — Multi-Agent Healthcare Companion

> Your AI-powered healthcare support, always by your side.

Sanadi AI is a full-stack, **deployed** healthcare platform: a FastAPI + Gemini
multi-agent backend, and a premium, animated React frontend with role-based
portals for patients, caregivers, and providers. **Every role gets its own
AI** — a multi-agent companion for patients (with photo analysis), a
care-support assistant for family caregivers, and a clinical copilot for
providers — plus a live **connected-care escalation loop** (patient emergency
→ caregiver alert → provider triage → caregiver notified back), AI risk
triage, outcome-based case insights, an interactive VR rehabilitation module,
six specialized care modules, a full hands-free/screen-reader accessibility
suite, dark mode, and live charts.

## 🌐 Live demo

| | |
|---|---|
| **App** | https://khadejaahmedkz.github.io/Sanadi-AI/ |
| **API** | https://sanadi-ai-backend.onrender.com |

Demo accounts (password `demo1234` for all):

| Role | Email | Notes |
|------|-------|-------|
| 👤 Patient | `sara@example.com` | Recovering well — improving pain trend, high adherence |
| 👤 Patient | `ahmed@example.com` | The **high-risk demo**: rising pain, 43% adherence, flagged by triage |
| 👤 Patient | `fatima@example.com` | Fully recovered — the success case the AI learns from |
| 👨‍👩‍👧 Caregiver | `care@example.com` | Pre-linked to Sara with all permission scopes |
| 👨‍⚕️ Provider | `doctor@example.com` | Sees the whole panel, risk-ranked |

The login page also has **one-click demo chips** — tap "Continue as
Patient/Caregiver/Provider" and you're in, no typing. Every patient ships
with **three weeks of seeded history** (symptoms, dose logs, rehab sessions)
so trends, risk scores, and case insights show real trajectories out of the
box.

> The backend is on Render's free tier and sleeps when idle — the first request
> after a nap takes ~30s, then it's fast. AI chat is limited to ~5
> messages/minute (Gemini free tier); everything else is unlimited. The
> database is ephemeral on Render and re-seeds demo data on every redeploy.

---

## 🏆 Judging criteria

*Reviewed by the judging panel between 13–19 July 2026.*

### Problem Fit — 20%

Healthcare today is fragmented across separate tools for medical questions,
appointments, medication tracking, rehabilitation, and caregiver coordination
— and patients with mobility, vision, or cognitive limitations are often
locked out of all of them. Sanadi AI addresses this directly:

- **One coordinated care team, not one chatbot.** The Orchestrator routes
  each message to the right specialist(s) — Clinical, Operations, Engagement,
  Analytics, Accessibility, Rehabilitation — mirroring how a real care team
  divides work, instead of a single model trying to do everything.
- **Acts, not just answers.** A message like *"I have knee pain, can you book
  me a checkup?"* results in a real appointment row in the database and a
  real symptom log, not just a conversational reply.
- **Built for the patients traditional apps exclude.** Hands-free head/blink
  control for limited hand mobility, a full screen-reader mode for blind
  users, and gamified VR physiotherapy for rehab adherence — accessibility
  was a first-class design requirement, not an afterthought.
- **Serves the whole care circle.** Distinct, permission-scoped portals for
  patients, caregivers, and providers reflect how care actually happens —
  caregivers only see what a patient explicitly grants, and providers get
  AI-generated pre-visit summaries that save real clinical time.
- **A closed escalation loop, not three silos.** A worrying event travels
  through every role: the patient's message triggers a caregiver safety
  alert (live, within ~20s), the caregiver requests an urgent review with one
  button, it lands flagged at the top of the provider's queue and bumps the
  patient's risk score, and resolving it notifies the caregiver back.
- **An AI for every seat at the table.** Patients get the multi-agent
  companion; caregivers get a support assistant that knows (only) their
  permitted patient data and answers "is this normal?"; providers get a
  clinical copilot over the live panel that answers "who needs attention
  first?".

### Technical Execution — 25%

- **Actually deployed and working**, not a local demo: FastAPI backend on
  Render, React frontend on GitHub Pages, CI/CD via GitHub Actions, verified
  end-to-end against the live stack (not just localhost) at every stage of
  development.
- **Engineering under real constraints.** The free Gemini tier caps requests
  at 5/minute — the naive multi-agent fan-out design would have exhausted
  that in a single message. `SINGLE_CALL_MODE` collapses safety screening +
  agent routing + reply + structured actions into one Gemini call, with the
  full fan-out pipeline preserved behind a flag for higher-quota deployments.
- **Multimodal AI.** Patients can attach a photo (rash, wound, medication
  label) and get a real Gemini vision analysis, gated by the same safety
  pipeline as text.
- **Real data model**, not mocked JSON: SQLAlchemy models for users,
  medications + dose logs, appointments, symptoms, rehab sessions, care
  links, escalations, and conversation history, with adherence/analytics
  computed from actual logged data.
- **Hybrid AI + rules where each is strongest.** Risk triage is deterministic
  and free (rule-based scoring over adherence, pain trajectory, escalations,
  rehab drop-off — recomputed on every load), while the LLM handles what
  rules can't: explanations, case-outcome insights, and conversation. AI
  outputs that feed the database (extracted pain levels, agent lists) are
  clamped and sanitized — model output is never trusted blindly.
- **Verified, not assumed.** The rep-matching logic for the memory game, the
  breathing-exercise state machine, and the emergency safety net were each
  checked with scripted simulations before shipping; every new feature was
  tested end-to-end through the real dev proxy or the live deployment before
  being called done.
- **Performance-conscious frontend**: route-based code-splitting cut the main
  JS bundle from 894KB to ~500KB, with the charting library only downloading
  when a chart page is actually opened.

### Design & Usability — 20%

- A complete design system (light **and** dark mode, a defined color/type
  scale, Framer Motion micro-interactions) built for a clinical audience —
  calm, high-contrast-friendly, no visual noise.
- **Role-aware UI**: a patient, caregiver, and provider each see a
  navigation and dashboard built for their job, not a generic app shell with
  everything visible to everyone.
- **Interactive, not static, care modules** — a real memory-matching game,
  vitals loggers, a guided breathing timer with a live countdown, checklists,
  and a growth chart — because a chronic-care or memory-care patient needs
  tools they can *use*, not another wall of text.
- **Accessible by construction**: large-text and high-contrast modes, full
  keyboard/screen-reader support, and hands-free face control were tested as
  first-class interaction paths, not bolted on — then the whole UI was
  audited against a 99-point UX/accessibility checklist (visible focus
  rings, reduced-motion support, skip link, 44px touch targets, WCAG
  contrast in both themes, vector chrome iconography) and every failure was
  fixed.
- Toasts, skeleton loading states, empty states, and a proper 404/offline
  experience — the small details that separate a usable product from a demo.

### Responsible AI & Safety — 20%

- **Safety runs before anything else, and works even if the AI doesn't.** An
  offline keyword net catches emergency phrases (chest pain, severe bleeding,
  suicidal ideation, and more) with **zero API calls**, so a Gemini outage or
  rate limit never leaves a real emergency unhandled — and it automatically
  notifies the patient's linked caregiver.
- **The vision agent is explicitly constrained**: it describes what it sees,
  never issues a definitive diagnosis, flags anything that looks like it
  needs urgent care, and always closes with a reminder to see a professional
  — enforced in the system prompt, not left to chance.
- **Privacy by design**: caregivers only ever see the data scopes a patient
  explicitly grants (`medications`, `appointments`, `symptoms`, `safety`) —
  and the caregiver's AI assistant is grounded in exactly that same scoped
  context, so the AI cannot leak what the portal wouldn't show. Case
  insights compare patients as anonymized snapshots ("Case A/B"), never by
  name;
  images are validated for type/size before ever reaching the model; API
  keys live only in environment variables and were never committed to the
  repository.
- **Honest about what's real.** Every demo/placeholder element in the product
  — the weather widget, Google/Face-ID login, a handful of wellness tiles
  with no wearable integration — is explicitly labeled as such in the UI and
  in this README, so nothing in the product misrepresents itself as clinical
  data or a real integration.
- **Edge cases considered directly**: unsupported file types and oversized
  uploads are rejected before hitting the model; unknown patient IDs return
  clean 404s; a fully offline patient device still gets a functioning safety
  net and an explicit "you're offline" notice instead of silent failure.

### Innovation — 15%

- **A genuine multi-agent architecture**, not a single system prompt
  dressed up with a chatbot UI — each specialist has its own guardrails,
  responsibilities, and (optionally) its own model call.
- **MediaPipe-powered hands-free control** repurposed for a healthcare
  accessibility use case that most hackathon health apps skip entirely —
  head-tracking cursor control plus blink-to-click, running fully
  client-side.
- **A rate-limit-aware orchestration design** that turns a real infrastructure
  constraint (5 req/min on a free AI tier) into an architectural decision
  rather than a blocker — most prototypes would simply break under it.
- **Gamified VR-style rehabilitation** with an animated, per-exercise
  holographic skeleton synced to live rep tracking, points, levels, and
  achievements — designed to solve the actual clinical problem of poor
  rehab-exercise adherence, not just for visual flair.
- **Case Insights: the AI learns from the panel's own outcomes.** For any
  patient, Gemini compares anonymized trajectories of previous cases (who
  improved, who worsened, and what preceded each) and briefs the provider on
  what worked, what preceded setbacks, and how to keep *this* patient off
  the failure path — grounded in the clinic's real data, not generic advice.

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
- **Role assistants.** Beyond the patient orchestrator, `/chat/assistant`
  serves a **caregiver companion** (grounded in the linked patient's
  permission-scoped data, with its own offline emergency net) and a
  **provider clinical copilot** (grounded in a live panel snapshot:
  adherence, risk scores + reasons, symptoms, open escalations). Both keep
  thread context from the last few turns and enforce a role check (403 on
  mismatch).

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

### Caregiver portal — "Family Care Hub"
- Connect to a patient by ID and grant/adjust access scopes (re-granting
  updates the existing link, never duplicates it).
- Patient hero card with a live status pulse, adherence/missed-dose/
  appointment stat cards.
- **Live safety alerts** — the portal polls every 20 seconds, so an
  emergency the patient reports in chat appears while you watch, with a
  toast for anything new. An urgent-alert banner surfaces the latest event.
- **🚑 Request urgent review** — one button sends an escalation straight to
  the top of every provider's queue (reason pre-filled from the alert). When
  the provider acknowledges or resolves it, the caregiver is notified back —
  the loop is closed, not fire-and-forget.
- **🧠 Understand tab** — an AI-written plain-language guide for worried
  family: which of the patient's current symptoms are *normal* for this
  stage, three facts about the condition, the red flags that genuinely
  warrant a call, and how to help today. Cached per patient per day.
- **💬 AI Assistant** — a care-support companion in the sidebar that answers
  free-form questions ("Is her pain normal?", "What do her meds do?", "How
  can I help today?") grounded strictly in the permission scopes granted.
  Emergency-sounding messages get instant offline call-for-help guidance.
- A real **appointment mini-calendar** highlighting the patient's actual
  scheduled visit dates.
- A patient-location placeholder (explicitly not implemented — no fake GPS).
- Recent symptoms list and a shared daily-routine reminder tracker (scoped
  per patient — switching patients never mixes data).

### Provider portal — clinical command center
- **AI risk triage** — the roster is auto-ranked by a 0–100 risk score
  computed from real data (low/slipping adherence, rising pain trajectory,
  high recent pain, open caregiver escalations, rehab drop-off), each row
  showing its top risk reason with the full explanation on hover. Rule-based
  and free, so it recomputes on every load.
- **🚨 Urgent reviews queue** — caregiver escalations pinned in red at the
  top of the rail with Acknowledge / Mark-reviewed actions (both notify the
  caregiver back). New escalations arrive live via 20-second polling with a
  toast. Clicking one jumps to that patient.
- **List-detail workspace**: click any patient for a five-tab detail pane —
  - **🧠 AI Summary** — Gemini pre-visit briefing (concerns, treatment,
    discussion points).
  - **📈 Trends** — pain-trajectory line chart and taken-vs-missed dose bars
    for the last 14 days, with screen-reader chart summaries.
  - **🔍 Case Insights** — the AI compares this patient against anonymized
    outcome snapshots of the rest of the panel: what worked in similar
    cases, what preceded setbacks, and three actions to keep this patient
    off the failure path.
  - **📝 Clinical Notes** — private per-patient notes with **🎙️ hands-free
    voice dictation** (Web Speech), persisted in the browser.
  - **📅 Schedule** — the patient's upcoming visits.
- **💬 Clinical Copilot** — a panel-wide AI assistant in the sidebar:
  "Who needs attention first today?", "Summarize Ahmed's trajectory",
  grounded in live adherence/risk/escalation data.
- Population view: KPI strip, adherence-by-patient bar chart, population
  risk pie, high-risk alert list, and a cross-patient **appointment queue**
  for the next 14 days.

### Platform-wide
- **Dark mode / light mode**, persisted, respects OS preference by default.
- **WCAG accessibility foundation** (audited against a 99-point UX guideline
  checklist): visible 3px keyboard focus rings on every interactive element,
  `prefers-reduced-motion` respected app-wide, a skip-to-content link,
  ≥44px touch targets, theme-aware badge contrast (≥4.5:1 in both modes),
  and screen-reader summaries on clinical charts.
- **Professional iconography**: all structural chrome (sidebar nav, brand,
  topbar controls) uses Lucide vector icons that recolor with the theme;
  emojis remain only in friendly content, by design.
- **Redesigned auth pages**: glassmorphism hero with a product vignette and
  trust stats, icon-adorned inputs, a segmented role picker on sign-up, and
  **one-click demo login chips** for each role.
- Collapsible, animated sidebar with a notification badge and profile card.
- Topbar with cross-page quick-search, real per-role notifications (derived
  from actual backend data — not fabricated counts), a dark-mode toggle, an
  "Ask AI" shortcut (works for every role), and a language-selector that is
  a **clearly labeled placeholder** (no i18n backend yet).
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
  models.py          Users, meds, appointments, symptoms, rehab sessions, messages, care links, escalations
  schemas.py         Pydantic request/response models
  ai/
    gemini_client.py   generate / generate_json / analyze_image (multimodal)
    prompts.py         System prompts incl. safety & vision guardrails
    memory.py          Conversation history helpers
  agents/             orchestrator + safety + vision + 6 specialists
  services/           medication / appointment / patient / notification / rehab / risk-triage / escalation logic
  api/                chat (text + image), patient, caregiver, doctor, appointment, analytics, rehab, care
  seed.py             Demo users + 3 weeks of backdated history (symptoms, doses, rehab)
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
- **Icons:** Lucide (vector, stroke-based) for all structural chrome —
  theme-colorable and consistent cross-platform.
- **Charts:** Recharts (area, bar, line, pie) plus a hand-built animated
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
| `/chat` | all | Role-specific AI: patients get the multi-agent companion (agent board, photo upload); caregivers a care-support assistant; providers a clinical copilot |
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
| POST | `/chat/assistant` | Role assistants: caregiver companion / provider copilot (role-checked) |
| POST | `/caregivers/link` | Grant a caregiver scoped access (upserts — one link per pair) |
| GET  | `/caregivers/{cid}/patients/{pid}/overview` | Permission-gated view |
| GET  | `/caregivers/{cid}/notifications` | Safety alerts for a caregiver |
| POST | `/caregivers/escalations` | Request an urgent provider review (requires care link) |
| GET  | `/caregivers/{cid}/patients/{pid}/education` | AI "what's normal + red flags" guide for family |
| GET  | `/providers/patients` | All patients, risk-scored + ranked with reasons |
| GET  | `/providers/patients/{id}/summary` | AI pre-visit summary |
| GET  | `/providers/patients/{id}/case-insights` | AI outcome comparison vs anonymized panel cases |
| GET  | `/providers/escalations` | Open/acknowledged urgent review requests |
| POST | `/providers/escalations/{id}/status` | Acknowledge/resolve (notifies the caregiver back) |
| GET  | `/providers/appointments/queue` | Upcoming appointments across all patients |
| GET  | `/analytics/patients/{id}`, `/analytics/population` | Patient insights (incl. dated pain + dose series for trend charts) / population |
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
  demo data, not fake functionality: the weather widget, the language
  selector, and heart-rate/sleep/steps/water/calories (deterministic per-day
  values — there's no wearable/device integration).
- The `vr/` Unity module from the original concept doc is a possible future
  native companion to the in-browser VR rehab experience, which today is a
  fully interactive (non-Unity) web simulation with an animated SVG skeleton,
  AI-guided rep tracking, and gamified points/levels.

## Security

Never hardcode or share API keys. Keep them in `.env` (git-ignored) locally
and in the host's environment settings (Render dashboard) in production. If a
key is ever exposed, rotate it immediately in Google AI Studio.
