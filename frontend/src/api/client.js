// Central API client for the Sanadi AI backend.
// Uses the Vite dev proxy (/api -> :8000) by default.

const BASE = import.meta.env.VITE_API_URL || "/api";

const NETWORK_ERROR_MSG =
  "Can't reach the server — it may be waking up (free hosting sleeps when idle). " +
  "Please wait ~30 seconds and try again.";

// Parse a response body defensively: hosts/proxies can return HTML error pages
// (e.g. a 502 while the backend wakes), which would crash JSON.parse with
// "Unexpected token '<'".
async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function errorFrom(res, data) {
  const message =
    data?.detail ||
    (res.status >= 500
      ? "The server hit a problem — please try again in a moment."
      : res.statusText || "Request failed");
  return new Error(typeof message === "string" ? message : JSON.stringify(message));
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(NETWORK_ERROR_MSG);
  }

  const data = await parseBody(res);
  if (!res.ok) throw errorFrom(res, data);
  return data;
}

export const api = {
  // Auth
  register: (payload) => request("/patients/register", { method: "POST", body: payload }),
  login: (payload) => request("/patients/login", { method: "POST", body: payload }),

  // Chat
  chat: (patient_id, message) =>
    request("/chat", { method: "POST", body: { patient_id, message } }),
  assistantChat: (payload) => request("/chat/assistant", { method: "POST", body: payload }),

  chatWithImage: async (patient_id, file, message) => {
    const form = new FormData();
    form.append("patient_id", patient_id);
    form.append("message", message || "");
    form.append("image", file);
    let res;
    try {
      res = await fetch(`${BASE}/chat/image`, { method: "POST", body: form });
    } catch {
      throw new Error(NETWORK_ERROR_MSG);
    }
    const data = await parseBody(res);
    if (!res.ok) throw errorFrom(res, data);
    return data;
  },

  // Patient
  profile: (id) => request(`/patients/${id}`),
  dashboard: (id) => request(`/patients/${id}/dashboard`),
  logSymptom: (payload) => request("/patients/symptoms", { method: "POST", body: payload }),

  // Medications
  medications: (id) => request(`/patients/${id}/medications`),
  addMedication: (payload) => request("/medications", { method: "POST", body: payload }),
  logDose: (medication_id, taken = true) =>
    request("/medications/log", { method: "POST", body: { medication_id, taken } }),

  // Appointments
  appointments: (id, upcoming = false) =>
    request(`/patients/${id}/appointments?upcoming=${upcoming}`),
  bookAppointment: (payload) => request("/appointments", { method: "POST", body: payload }),
  cancelAppointment: (id) => request(`/appointments/${id}`, { method: "DELETE" }),

  // Analytics
  patientAnalytics: (id) => request(`/analytics/patients/${id}`),
  population: () => request("/analytics/population"),

  // Providers
  allPatients: () => request("/providers/patients"),
  aiSummary: (id) => request(`/providers/patients/${id}/summary`),
  appointmentQueue: (days = 7) => request(`/providers/appointments/queue?days=${days}`),
  caseInsights: (id) => request(`/providers/patients/${id}/case-insights`),
  providerEscalations: () => request("/providers/escalations"),
  setEscalationStatus: (id, status, provider_id) =>
    request(`/providers/escalations/${id}/status`, { method: "POST", body: { status, provider_id } }),

  // Caregivers
  linkCaregiver: (payload) => request("/caregivers/link", { method: "POST", body: payload }),
  caregiverOverview: (cid, pid) =>
    request(`/caregivers/${cid}/patients/${pid}/overview`),
  caregiverNotifications: (cid) => request(`/caregivers/${cid}/notifications`),
  raiseEscalation: (payload) => request("/caregivers/escalations", { method: "POST", body: payload }),
  caregiverEducation: (cid, pid) => request(`/caregivers/${cid}/patients/${pid}/education`),

  // Rehab / VR
  exercises: () => request("/rehab/exercises"),
  logRehabSession: (payload) => request("/rehab/sessions", { method: "POST", body: payload }),
  rehabProgress: (id) => request(`/rehab/patients/${id}/progress`),

  // Body map
  bodyAssessments: (pid) => request(`/body/patients/${pid}/assessments`),
  saveBodyAssessment: (payload) => request("/body/assessments", { method: "POST", body: payload }),
  analyzeBodyAssessment: (id) => request(`/body/assessments/${id}/analyze`, { method: "POST" }),

  // AI Vision Emergency Monitoring
  monitoringEvent: (payload) => request("/monitoring/events", { method: "POST", body: payload }),
  monitoringRespond: (id, status) => request(`/monitoring/events/${id}/respond`, { method: "POST", body: { status } }),
  monitoringEvents: (pid) => request(`/monitoring/patients/${pid}/events`),

  // Lab results
  labs: (pid) => request(`/labs/patients/${pid}`),
  addLab: (payload) => request("/labs", { method: "POST", body: payload }),
  explainLabs: (pid) => request(`/labs/patients/${pid}/explain`),

  // Care modules
  careModules: () => request("/care/modules"),

  // Meta
  health: () => request("/health"),
};
