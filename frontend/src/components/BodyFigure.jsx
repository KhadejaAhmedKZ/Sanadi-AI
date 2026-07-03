// Interactive human figure for the Body Map — stylized SVG silhouette with
// clickable region hotspots, color-coded by the latest reported intensity.

export const FRONT_REGIONS = [
  { region: "Head", cx: 110, cy: 40 },
  { region: "Neck", cx: 110, cy: 66 },
  { region: "Right Shoulder", cx: 78, cy: 88 },
  { region: "Left Shoulder", cx: 142, cy: 88 },
  { region: "Chest", cx: 110, cy: 112 },
  { region: "Right Arm", cx: 56, cy: 150 },
  { region: "Left Arm", cx: 164, cy: 150 },
  { region: "Abdomen", cx: 110, cy: 168 },
  { region: "Right Hand", cx: 42, cy: 232 },
  { region: "Left Hand", cx: 178, cy: 232 },
  { region: "Right Hip", cx: 92, cy: 214 },
  { region: "Left Hip", cx: 128, cy: 214 },
  { region: "Right Knee", cx: 95, cy: 310 },
  { region: "Left Knee", cx: 125, cy: 310 },
  { region: "Right Ankle", cx: 96, cy: 392 },
  { region: "Left Ankle", cx: 124, cy: 392 },
];

export const BACK_REGIONS = [
  { region: "Head", cx: 110, cy: 40 },
  { region: "Neck", cx: 110, cy: 66 },
  { region: "Left Shoulder", cx: 78, cy: 88 },
  { region: "Right Shoulder", cx: 142, cy: 88 },
  { region: "Upper Back", cx: 110, cy: 108 },
  { region: "Left Arm", cx: 56, cy: 150 },
  { region: "Right Arm", cx: 164, cy: 150 },
  { region: "Mid Back", cx: 110, cy: 148 },
  { region: "Lower Back", cx: 110, cy: 188 },
  { region: "Left Hip", cx: 92, cy: 218 },
  { region: "Right Hip", cx: 128, cy: 218 },
  { region: "Left Thigh", cx: 95, cy: 268 },
  { region: "Right Thigh", cx: 125, cy: 268 },
  { region: "Left Calf", cx: 96, cy: 348 },
  { region: "Right Calf", cx: 124, cy: 348 },
];

export function intensityColor(v) {
  if (v == null) return null;
  if (v === 0) return "#22c55e";
  if (v <= 3) return "#eab308";
  if (v <= 6) return "#f97316";
  if (v <= 8) return "#ef4444";
  return "#881337";
}

export default function BodyFigure({ side = "front", latest = {}, selected, onSelect }) {
  const regions = side === "front" ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <svg viewBox="0 0 220 430" className="body-figure" role="group" aria-label={`Body map, ${side} view`}>
      {/* silhouette */}
      <g className="bm-body">
        <circle cx="110" cy="38" r="21" />
        <rect x="101" y="57" width="18" height="14" rx="5" />
        <path d="M79,71 L141,71 Q151,73 151,86 L147,150 Q145,186 135,208 L85,208 Q75,186 73,150 L69,86 Q69,73 79,71 Z" />
        <rect x="43" y="84" width="21" height="136" rx="10.5" transform="rotate(7 53 84)" />
        <rect x="156" y="84" width="21" height="136" rx="10.5" transform="rotate(-7 167 84)" />
        <circle cx="41" cy="234" r="9" />
        <circle cx="179" cy="234" r="9" />
        <rect x="85" y="206" width="24" height="196" rx="12" />
        <rect x="111" y="206" width="24" height="196" rx="12" />
        <ellipse cx="96" cy="408" rx="13" ry="7" />
        <ellipse cx="124" cy="408" rx="13" ry="7" />
        {side === "back" && (
          <path d="M110,74 L110,200" className="bm-spine" fill="none" />
        )}
      </g>

      {/* hotspots */}
      {regions.map(({ region, cx, cy }) => {
        const entry = latest[region];
        const color = entry ? intensityColor(entry.intensity) : null;
        const isSel = selected === region;
        const severe = entry && entry.intensity >= 7;
        return (
          <g
            key={region}
            className="bm-hotspot"
            onClick={() => onSelect?.(region)}
            role="button"
            tabIndex={0}
            aria-label={`${region}${entry ? `, pain ${entry.intensity} out of 10` : ", tap to assess"}`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(region); } }}
          >
            <title>{region}{entry ? ` — ${entry.intensity}/10` : ""}</title>
            {severe && <circle cx={cx} cy={cy} r="14" fill={color} opacity="0.3" className="bm-pulse" />}
            {isSel && <circle cx={cx} cy={cy} r="13" fill="none" stroke="var(--accent)" strokeWidth="2.5" />}
            <circle
              cx={cx}
              cy={cy}
              r={entry ? 8 : 5.5}
              fill={color || "transparent"}
              stroke={color || "var(--muted)"}
              strokeWidth={entry ? 0 : 1.6}
              opacity={entry ? 0.95 : 0.55}
            />
          </g>
        );
      })}
    </svg>
  );
}
