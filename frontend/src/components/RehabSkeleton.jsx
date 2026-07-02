// Holographic skeleton visualization for VR Rehab — replaces the emoji figure.
// Pure SVG, no extra deps. The highlighted (left) limb animates through the
// current rep using `bendFactor` (0..1, a smooth sine wave supplied by the
// parent), matched to the exercise being performed.

const CYAN = "#38bdf8";
const GREEN = "#34d399";
const AMBER = "#fbbf24";

export default function RehabSkeleton({ exerciseId, bendFactor = 0, running = false }) {
  const neck = { x: 50, y: 20 };
  const shoulderL = { x: 40, y: 24 };
  const shoulderR = { x: 60, y: 24 };
  const hipL = { x: 43, y: 58 };
  const hipR = { x: 57, y: 58 };

  // Static reference (right) limb — always at rest.
  const elbowR = { x: 66, y: 38 };
  const wristR = { x: 68, y: 52 };
  const kneeR = { x: 58, y: 78 };
  const ankleR = { x: 58, y: 96 };

  // Defaults for the active (left) limb — overridden per exercise below.
  let elbowL = { x: 34, y: 38 };
  let wristL = { x: 32, y: 52 };
  let kneeL = { x: 42, y: 78 };
  let ankleL = { x: 42, y: 96 };
  let footOrbit = null;
  let gripClose = 0;
  let target = null;
  let angleLabel = "";

  const ease = Math.sin(Math.min(1, Math.max(0, bendFactor)) * Math.PI); // 0 -> 1 -> 0 across the rep

  switch (exerciseId) {
    case "knee-flexion": {
      const flex = ease * 65;
      const rad = (flex * Math.PI) / 180;
      kneeL = { x: hipL.x - Math.sin(rad) * 20, y: hipL.y + Math.cos(rad) * 20 };
      ankleL = { x: kneeL.x + Math.sin(rad) * 18, y: kneeL.y + Math.cos(rad) * 18 };
      angleLabel = `${Math.round(flex + 40)}°`;
      break;
    }
    case "shoulder-raise": {
      const raise = 15 + ease * 130;
      const rad = (raise * Math.PI) / 180;
      elbowL = { x: shoulderL.x - Math.sin(rad) * 15, y: shoulderL.y + Math.cos(rad) * 15 };
      wristL = { x: elbowL.x - Math.sin(rad) * 13, y: elbowL.y + Math.cos(rad) * 13 };
      angleLabel = `${Math.round(raise)}°`;
      break;
    }
    case "ankle-circles": {
      const angle = bendFactor * Math.PI * 2;
      footOrbit = { x: Math.cos(angle) * 4, y: Math.sin(angle) * 2 };
      angleLabel = `${Math.round((bendFactor * 360) % 360)}°`;
      break;
    }
    case "grip-strength": {
      gripClose = ease;
      angleLabel = `${Math.round(ease * 100)}%`;
      break;
    }
    case "balance-reach": {
      elbowL = { x: shoulderL.x - 10 - ease * 8, y: shoulderL.y + 8 };
      wristL = { x: elbowL.x - 6 - ease * 10, y: elbowL.y - 2 };
      target = { x: 18 + ease * 4, y: 32 };
      angleLabel = ease > 0.85 ? "On target" : "Reaching…";
      break;
    }
    default:
      break;
  }

  const restColor = "rgba(148,163,184,0.55)";
  const activeColor = running ? GREEN : CYAN;

  return (
    <svg viewBox="0 0 100 110" className="rehab-skeleton" aria-hidden="true">
      <line x1="50" y1="4" x2="50" y2="106" stroke="rgba(56,189,248,0.12)" strokeWidth="0.5" strokeDasharray="3" />
      <line x1="8" y1="58" x2="92" y2="58" stroke="rgba(56,189,248,0.12)" strokeWidth="0.5" strokeDasharray="3" />
      <circle cx="50" cy="45" r="40" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="0.5" />

      {target && (
        <g>
          <circle cx={target.x} cy={target.y} r="6" fill="none" stroke={AMBER} strokeWidth="0.8" strokeDasharray="2" className="rehab-pulse" />
          <circle cx={target.x} cy={target.y} r="1.6" fill={AMBER} />
        </g>
      )}

      <path
        d={`M ${shoulderL.x} ${shoulderL.y} Q 50 18 ${shoulderR.x} ${shoulderR.y} L ${hipR.x} ${hipR.y} L ${hipL.x} ${hipL.y} Z`}
        fill="rgba(56,189,248,0.06)"
        stroke="rgba(56,189,248,0.35)"
        strokeWidth="0.75"
      />

      <line x1={hipL.x} y1={hipL.y} x2={hipR.x} y2={hipR.y} stroke="rgba(56,189,248,0.6)" strokeWidth="2" strokeLinecap="round" />
      <line x1={shoulderL.x} y1={shoulderL.y} x2={shoulderR.x} y2={shoulderR.y} stroke="rgba(56,189,248,0.6)" strokeWidth="2" strokeLinecap="round" />

      {/* static reference limbs */}
      <g opacity="0.4">
        <line x1={shoulderR.x} y1={shoulderR.y} x2={elbowR.x} y2={elbowR.y} stroke={restColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1={elbowR.x} y1={elbowR.y} x2={wristR.x} y2={wristR.y} stroke={restColor} strokeWidth="2" strokeLinecap="round" />
        <line x1={hipR.x} y1={hipR.y} x2={kneeR.x} y2={kneeR.y} stroke={restColor} strokeWidth="2.8" strokeLinecap="round" />
        <line x1={kneeR.x} y1={kneeR.y} x2={ankleR.x} y2={ankleR.y} stroke={restColor} strokeWidth="2.3" strokeLinecap="round" />
      </g>

      {/* active (left) limb */}
      <line x1={shoulderL.x} y1={shoulderL.y} x2={elbowL.x} y2={elbowL.y} stroke={activeColor} strokeWidth="3" strokeLinecap="round" />
      <line x1={elbowL.x} y1={elbowL.y} x2={wristL.x} y2={wristL.y} stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" />
      <line x1={hipL.x} y1={hipL.y} x2={kneeL.x} y2={kneeL.y} stroke={activeColor} strokeWidth="3.3" strokeLinecap="round" />
      <line x1={kneeL.x} y1={kneeL.y} x2={ankleL.x} y2={ankleL.y} stroke={activeColor} strokeWidth="2.8" strokeLinecap="round" />

      <circle cx={shoulderL.x} cy={shoulderL.y} r="2.6" fill="#020617" stroke={activeColor} strokeWidth="1.2" />
      <circle cx={elbowL.x} cy={elbowL.y} r="2" fill="#020617" stroke={activeColor} strokeWidth="1" />
      <circle
        cx={wristL.x}
        cy={wristL.y}
        r={2 + gripClose * 1.4}
        fill={gripClose > 0.5 ? activeColor : "#020617"}
        stroke={activeColor}
        strokeWidth="1"
      />
      <circle cx={hipL.x} cy={hipL.y} r="2.4" fill="#020617" stroke={activeColor} strokeWidth="1.2" />
      <circle cx={kneeL.x} cy={kneeL.y} r="3" fill="#020617" stroke={activeColor} strokeWidth="1.3" />
      <circle
        cx={ankleL.x + (footOrbit?.x || 0)}
        cy={ankleL.y + (footOrbit?.y || 0)}
        r="2.4"
        fill="#020617"
        stroke={activeColor}
        strokeWidth="1"
      />
      {footOrbit && (
        <ellipse cx={ankleL.x} cy={ankleL.y} rx="4" ry="2" fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="0.6" strokeDasharray="1.5" />
      )}

      <circle cx="50" cy="12" r="6" fill="#020617" stroke={running ? CYAN : "rgba(148,163,184,0.7)"} strokeWidth="1.2" />
      <circle cx="50" cy="12" r="1.2" fill={running ? GREEN : CYAN} />

      {angleLabel && (
        <text x="50" y="108" textAnchor="middle" fill={activeColor} fontSize="5" fontFamily="monospace" fontWeight="700">
          {angleLabel}
        </text>
      )}
    </svg>
  );
}
