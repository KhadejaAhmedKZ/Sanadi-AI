// Interactive anatomical figure for the Body Map — semi-realistic male and
// female silhouettes (front/back) with clickable region hotspots, color-coded
// by the latest reported intensity. Original vector illustration.

export const FRONT_REGIONS = [
  { region: "Head", cx: 110, cy: 25 },
  { region: "Right Eye", cx: 104, cy: 31 },
  { region: "Left Eye", cx: 116, cy: 31 },
  { region: "Nose", cx: 110, cy: 38 },
  { region: "Mouth", cx: 110, cy: 45 },
  { region: "Throat", cx: 110, cy: 58 },
  { region: "Neck", cx: 110, cy: 68 },
  { region: "Right Shoulder", cx: 78, cy: 87 },
  { region: "Left Shoulder", cx: 142, cy: 87 },
  { region: "Chest", cx: 101, cy: 104 },
  { region: "Heart", cx: 122, cy: 114 },
  { region: "Right Arm", cx: 61, cy: 122 },
  { region: "Left Arm", cx: 159, cy: 122 },
  { region: "Right Ribs", cx: 99, cy: 129 },
  { region: "Left Ribs", cx: 121, cy: 129 },
  { region: "Stomach", cx: 110, cy: 140 },
  { region: "Abdomen", cx: 110, cy: 158 },
  { region: "Right Elbow", cx: 55, cy: 155 },
  { region: "Left Elbow", cx: 165, cy: 155 },
  { region: "Lower Abdomen", cx: 110, cy: 178 },
  { region: "Right Forearm", cx: 50, cy: 186 },
  { region: "Left Forearm", cx: 170, cy: 186 },
  { region: "Right Hip", cx: 92, cy: 205 },
  { region: "Left Hip", cx: 128, cy: 205 },
  { region: "Pelvis", cx: 110, cy: 200 },
  { region: "Groin", cx: 110, cy: 222 },
  { region: "Right Wrist", cx: 45, cy: 216 },
  { region: "Left Wrist", cx: 175, cy: 216 },
  { region: "Right Hand", cx: 44, cy: 238 },
  { region: "Left Hand", cx: 176, cy: 238 },
  { region: "Right Fingers", cx: 42, cy: 254 },
  { region: "Left Fingers", cx: 178, cy: 254 },
  { region: "Right Thigh", cx: 97, cy: 265 },
  { region: "Left Thigh", cx: 123, cy: 265 },
  { region: "Right Knee", cx: 98, cy: 310 },
  { region: "Left Knee", cx: 122, cy: 310 },
  { region: "Right Shin", cx: 100, cy: 350 },
  { region: "Left Shin", cx: 120, cy: 350 },
  { region: "Right Ankle", cx: 100, cy: 386 },
  { region: "Left Ankle", cx: 120, cy: 386 },
  { region: "Right Foot", cx: 93, cy: 406 },
  { region: "Left Foot", cx: 127, cy: 406 },
  { region: "Right Toes", cx: 88, cy: 418 },
  { region: "Left Toes", cx: 132, cy: 418 },
  { region: "Chin", cx: 110, cy: 50 },
  { region: "Right Ear", cx: 100, cy: 30 },
  { region: "Left Ear", cx: 120, cy: 30 },
  { region: "Right Collarbone", cx: 96, cy: 80 },
  { region: "Left Collarbone", cx: 124, cy: 80 },
  { region: "Sternum", cx: 110, cy: 93 },
  { region: "Navel", cx: 110, cy: 150 },
];

export const BACK_REGIONS = [
  { region: "Head", cx: 110, cy: 28 },
  { region: "Neck", cx: 110, cy: 64 },
  { region: "Left Shoulder", cx: 78, cy: 87 },
  { region: "Right Shoulder", cx: 142, cy: 87 },
  { region: "Upper Back", cx: 110, cy: 100 },
  { region: "Left Shoulder Blade", cx: 96, cy: 106 },
  { region: "Right Shoulder Blade", cx: 124, cy: 106 },
  { region: "Left Arm", cx: 61, cy: 122 },
  { region: "Right Arm", cx: 159, cy: 122 },
  { region: "Mid Back", cx: 110, cy: 140 },
  { region: "Spine", cx: 110, cy: 162 },
  { region: "Left Elbow", cx: 56, cy: 155 },
  { region: "Right Elbow", cx: 164, cy: 155 },
  { region: "Lower Back", cx: 110, cy: 184 },
  { region: "Left Forearm", cx: 51, cy: 186 },
  { region: "Right Forearm", cx: 169, cy: 186 },
  { region: "Left Wrist", cx: 49, cy: 214 },
  { region: "Right Wrist", cx: 171, cy: 214 },
  { region: "Left Hip", cx: 92, cy: 210 },
  { region: "Right Hip", cx: 128, cy: 210 },
  { region: "Sacrum", cx: 110, cy: 202 },
  { region: "Left Glute", cx: 99, cy: 232 },
  { region: "Right Glute", cx: 121, cy: 232 },
  { region: "Left Hand", cx: 46, cy: 238 },
  { region: "Right Hand", cx: 174, cy: 238 },
  { region: "Left Thigh", cx: 97, cy: 272 },
  { region: "Right Thigh", cx: 123, cy: 272 },
  { region: "Left Calf", cx: 99, cy: 342 },
  { region: "Right Calf", cx: 121, cy: 342 },
  { region: "Left Ankle", cx: 99, cy: 384 },
  { region: "Right Ankle", cx: 121, cy: 384 },
  { region: "Left Heel", cx: 99, cy: 402 },
  { region: "Right Heel", cx: 121, cy: 402 },
  { region: "Base of Skull", cx: 110, cy: 46 },
  { region: "Left Flank", cx: 95, cy: 150 },
  { region: "Right Flank", cx: 125, cy: 150 },
  { region: "Coccyx", cx: 110, cy: 216 },
  { region: "Left Hamstring", cx: 99, cy: 302 },
  { region: "Right Hamstring", cx: 121, cy: 302 },
  { region: "Left Knee", cx: 99, cy: 318 },
  { region: "Right Knee", cx: 121, cy: 318 },
];

// Medical color scale: green / yellow / orange / red / purple(chronic-severe)
export function intensityColor(v) {
  if (v == null) return null;
  if (v === 0) return "#22c55e";
  if (v <= 3) return "#eab308";
  if (v <= 6) return "#f97316";
  if (v <= 8) return "#ef4444";
  return "#7c3aed";
}

const BODY_PATHS = {
  female: "M 110,12 C 94,12 90,25 91,37 C 91.5,46 99,54 103,58 C 102.5,62 102.5,65 101.5,69 C 91,72.5 80,76 73,83 C 67.5,89 66,96 66,104 C 64.5,121 60.5,137 59,151 C 56.5,171 52,195 49,215 C 46.5,227 44,239 46.5,247 C 49,252 54.5,250 56,243 C 59,225 64,203 67,183 C 70,161 76,127 82,107 C 85,121 85.5,141 87,157 C 89,179 93,195 96,210 C 98.5,240 98,278 96,306 C 95,330 98.5,348 97.5,368 C 97,378 96.5,384 96,390 C 94.5,398 88.5,404 85,407 C 83.5,408.5 84,411 86.5,411 C 93.5,411 104,411 105.5,409 C 107,407 107,398 106.5,391 C 106,372 105.5,352 106.5,330 C 107,312 108.5,268 109.5,241 C 109.8,235 110,231 110,228 C 110,231 110.2,235 110.5,241 C 111.5,268 113,312 113.5,330 C 114.5,352 114,372 113.5,391 C 113,398 113,407 114.5,409 C 116,411 126.5,411 133.5,411 C 136,411 136.5,408.5 135,407 C 131.5,404 125.5,398 124,390 C 123.5,384 123,378 122.5,368 C 121.5,348 125,330 124,306 C 122,278 121.5,240 124,210 C 127,195 131,179 133,157 C 134.5,141 135,121 138,107 C 144,127 150,161 153,183 C 156,203 161,225 164,243 C 165.5,250 171,252 173.5,247 C 176,239 173.5,227 171,215 C 168,195 163.5,171 161,151 C 159.5,137 155.5,121 154,104 C 154,96 152.5,89 147,83 C 140,76 129,72.5 118.5,69 C 117.5,65 117.5,62 117,58 C 121,54 128.5,46 129,37 C 130,25 126,12 110,12 Z",
  male: "M 110,12 C 93.5,12 89.5,25 90.5,37 C 91.0,46 99,54 101,58 C 100.5,62 100.5,65 99.5,69 C 89,72.5 71,76 64,83 C 58.5,89 57,96 57,104 C 55.5,121 54.5,137 53,151 C 50.5,171 48,195 45,215 C 42.5,227 40,239 42.5,247 C 45,252 50.5,250 52,243 C 55,225 58,203 61,183 C 64,161 71,127 77,107 C 80,121 80.5,141 82,157 C 84,179 87,195 90,210 C 92.5,240 96,278 94,306 C 93,330 96.5,348 95.5,368 C 95,378 94.5,384 94,390 C 92.5,398 86.5,404 83,407 C 81.5,408.5 82,411 84.5,411 C 91.5,411 104,411 105.5,409 C 107,407 107,398 106.5,391 C 106,372 105.5,352 106.5,330 C 107,312 108.5,268 109.5,239 C 109.8,233 110,229 110,226 C 110,229 110.2,233 110.5,239 C 111.5,268 113,312 113.5,330 C 114.5,352 114,372 113.5,391 C 113,398 113,407 114.5,409 C 116,411 128.5,411 135.5,411 C 138,411 138.5,408.5 137,407 C 133.5,404 127.5,398 126,390 C 125.5,384 125,378 124.5,368 C 123.5,348 127,330 126,306 C 124,278 127.5,240 130,210 C 133,195 136,179 138,157 C 139.5,141 140,121 143,107 C 149,127 156,161 159,183 C 162,203 165,225 168,243 C 169.5,250 175,252 177.5,247 C 180,239 177.5,227 175,215 C 172,195 169.5,171 167,151 C 165.5,137 164.5,121 163,104 C 163,96 161.5,89 156,83 C 149,76 131,72.5 120.5,69 C 119.5,65 119.5,62 119,58 C 121,54 129.0,46 129.5,37 C 130.5,25 126.5,12 110,12 Z",
};

// Subtle interior contour hints (collarbone, chest, abdomen midline) that
// give the figure a medical-illustration feel without turning into a poster.
function Contours({ sex, side }) {
  if (side === "back") {
    return (
      <g className="bm-contour">
        <path d="M110,72 C109,110 111,150 110,204" />
        <path d="M86,92 C96,102 100,116 99,128" />
        <path d="M134,92 C124,102 120,116 121,128" />
      </g>
    );
  }
  return (
    <g className="bm-contour">
      <path d="M92,84 C102,88 118,88 128,84" />
      {sex === "male" ? (
        <>
          <path d="M88,118 C98,128 122,128 132,118" />
          <path d="M110,132 L110,196" />
          <path d="M96,168 C104,172 116,172 124,168" />
        </>
      ) : (
        <>
          <path d="M92,120 C100,131 120,131 128,120" />
          <path d="M110,134 L110,196" />
        </>
      )}
    </g>
  );
}

export default function BodyFigure({ side = "front", sex = "female", latest = {}, selected, onSelect }) {
  const regions = side === "front" ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <svg viewBox="0 0 220 425" className="body-figure" role="group" aria-label={`Body map, ${sex} figure, ${side} view`}>
      <defs>
        <radialGradient id="bm-skin" cx="44%" cy="28%" r="82%">
          <stop offset="0%" stopColor="var(--bm-skin-hi)" />
          <stop offset="100%" stopColor="var(--bm-skin-lo)" />
        </radialGradient>
        {/* soft top-left highlight for a polished, medical-illustration finish */}
        <radialGradient id="bm-sheen" cx="42%" cy="24%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="bm-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        {/* gentle depth shadow beneath the figure */}
        <filter id="bm-shadow" x="-30%" y="-12%" width="160%" height="132%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0b1a2f" floodOpacity="0.15" />
        </filter>
      </defs>

      <g className="bm-body" filter="url(#bm-shadow)">
        <path d={BODY_PATHS[sex]} fill="url(#bm-skin)" />
        {side === "back" && <path className="bm-spine" d="M110,74 L110,200" fill="none" />}
        <Contours sex={sex} side={side} />
        {side === "front" && (
          <g className="bm-face">
            <circle cx="103.5" cy="34" r="1.6" />
            <circle cx="116.5" cy="34" r="1.6" />
            <path d="M105,45 Q110,48 115,45" fill="none" />
          </g>
        )}
      </g>

      {/* soft sheen over the torso — sits above the body, below the markers */}
      <ellipse cx="98" cy="150" rx="66" ry="150" fill="url(#bm-sheen)" style={{ pointerEvents: "none" }} />

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
            {/* Invisible hit target keeps small dots easy to tap despite the dense layout. */}
            <circle cx={cx} cy={cy} r="9" fill="transparent" />
            {severe && <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.45" filter="url(#bm-glow)" className="bm-pulse" />}
            {isSel && <circle cx={cx} cy={cy} r="13" fill="var(--accent)" opacity="0.28" filter="url(#bm-glow)" className="bm-sel-glow" />}
            {isSel && <circle cx={cx} cy={cy} r="9.5" fill="none" stroke="var(--accent)" strokeWidth="2.2" />}
            <circle
              cx={cx}
              cy={cy}
              r={entry ? 6 : 4}
              fill={color || "var(--surface)"}
              stroke={color || "var(--muted)"}
              strokeWidth={entry ? 1.3 : 1.4}
              opacity={entry ? 0.95 : 0.62}
            />
            {entry ? <circle cx={cx} cy={cy} r="2.1" fill="#fff" opacity="0.85" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
