import { useEffect, useState } from "react";
import { api } from "../api/client.js";

// Real, role-appropriate notifications — derived from actual backend data,
// not fabricated counts.
export function useNotifications(user) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        if (user.role === "patient") {
          const dash = await api.dashboard(user.id);
          const list = [];
          const nextAppt = dash.appointments?.[0];
          if (nextAppt) {
            list.push({
              id: `appt-${nextAppt.id}`,
              icon: "📅",
              title: "Upcoming appointment",
              body: `${nextAppt.department} — ${new Date(nextAppt.scheduled_for).toLocaleDateString(undefined, { dateStyle: "medium" })}`,
            });
          }
          if (dash.medications?.length && dash.adherence_rate < 0.85) {
            list.push({
              id: "adherence",
              icon: "💊",
              title: "Medication reminder",
              body: `Adherence is at ${Math.round(dash.adherence_rate * 100)}% — don't forget today's doses.`,
            });
          }
          const worstSymptom = dash.recent_symptoms?.find((s) => s.pain_level != null && s.pain_level >= 6);
          if (worstSymptom) {
            list.push({
              id: `sym-${worstSymptom.id}`,
              icon: "🩺",
              title: "Elevated pain logged",
              body: worstSymptom.description,
            });
          }
          if (!cancelled) setItems(list);
        } else if (user.role === "caregiver") {
          const notes = await api.caregiverNotifications(user.id);
          if (!cancelled) {
            setItems(
              notes.slice(0, 8).map((n) => ({
                id: n.id, icon: n.urgent ? "🚨" : "🔔", title: n.title, body: n.body,
              }))
            );
          }
        } else if (user.role === "provider") {
          const pop = await api.population();
          if (!cancelled) {
            setItems(
              pop.high_risk_patients.slice(0, 8).map((p) => ({
                id: `risk-${p.id}`,
                icon: "⚠️",
                title: "High-risk patient",
                body: `${p.name} — ${Math.round(p.adherence_rate * 100)}% adherence, ${p.missed_doses} missed doses`,
              }))
            );
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  return items;
}
