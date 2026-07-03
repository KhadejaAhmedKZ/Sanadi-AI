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
