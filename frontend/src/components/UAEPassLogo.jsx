// UAE PASS brand mark — vector recreation of the official fingerprint logo
// (broken concentric ridges with the green and red accent strokes). Drawn
// with a light main stroke for use on the dark sign-in button.
export default function UAEPassLogo({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <g stroke="#fff" strokeWidth="7" strokeLinecap="round">
        {/* outer ridges */}
        <path d="M28 18 C40 10 62 10 74 19" />
        <path d="M17 34 C22 25 30 19 39 16" opacity=".9" />
        <path d="M83 33 C79 27 73 22 66 19" opacity=".9" />
        {/* middle ridges */}
        <path d="M24 48 C24 34 35 24 50 24 C63 24 73 32 76 44" />
        <path d="M79 55 C79 62 77 69 72 74" />
        {/* inner spiral */}
        <path d="M38 78 C32 71 29 62 30 52 C31 42 39 35 50 35 C60 35 67 42 68 51" />
        <path d="M62 62 C62 68 58 72 52 72 C45 72 41 66 41 58 C41 50 45 45 51 45 C56 45 60 49 60 54" />
        {/* short accents */}
        <path d="M14 52 C13 58 14 64 16 69" opacity=".8" />
        <path d="M50 82 C56 82 62 80 66 77" opacity=".8" />
      </g>
      {/* green ridge (signature accent) */}
      <path d="M36 30 C27 36 22 45 23 56 C23.5 62 25 67 28 71" stroke="#00a651" strokeWidth="8" strokeLinecap="round" fill="none" />
      {/* red tick at the base of the green ridge */}
      <path d="M31 78 C33 81 36 83 39 84" stroke="#ef3340" strokeWidth="8" strokeLinecap="round" fill="none" />
      {/* dots */}
      <g fill="#fff">
        <circle cx="22" cy="16" r="4" />
        <circle cx="52" cy="30" r="4" />
        <circle cx="86" cy="44" r="4" />
        <circle cx="90" cy="57" r="3.4" />
        <circle cx="55" cy="55" r="3.6" />
        <circle cx="74" cy="84" r="4" />
        <circle cx="28" cy="88" r="3.4" />
      </g>
    </svg>
  );
}
