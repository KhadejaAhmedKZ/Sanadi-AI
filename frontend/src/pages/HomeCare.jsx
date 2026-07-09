import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import { EmptyState, ErrorNote } from "../components/ui.jsx";

const STATUS_BADGE = { confirmed: "green", requested: "amber", completed: "gray", cancelled: "red" };
const fmtSlot = (iso) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function HomeCare() {
  const { user } = useAuth();
  const toast = useToast();
  const isCarer = user.role === "caregiver";
  const [patientId, setPatientId] = useState(isCarer ? 1 : user.id);

  const [catalog, setCatalog] = useState({});
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [service, setService] = useState("");
  const [providerName, setProviderName] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null); // { id, slot }

  useEffect(() => {
    api.careProviders()
      .then((d) => {
        setServices(d.services); setCatalog(d.catalog); setSlots(d.slots);
        setService((s) => s || d.services[0]);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function loadBookings() {
    try { setBookings(await api.bookings(patientId)); } catch (e) { setError(e.message); }
  }
  useEffect(() => { loadBookings(); }, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const providers = catalog[service] || [];
  useEffect(() => { setProviderName(providers[0]?.name || ""); }, [service, catalog]); // eslint-disable-line
  const provider = providers.find((p) => p.name === providerName) || providers[0];

  async function book() {
    if (!provider || !slot) { toast.error("Choose a provider and a time"); return; }
    setBusy(true);
    try {
      await api.createBooking({
        patient_id: patientId, service_type: service, provider: provider.name,
        location: provider.location, price: provider.price, scheduled_for: slot,
        notes, created_by: isCarer ? "caregiver" : "patient",
      });
      setNotes(""); setSlot("");
      toast.success("Booked — added to the care plan & appointment history");
      loadBookings();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function cancel(id) {
    try { await api.cancelBooking(id); toast.success("Booking cancelled"); loadBookings(); }
    catch (e) { toast.error(e.message); }
  }
  async function saveReschedule() {
    if (!editing?.slot) return;
    try { await api.rescheduleBooking(editing.id, editing.slot); setEditing(null); toast.success("Rescheduled"); loadBookings(); }
    catch (e) { toast.error(e.message); }
  }

  const field = { fontFamily: "inherit", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", width: "100%", fontSize: 14, background: "var(--surface)", color: "var(--text)" };

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🏠 Home &amp; Outside Care</h1>
        <p>
          Book physiotherapy, rehab, home nursing or specialist visits outside the hospital.
          Every booking syncs to the care plan &amp; appointment history.
          <span className="badge gray" style={{ marginLeft: 8 }}>prototype · synthetic providers</span>
        </p>
      </div>

      {isCarer && (
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <span className="muted" style={{ fontSize: ".85rem" }}>Patient</span>
          <input type="number" min="1" value={patientId} onChange={(e) => setPatientId(Number(e.target.value) || 1)} style={{ ...field, width: 90 }} />
          <span className="muted" style={{ fontSize: ".8rem" }}>(demo IDs 1–3)</span>
        </div>
      )}
      <ErrorNote message={error} />

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        {/* booking form */}
        <div className="card">
          <h3 className="card-title">Book a service</h3>
          <p className="card-sub">Choose a service, provider and time</p>

          <label className="field"><span>Service</span>
            <select value={service} onChange={(e) => setService(e.target.value)} style={field}>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <div className="grid" style={{ gap: 8, marginTop: 8 }}>
            {providers.map((p) => (
              <button key={p.name} onClick={() => setProviderName(p.name)}
                className="card" style={{
                  textAlign: "left", cursor: "pointer", padding: 12,
                  borderColor: providerName === p.name ? "var(--accent)" : "var(--border)",
                  boxShadow: providerName === p.name ? "0 0 0 2px var(--accent)33" : undefined,
                }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div className="muted" style={{ fontSize: ".82rem" }}>📍 {p.location} · 💳 {p.price}</div>
              </button>
            ))}
          </div>

          <label className="field" style={{ marginTop: 12 }}><span>Available time</span>
            <select value={slot} onChange={(e) => setSlot(e.target.value)} style={field}>
              <option value="">Select a slot…</option>
              {slots.map((s) => <option key={s} value={s}>{fmtSlot(s)}</option>)}
            </select>
          </label>
          <label className="field"><span>Notes (optional)</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. knee rehab follow-up" style={field} />
          </label>
          <button className="btn" style={{ marginTop: 6 }} onClick={book} disabled={busy || !provider}>
            {busy ? "Booking…" : "📅 Book & add to care plan"}
          </button>
        </div>

        {/* bookings list */}
        <div className="card">
          <h3 className="card-title">Your bookings</h3>
          <p className="card-sub">Upcoming &amp; past external care</p>
          {bookings.length === 0 ? (
            <EmptyState icon="🗓️" title="No bookings yet" hint="Book a service on the left." />
          ) : bookings.map((b) => (
            <div key={b.id} style={{ padding: "13px 0", borderTop: "1px solid var(--border)" }}>
              <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{b.service_type} · {b.provider}</div>
                  <div className="muted" style={{ fontSize: ".82rem" }}>{fmtSlot(b.scheduled_for)} · 📍 {b.location} · {b.price}</div>
                  {b.notes && <div className="muted" style={{ fontSize: ".8rem", marginTop: 2 }}>“{b.notes}”</div>}
                </div>
                <span className={"badge " + (STATUS_BADGE[b.status] || "gray")}>{b.status}</span>
              </div>
              {b.status !== "cancelled" && (
                editing?.id === b.id ? (
                  <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <select value={editing.slot} onChange={(e) => setEditing({ id: b.id, slot: e.target.value })} style={{ ...field, width: "auto", flex: "1 1 200px" }}>
                      <option value="">New time…</option>
                      {slots.map((s) => <option key={s} value={s}>{fmtSlot(s)}</option>)}
                    </select>
                    <button className="btn sm" onClick={saveReschedule} disabled={!editing.slot}>Save</button>
                    <button className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className="row" style={{ gap: 8, marginTop: 8 }}>
                    <button className="btn ghost sm" onClick={() => setEditing({ id: b.id, slot: "" })}>Reschedule</button>
                    <button className="btn danger sm" onClick={() => cancel(b.id)}>Cancel</button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
