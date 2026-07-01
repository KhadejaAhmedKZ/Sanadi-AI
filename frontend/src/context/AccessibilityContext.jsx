import { createContext, useContext, useEffect, useState } from "react";

const AccessibilityContext = createContext(null);

const DEFAULTS = {
  largeText: false,
  highContrast: false,
  voiceEnabled: false, // auto text-to-speech of assistant replies
  faceControl: false, // hands-free head-cursor + blink-to-click
  screenReader: false, // speak page + whatever the user focuses/points at
};

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("sanadi_a11y");
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  // Reflect settings on <body> so global CSS can respond.
  useEffect(() => {
    document.body.classList.toggle("a11y-large-text", settings.largeText);
    document.body.classList.toggle("a11y-high-contrast", settings.highContrast);
    localStorage.setItem("sanadi_a11y", JSON.stringify(settings));
  }, [settings]);

  const toggle = (key) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  // Text-to-speech helper using the Web Speech API.
  const speak = (text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
    window.speechSynthesis.speak(utter);
  };

  const stopSpeaking = () => window.speechSynthesis?.cancel();

  return (
    <AccessibilityContext.Provider value={{ settings, toggle, speak, stopSpeaking }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
