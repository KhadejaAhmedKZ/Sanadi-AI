import { useAccessibility } from "../context/AccessibilityContext.jsx";

export default function AccessibilityBar() {
  const { settings, toggle } = useAccessibility();
  return (
    <div className="a11y-bar" role="group" aria-label="Accessibility options">
      <button
        className={settings.largeText ? "on" : ""}
        onClick={() => toggle("largeText")}
        title="Large text"
        aria-pressed={settings.largeText}
      >
        A+
      </button>
      <button
        className={settings.highContrast ? "on" : ""}
        onClick={() => toggle("highContrast")}
        title="High contrast"
        aria-pressed={settings.highContrast}
      >
        ◐
      </button>
      <button
        className={settings.voiceEnabled ? "on" : ""}
        onClick={() => toggle("voiceEnabled")}
        title="Read replies aloud"
        aria-pressed={settings.voiceEnabled}
      >
        🔊
      </button>
    </div>
  );
}
