// Learning Hub catalog — ALL course content is original demo material
// written for this prototype (no real CME programs or accreditations).

export const COURSES = [
  // ---------- Provider training ----------
  {
    id: "prov-diabetes",
    audience: "provider",
    icon: "🩺",
    title: "Advanced Diabetes Management",
    blurb: "Modern glycemic targets, adherence coaching, and escalation criteria.",
    duration: "45 min",
    certificate: true,
    lessons: [
      { title: "Reading the whole picture: HbA1c, CGM, and adherence data", body: "A single HbA1c hides variability. Combine lab trends with day-by-day dose logs to distinguish a control problem from an adherence problem — they need different conversations." },
      { title: "The adherence conversation that works", body: "Ask about barriers before results: cost, side effects, routine. Patients who miss doses usually have a reason; treating the reason beats repeating the instruction." },
      { title: "When to escalate therapy", body: "Persistent readings above target for 3+ months despite good adherence is a therapy problem. Review options systematically rather than adding urgency to the patient." },
      { title: "Using AI summaries responsibly", body: "AI pre-visit briefings save time but never replace review of source data. Verify every flagged value before acting — the model summarizes; you decide." },
    ],
  },
  {
    id: "prov-telehealth",
    audience: "provider",
    icon: "📹",
    title: "Telehealth Best Practices",
    blurb: "Running effective, safe, and warm video consultations.",
    duration: "30 min",
    certificate: true,
    lessons: [
      { title: "Setting up the visit", body: "Confirm identity, location, and a fallback phone number at the start of every video visit — connections drop, emergencies don't wait." },
      { title: "The remote examination", body: "You can see gait, breathing effort, home environment, and medication bottles on camera. Ask the patient to show, not just tell." },
      { title: "Knowing when video is not enough", body: "Chest pain, acute neurological signs, or anything requiring palpation ends the video visit with a clear in-person or emergency plan — stated twice, confirmed once." },
    ],
  },
  {
    id: "prov-ai",
    audience: "provider",
    icon: "🤖",
    title: "AI in Clinical Decision Support",
    blurb: "What AI triage can and cannot tell you — and how to stay in charge.",
    duration: "40 min",
    certificate: true,
    lessons: [
      { title: "Rule-based vs generative signals", body: "Risk scores computed from data (adherence, pain trajectories) are reproducible and auditable. Generative summaries are helpful but probabilistic — treat them as a colleague's draft, not a lab result." },
      { title: "Automation bias and how to resist it", body: "The most dangerous AI output is the plausible one. Make it a habit to check one source value per AI claim before acting on it." },
      { title: "Privacy boundaries", body: "AI systems should only see the minimum data needed for a task. Ask your tools: what leaves the device? What is retained? Who can retrieve it?" },
      { title: "Explaining AI to patients", body: "Patients trust AI more when its role is explicit: 'A system flagged your trend; I reviewed it.' Never let the AI be the invisible decision-maker." },
    ],
  },

  // ---------- Caregiver training ----------
  {
    id: "care-fundamentals",
    audience: "caregiver",
    icon: "🏠",
    title: "Safe Home Care Fundamentals",
    blurb: "The essentials of caring for a recovering family member at home.",
    duration: "35 min",
    certificate: true,
    lessons: [
      { title: "Preventing falls at home", body: "Most home injuries during recovery are falls: clear walking paths, night lights, non-slip mats, and keeping essentials within reach do more than constant supervision." },
      { title: "Recognizing genuine warning signs", body: "Learn the difference between expected discomfort and red flags: new confusion, chest pain, one-sided weakness, or breathing difficulty always mean call for help now." },
      { title: "Helping without taking over", body: "Recovery needs practice. Do things WITH the patient, not FOR them — independence is a clinical outcome, not just a preference." },
      { title: "Caring for the carer", body: "Burnout degrades care. Schedule real breaks, accept help, and treat your own sleep and health as part of the care plan." },
    ],
  },
  {
    id: "care-dementia",
    audience: "caregiver",
    icon: "🧠",
    title: "Dementia Care Essentials",
    blurb: "Communication, routines, and safety for memory-care families.",
    duration: "40 min",
    certificate: true,
    lessons: [
      { title: "Communicating past the memory gaps", body: "Short sentences, one question at a time, and joining their reality rather than correcting it reduce distress for everyone." },
      { title: "The power of routine", body: "Consistent meal, walk, and sleep times reduce confusion and agitation more reliably than any reminder app — the app supports the routine, not the reverse." },
      { title: "Wandering and safety", body: "Door alarms, ID bracelets, and a recent photo on hand are basic protections. Plan for wandering before it happens, not after." },
      { title: "Difficult moments", body: "Agitation usually has a trigger: pain, hunger, noise, or fear. Look for the unmet need before reaching for distraction." },
    ],
  },
  {
    id: "care-meds",
    audience: "caregiver",
    icon: "💊",
    title: "Medication Management at Home",
    blurb: "Safe routines for handling someone else's medications.",
    duration: "25 min",
    certificate: true,
    lessons: [
      { title: "The five rights, at home", body: "Right person, right medicine, right dose, right time, right way. A weekly pill organizer filled once, checked twice, prevents most errors." },
      { title: "Missed doses: what actually matters", body: "Never double a missed dose without checking. Log it honestly — a real record of missed doses helps the doctor far more than a perfect-looking one." },
      { title: "Storage and disposal", body: "Heat, humidity, and children's reach are the three storage risks. Expired medications go back to a pharmacy, not the bin." },
    ],
  },

  // ---------- Patient education ----------
  {
    id: "pat-diabetes",
    audience: "patient",
    icon: "🍎",
    title: "Understanding Your Diabetes",
    blurb: "What your numbers mean and what daily choices change them.",
    duration: "30 min",
    certificate: true,
    lessons: [
      { title: "What HbA1c actually measures", body: "It's your average blood sugar over ~3 months — a movie, not a photo. One bad day won't ruin it; consistent habits shape it." },
      { title: "Why doses matter even when you feel fine", body: "High blood sugar rarely hurts today — it damages quietly over years. The medicine protects the future you; feeling fine is the goal, not the signal to stop." },
      { title: "Food, movement, and numbers", body: "You don't need a perfect diet. Consistent meal times, more walking, and fewer sugary drinks move the numbers more than short-lived strict plans." },
      { title: "When to call the care team", body: "Repeated dizziness, blurry vision, or readings far outside your usual range are worth a message today — small questions prevent big problems." },
    ],
  },
  {
    id: "pat-knee",
    audience: "patient",
    icon: "🦵",
    title: "Knee Recovery, Week by Week",
    blurb: "What's normal, what's progress, and what needs a call.",
    duration: "25 min",
    certificate: true,
    lessons: [
      { title: "Why rehab hurts a little (and when it shouldn't)", body: "Mild ache during and after exercises is the tissue adapting — that's progress. Sharp pain, new swelling, or heat around the joint is not; those need a call." },
      { title: "Consistency beats intensity", body: "Ten minutes daily rebuilds strength faster than an hour once a week. Missing a day is fine; missing a week is a setback." },
      { title: "Measuring real progress", body: "Track what you can DO — stairs, walking distance, standing time — not just pain. Function often improves before pain fully fades." },
      { title: "Your VR rehab sessions", body: "The reps and pain levels you log feed your recovery chart. Honest logging (including bad days) helps your care team adjust the plan for you." },
    ],
  },
  {
    id: "pat-breathing",
    audience: "patient",
    icon: "🫁",
    title: "Breathing & Stress Basics",
    blurb: "Simple techniques that calm the body — and when they're not enough.",
    duration: "20 min",
    certificate: true,
    lessons: [
      { title: "Why slow breathing works", body: "Long, slow exhales activate the body's rest response — it's physiology, not a trick. The 4-7-8 pattern in your Respiratory module is one structured way to practice." },
      { title: "Making it a habit", body: "Two minutes at the same time daily (after brushing teeth, before sleep) builds the reflex, so it's available when you actually feel anxious." },
      { title: "Knowing the limits", body: "Breathing exercises help stress and mild breathlessness. Sudden severe shortness of breath, chest pain, or blue lips are emergencies — call for help, don't practice." },
    ],
  },
];

export const AUDIENCE_LABEL = {
  provider: { label: "For clinicians", color: "var(--gradient-warm)" },
  caregiver: { label: "For Primary Carers", color: "var(--gradient-secondary)" },
  patient: { label: "For patients", color: "var(--gradient-primary)" },
};
