import { motion } from "framer-motion";

// Circular animated progress ring — used for health score, adherence, recovery %.
export default function ProgressRing({ value = 0, size = 92, stroke = 9, color = "var(--primary)", label, sublabel }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="progress-ring-label">
        <strong>{label ?? `${Math.round(pct)}%`}</strong>
        {sublabel && <span>{sublabel}</span>}
      </div>
    </div>
  );
}
