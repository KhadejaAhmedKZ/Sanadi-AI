import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAccessibility } from "../context/AccessibilityContext.jsx";

// Friendly names for each route, announced when Screen Reader mode is on.
const PAGE_NAMES = {
  "/": "Home",
  "/chat": "AI Assistant chat",
  "/dashboard": "My Health dashboard",
  "/appointments": "Appointments",
  "/medications": "Medications",
  "/analytics": "Analytics",
  "/care": "Specialized Care",
  "/care/rehabilitation": "VR Rehabilitation",
  "/caregiver": "Caregiver Portal",
  "/provider": "Provider Portal",
  "/accessibility": "Accessibility settings",
  "/login": "Sign in",
  "/register": "Create account",
};

/**
 * Screen-reader helper. When `screenReader` is on it:
 *  - announces the page each time you navigate,
 *  - reads the accessible name of whatever you focus (keyboard) or hover (mouse),
 *  - offers a floating "Read this page" button.
 */
export default function SpeechAnnouncer() {
  const { settings, speak, stopSpeaking } = useAccessibility();
  const { pathname } = useLocation();
  const on = settings.screenReader;
  const lastSpoken = useRef("");
  const hoverTimer = useRef(null);

  // Announce the page on navigation.
  useEffect(() => {
    if (!on) return;
    const name = PAGE_NAMES[pathname] || "Page";
    const t = setTimeout(() => speak(`${name}. `), 250);
    return () => clearTimeout(t);
  }, [on, pathname, speak]);

  // Speak elements on focus (keyboard) and hover (mouse).
  useEffect(() => {
    if (!on) return;

    function announce(el) {
      const target = interactiveAncestor(el);
      if (!target) return;
      const text = accessibleName(target);
      if (text && text !== lastSpoken.current) {
        lastSpoken.current = text;
        speak(text);
      }
    }

    function onFocusIn(e) {
      clearTimeout(hoverTimer.current);
      announce(e.target);
    }
    function onOver(e) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => announce(e.target), 220);
    }

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("mouseover", onOver);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("mouseover", onOver);
      clearTimeout(hoverTimer.current);
    };
  }, [on, speak]);

  // Stop any speech when the mode is turned off.
  useEffect(() => {
    if (!on) stopSpeaking();
  }, [on, stopSpeaking]);

  if (!on) return null;

  function readPage() {
    const main = document.querySelector(".content") || document.body;
    const text = (main.innerText || "").replace(/\s+/g, " ").trim().slice(0, 1200);
    speak(text || "Nothing to read on this page.");
  }

  return (
    <div className="sr-bar" role="region" aria-label="Screen reader controls">
      <button className="btn sm" onClick={readPage}>🔊 Read page</button>
      <button className="btn ghost sm" onClick={stopSpeaking}>⏹ Stop</button>
    </div>
  );
}

// Walk up to the nearest meaningful element to describe.
function interactiveAncestor(el) {
  if (!el || el === document.body) return null;
  return el.closest(
    "button, a, input, textarea, select, [role='button'], " +
      "h1, h2, h3, label, .nav-item, .stat-card, .care-card, .list-row, .msg, .badge"
  );
}

// Build a spoken label for an element.
function accessibleName(el) {
  if (!el) return "";
  const aria = el.getAttribute?.("aria-label");
  if (aria) return withRole(el, aria);

  const labelledby = el.getAttribute?.("aria-labelledby");
  if (labelledby) {
    const l = document.getElementById(labelledby);
    if (l) return withRole(el, l.innerText);
  }

  if (el.tagName === "IMG") return (el.getAttribute("alt") || "image") + ", image";

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    let label = "";
    if (el.id) {
      const lab = document.querySelector(`label[for="${el.id}"]`);
      if (lab) label = lab.innerText;
    }
    if (!label) {
      const wrap = el.closest("label");
      if (wrap) label = wrap.innerText;
    }
    const type = el.getAttribute("type") || el.tagName.toLowerCase();
    const value =
      type === "password" ? "" : el.value ? `, ${el.value}` : el.placeholder ? `, ${el.placeholder}` : "";
    return `${clean(label) || el.name || "field"}${value}, ${type} field`;
  }

  const text = clean(el.innerText || el.textContent || "");
  const fallback = text || el.getAttribute?.("title") || "";
  return withRole(el, fallback);
}

function withRole(el, name) {
  const tag = el.tagName;
  const role = el.getAttribute?.("role");
  let suffix = "";
  if (tag === "A") suffix = ", link";
  else if (tag === "BUTTON" || role === "button") suffix = ", button";
  else if (/^H[1-3]$/.test(tag)) suffix = ", heading";
  return (clean(name) + suffix).slice(0, 180);
}

const EMOJI = /[\p{Extended_Pictographic}‍️⃣]/gu;
const clean = (s) =>
  (s || "").replace(EMOJI, "").replace(/\s+/g, " ").trim();
