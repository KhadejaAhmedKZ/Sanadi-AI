import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HOSPITALS, DOCTORS, SPECIALTIES } from "../data/directory.js";
import { EmptyState } from "../components/ui.jsx";

function Stars({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5`}>
      {"★".repeat(Math.round(rating))}
      <span className="stars-dim">{"★".repeat(5 - Math.round(rating))}</span>
      <b> {rating.toFixed(1)}</b>
    </span>
  );
}

export default function FindCare() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("hospitals");
  const [specialty, setSpecialty] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("rating"); // rating | distance | wait

  const hospitals = useMemo(() => {
    let rows = HOSPITALS.filter(
      (h) =>
        (specialty === "All" || h.specialties.includes(specialty)) &&
        h.name.toLowerCase().includes(query.trim().toLowerCase())
    );
    if (sort === "rating") rows = [...rows].sort((a, b) => b.rating - a.rating);
    if (sort === "distance") rows = [...rows].sort((a, b) => a.distanceKm - b.distanceKm);
    if (sort === "wait") rows = [...rows].sort((a, b) => a.waitMins - b.waitMins);
    return rows;
  }, [specialty, query, sort]);

  const doctors = useMemo(
    () =>
      DOCTORS.filter(
        (d) =>
          (specialty === "All" || d.specialty === specialty) &&
          (d.name.toLowerCase().includes(query.trim().toLowerCase()) ||
            d.hospital.toLowerCase().includes(query.trim().toLowerCase()))
      ).sort((a, b) => b.rating - a.rating),
    [specialty, query]
  );

  function bookAt(department, place) {
    navigate("/appointments", { state: { department, place } });
  }

  return (
    <div className="grid" style={{ gap: 22 }}>
      <div className="page-head">
        <h1>🏥 Find Care</h1>
        <p>
          Top-rated hospitals and doctors near you.{" "}
          <span className="badge gray">demo directory — fictional data</span>
        </p>
      </div>

      <div className="row wrap" style={{ gap: 10 }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
          <button className={"tab" + (tab === "hospitals" ? " active" : "")} onClick={() => setTab("hospitals")}>🏥 Hospitals</button>
          <button className={"tab" + (tab === "doctors" ? " active" : "")} onClick={() => setTab("doctors")}>👨‍⚕️ Doctors</button>
        </div>
        <input
          className="clinical-search"
          style={{ maxWidth: 240 }}
          placeholder="🔍 Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={{ maxWidth: 180 }}>
          {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {tab === "hospitals" && (
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="rating">Best rated</option>
            <option value="distance">Nearest</option>
            <option value="wait">Shortest wait</option>
          </select>
        )}
      </div>

      {tab === "hospitals" && (
        hospitals.length === 0 ? <EmptyState icon="🏥" title="No hospitals match" hint="Try another specialty." /> : (
          <div className="grid cols-2">
            {hospitals.map((h, i) => (
              <motion.div
                key={h.id}
                className="card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <h3 className="card-title" style={{ marginBottom: 2 }}>{h.name}</h3>
                    <div className="muted" style={{ fontSize: ".82rem" }}>
                      📍 {h.area} · {h.distanceKm} km away
                    </div>
                  </div>
                  <Stars rating={h.rating} />
                </div>
                <div className="row wrap" style={{ gap: 6, margin: "10px 0" }}>
                  {h.specialties.map((s) => (
                    <span key={s} className="badge">{s}</span>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: ".8rem", marginBottom: 10 }}>
                  {h.perks.join(" · ")}
                </div>
                <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
                  <span className="badge green">⏱ ~{h.waitMins} min wait</span>
                  <button
                    className="btn sm"
                    onClick={() => bookAt(h.specialties[0] === "General" ? "General" : h.specialties[0], h.name)}
                  >
                    📅 Book here
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {tab === "doctors" && (
        doctors.length === 0 ? <EmptyState icon="👨‍⚕️" title="No doctors match" hint="Try another specialty." /> : (
          <div className="grid cols-2">
            {doctors.map((d, i) => (
              <motion.div
                key={d.id}
                className="card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <div className="avatar" style={{ background: "var(--gradient-primary)" }}>
                      {d.name.split(" ").slice(-1)[0][0]}
                    </div>
                    <div>
                      <h3 className="card-title" style={{ marginBottom: 2 }}>{d.name}</h3>
                      <div className="muted" style={{ fontSize: ".82rem" }}>{d.specialty} · {d.hospital}</div>
                    </div>
                  </div>
                  <Stars rating={d.rating} />
                </div>
                <div className="row wrap" style={{ gap: 6, margin: "12px 0" }}>
                  <span className="badge gray">{d.years} yrs experience</span>
                  <span className="badge gray">🗣 {d.languages.join(", ")}</span>
                  <span className="badge gray">{d.reviews} reviews</span>
                </div>
                <button className="btn sm" onClick={() => bookAt(d.specialty, d.name)}>
                  📅 Book with {d.name.split(" ")[0]} {d.name.split(" ").slice(-1)[0]}
                </button>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
