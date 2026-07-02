// Deterministic "demo wellness" numbers (heart rate, sleep, steps, water,
// calories) — there's no wearable/device integration in this app, so these
// are stable, per-day, per-patient placeholders rather than random noise on
// every render. Real clinical data (adherence, appointments, vitals a
// patient explicitly logs) always takes priority elsewhere in the UI.

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function dailyWellness(patientId) {
  const day = new Date().toISOString().slice(0, 10);
  const seed = hashString(`${patientId}-${day}`);
  const pick = (offset, min, max) => Math.floor(seededRandom(seed + offset) * (max - min + 1)) + min;
  return {
    heartRate: pick(1, 62, 78),
    sleepHours: pick(2, 62, 82) / 10,
    steps: pick(3, 3200, 9800),
    water: pick(4, 4, 8),
    calories: pick(5, 1500, 2200),
  };
}

// Pull the most recent value a patient logged for a given vital prefix
// (written by the Chronic Disease care module's loggers, e.g. "Blood glucose: ").
export function extractVital(symptoms, prefix) {
  const match = symptoms?.find((s) => s.description?.startsWith(prefix));
  return match ? match.description.slice(prefix.length).trim() : null;
}

export function computeHealthScore({ adherenceRate, avgPain, rehabLevel }) {
  const adherenceComponent = (adherenceRate ?? 1) * 55;
  const painComponent = avgPain != null ? ((10 - avgPain) / 10) * 30 : 30;
  const rehabComponent = rehabLevel ? Math.min(rehabLevel * 3, 15) : 8;
  return Math.max(0, Math.min(100, Math.round(adherenceComponent + painComponent + rehabComponent)));
}
