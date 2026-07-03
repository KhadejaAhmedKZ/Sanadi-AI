# Sanadi AI — UML Design Documentation

UML views of the system: the use case model and the sequence diagrams for the
four workflows that define the product. All diagrams are Mermaid — GitHub
renders them natively in this file.

---

## 1. Use case diagram

Three primary actors (Patient, Primary Carer, Provider), one secondary actor
(Google Gemini). The Safety Screen is `«include»`-ed into every patient chat;
photo analysis `«extend»`s the chat.

```mermaid
flowchart LR
    P(["🧑 Patient"])
    C(["👨‍👩‍👧 Primary Carer"])
    D(["👨‍⚕️ Provider"])
    G(["🤖 Gemini AI<br/>(secondary actor)"])

    subgraph S["Sanadi AI Platform"]
        direction LR
        subgraph AUTH["Authentication"]
            UC0([Sign in — UAE PASS*/email])
            UC0b([Register with role])
        end
        subgraph PAT["Patient care"]
            UC1([Chat with AI companion])
            UC1b([Attach photo for analysis])
            UC1c([Safety / emergency screen])
            UC2([Book / cancel appointment])
            UC3([Log symptoms & pain])
            UC4([Manage medications & doses])
            UC5([Complete VR rehab session])
            UC6([Use care-module tools])
            UC7([Enable accessibility modes:<br/>face control, screen reader, TTS])
        end
        subgraph CG["Primary care support"]
            UC8([Link to patient with<br/>permission scopes])
            UC9([View scoped patient overview])
            UC10([Receive live safety alerts])
            UC11([Request urgent review])
            UC12([Read AI condition guide])
            UC13([Ask care-support AI])
        end
        subgraph PR["Clinical work"]
            UC14([View risk-ranked panel])
            UC15([Review AI pre-visit summary])
            UC16([Analyze case insights<br/>from panel outcomes])
            UC17([View pain / adherence trends])
            UC18([Manage escalations:<br/>acknowledge / resolve])
            UC19([Dictate clinical notes])
            UC20([Ask clinical copilot])
        end
    end

    P --- UC0 & UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7
    C --- UC0 & UC8 & UC9 & UC10 & UC11 & UC12 & UC13
    D --- UC0 & UC14 & UC15 & UC16 & UC17 & UC18 & UC19 & UC20

    UC1 -. «include» .-> UC1c
    UC1b -. «extend» .-> UC1
    UC1 -. «include» .-> UC2
    UC1 -. «include» .-> UC3
    UC1c -. triggers .-> UC10
    UC11 -. feeds .-> UC18
    UC18 -. notifies .-> UC10

    UC1 & UC1b & UC12 & UC13 & UC15 & UC16 & UC20 -.-> G
```

\* UAE PASS is a simulated visual integration in the demo.

---

## 2. Sequence diagram — AI chat with real actions (single-call orchestration)

The signature flow: one message produces a reply **and** real database
side-effects, within one Gemini call (free-tier friendly).

```mermaid
sequenceDiagram
    autonumber
    actor Pt as Patient
    participant FE as React App
    participant API as FastAPI /chat
    participant SN as Safety Net (offline keywords)
    participant GM as Gemini (1 call)
    participant DB as SQLite

    Pt->>FE: "I have knee pain, book me a checkup"
    FE->>API: POST /chat {patient_id, message}
    API->>SN: screen(message)
    SN-->>API: not an emergency
    API->>GM: combined prompt (safety + routing + reply + actions)
    GM-->>API: reply + agents + {book_appointment, symptom}
    API->>DB: INSERT appointment (Cardiology, Mon 10:00)
    API->>DB: INSERT symptom log (knee pain, clamped 0-10)
    API->>DB: save conversation turn
    API-->>FE: {reply, agents_used, emergency:false}
    FE-->>Pt: bubble + agent badges (+ optional TTS)
```

---

## 3. Sequence diagram — emergency safety net → live Primary Carer alert

Zero AI calls on the critical path: the keyword net works even if Gemini is
down or rate-limited. The Primary Carer portal polls every 20 s.

```mermaid
sequenceDiagram
    autonumber
    actor Pt as Patient
    participant FE as React App
    participant API as FastAPI /chat
    participant SN as Safety Net
    participant DB as SQLite
    participant CFE as Primary Carer Portal
    actor Cg as Primary Carer

    Pt->>FE: "I have severe chest pain"
    FE->>API: POST /chat
    API->>SN: screen(message)
    SN-->>API: 🚨 EMERGENCY (no AI call)
    API->>DB: notify each linked Primary Carer (safety scope)
    API-->>FE: emergency guidance (call local emergency number)
    FE-->>Pt: 🚨 emergency reply bubble

    loop every 20 s
        CFE->>API: GET /caregivers/{id}/notifications
    end
    API-->>CFE: urgent notification
    CFE-->>Cg: 🚨 red banner + toast + "Request urgent review" button
```

---

## 4. Sequence diagram — connected-care escalation loop

One event travels through all three roles and closes the loop.

```mermaid
sequenceDiagram
    autonumber
    actor Cg as Primary Carer
    participant CFE as Primary Carer Portal
    participant API as FastAPI
    participant DB as SQLite
    participant RS as Risk Service
    participant PFE as Provider Portal
    actor Dr as Provider

    Cg->>CFE: click 🚑 "Request urgent review" + reason
    CFE->>API: POST /caregivers/escalations
    API->>API: verify care link (403 if none)
    API->>DB: upsert OPEN escalation + notify providers
    API-->>CFE: 201 created

    loop every 20 s
        PFE->>API: GET /providers/escalations + /providers/patients
    end
    API->>RS: compute_risk(patient) — open escalation ⇒ +30
    RS-->>API: risk ↑ ("Primary Carer requested urgent review")
    API-->>PFE: escalation + re-ranked patient list
    PFE-->>Dr: 🚨 red priority card + toast

    Dr->>PFE: Acknowledge → Mark reviewed
    PFE->>API: POST /providers/escalations/{id}/status
    API->>DB: status=resolved + notify Primary Carer
    API-->>PFE: 200

    CFE->>API: poll notifications
    API-->>CFE: "Dr. Hassan has reviewed your request"
    CFE-->>Cg: ✅ loop closed
```

---

## 5. Sequence diagram — provider opens a patient (triage → AI briefing)

```mermaid
sequenceDiagram
    autonumber
    actor Dr as Provider
    participant PFE as Provider Portal
    participant API as FastAPI
    participant RS as Risk Service (rules, no AI)
    participant GM as Gemini
    participant DB as SQLite

    Dr->>PFE: open portal
    PFE->>API: GET /providers/patients
    API->>RS: compute_risk(each patient)
    RS->>DB: adherence, pain trajectory, escalations, rehab recency
    RS-->>API: score 0-100 + reasons
    API-->>PFE: roster ranked highest-risk first

    Dr->>PFE: select "Ahmed Ali (risk 80)"
    par AI summary
        PFE->>API: GET /providers/patients/2/summary
        API->>GM: pre-visit briefing prompt (real data)
        GM-->>API: concerns, treatment, discussion points
        API-->>PFE: summary
    and Trends
        PFE->>API: GET /analytics/patients/2
        API-->>PFE: dated pain series + dose series
    end
    PFE-->>Dr: 🧠 briefing + 📈 charts

    opt Case insights (on demand)
        Dr->>PFE: "Analyze similar cases"
        PFE->>API: GET /providers/patients/2/case-insights
        API->>DB: anonymized outcome snapshots (Case A, B…)
        API->>GM: what worked / what preceded setbacks
        GM-->>API: grounded briefing
        API-->>PFE: insights + cases_analyzed
    end
```

---

## 6. Context diagram (level 0)

The system boundary with every external entity and the data that crosses it.
Face control and voice run **on-device** — camera/microphone streams never
leave the browser.

```mermaid
flowchart LR
    P(["🧑 Patient"])
    C(["👨‍👩‍👧 Primary Carer"])
    D(["👨‍⚕️ Provider"])
    G[["🤖 Google Gemini API"]]
    U[["🇦🇪 UAE PASS<br/>(simulated)"]]
    B[["🎥 Browser device APIs<br/>MediaPipe · Web Speech"]]

    S{{"**Sanadi AI Platform**<br/>React SPA · FastAPI · SQLite<br/>GitHub Pages + Render"}}

    P -- "messages · photos · bookings · dose logs" --> S
    S -- "replies · reminders · rehab levels · alerts" --> P
    C -- "scope grants · urgent review requests" --> S
    S -- "scoped overview · live safety alerts · AI guide" --> C
    D -- "acknowledge/resolve · clinical notes" --> S
    S -- "risk-ranked panel · briefings · escalation queue" --> D
    S -- "one prompt per message" --> G
    G -- "reply + structured actions (sanitized)" --> S
    U -. "sign-in identity (visual demo only)" .-> S
    B -. "head/blink cursor · dictation (on-device)" .-> S
```

---

## 7. Finite state machines

### 7.1 Escalation lifecycle

The core of the connected-care loop — mirrors the `EscalationStatus` enum.
An open escalation adds **+30** to the patient's risk score; every transition
notifies the Primary Carer back.

```mermaid
stateDiagram-v2
    [*] --> Open : caregiver raises<br/>(care link verified, 403 otherwise)
    Open --> Open : re-raise — reason updated,<br/>never duplicated
    Open --> Acknowledged : provider acknowledges<br/>→ caregiver notified "reviewing"
    Open --> Resolved : provider resolves directly
    Acknowledged --> Resolved : provider marks reviewed
    Resolved --> [*]

    note right of Open
        notify all providers
        patient risk +30
    end note
    note right of Resolved
        caregiver notified ✓
        risk contribution cleared
    end note
```

### 7.2 Patient chat message lifecycle

Every message walks this machine; the emergency branch never touches the AI.

```mermaid
stateDiagram-v2
    [*] --> Received
    Received --> EmergencyReply : offline keyword hit<br/>(0 API calls)
    EmergencyReply --> CaregiversAlerted : notify "safety" scope
    CaregiversAlerted --> [*]

    Received --> SingleGeminiCall : screened safe
    SingleGeminiCall --> FallbackReply : API error / rate limit
    FallbackReply --> [*]
    SingleGeminiCall --> ActionsApplied : structured actions present
    SingleGeminiCall --> Replied : reply only
    ActionsApplied --> Replied : appointment booked /<br/>symptom logged (clamped 0-10)
    Replied --> [*] : saved to conversation memory
```

---

*Also documented in this repo:* [README](../README.md) — full feature list,
API reference, architecture layout, and deployment topology.
