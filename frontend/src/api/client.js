// Central API client for the Sanadi AI backend.
// Uses the Vite dev proxy (/api -> :8000) by default.

const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.detail || res.statusText || "Request failed";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request("/patients/register", { method: "POST", body: payload }),
  login: (payload) => request("/patients/login", { method: "POST", body: payload }),

  // Chat
  chat: (patient_id, message) =>
    request("/chat", { method: "POST", body: { patient_id, message } }),

  chatWithImage: async (patient_id, file, message) => {
    const form = new FormData();
    form.append("patient_id", patient_id);
    form.append("message", message || "");
    form.append("image", file);
    const res = await fetch(`${BASE}/chat/image`, { method: "POST", body: form });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = data?.detail || res.statusText || "Request failed";
      throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
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

  // Caregivers
  linkCaregiver: (payload) => request("/caregivers/link", { method: "POST", body: payload }),
  caregiverOverview: (cid, pid) =>
    request(`/caregivers/${cid}/patients/${pid}/overview`),
  caregiverNotifications: (cid) => request(`/caregivers/${cid}/notifications`),

  // Rehab / VR
  exercises: () => request("/rehab/exercises"),
  logRehabSession: (payload) => request("/rehab/sessions", { method: "POST", body: payload }),
  rehabProgress: (id) => request(`/rehab/patients/${id}/progress`),

  // Care modules
  careModules: () => request("/care/modules"),

  // Meta
  health: () => request("/health"),
};
