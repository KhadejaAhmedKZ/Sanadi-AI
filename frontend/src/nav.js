// Single source of truth for role-based navigation — used by the Sidebar
// (grouped links) and the TopBar quick-search (flat, searchable list).
//
// Icons are Lucide components (vector, token-colorable) instead of emojis,
// per the "no emoji as structural icons" UX guideline — emojis stay in
// friendly content, but chrome iconography must be consistent.
import {
  Home,
  MessageCircleMore,
  ClipboardList,
  CalendarDays,
  Pill,
  FlaskConical,
  MapPin,
  GraduationCap,
  BarChart3,
  HeartPulse,
  Glasses,
  Users,
  Stethoscope,
  Accessibility,
} from "lucide-react";

export const NAV = {
  patient: [
    {
      label: "Main",
      items: [
        { to: "/", icon: Home, label: "Home", end: true },
        { to: "/chat", icon: MessageCircleMore, label: "AI Assistant" },
        { to: "/dashboard", icon: ClipboardList, label: "My Health" },
        { to: "/appointments", icon: CalendarDays, label: "Appointments" },
        { to: "/medications", icon: Pill, label: "Medications" },
        { to: "/labs", icon: FlaskConical, label: "Lab Results" },
        { to: "/find-care", icon: MapPin, label: "Find Care" },
        { to: "/analytics", icon: BarChart3, label: "Analytics" },
      ],
    },
    {
      label: "Care Modules",
      items: [
        { to: "/care", icon: HeartPulse, label: "Specialized Care" },
        { to: "/care/rehabilitation", icon: Glasses, label: "VR Rehab" },
        { to: "/learn", icon: GraduationCap, label: "Learning Hub" },
      ],
    },
  ],
  caregiver: [
    {
      label: "Main",
      items: [
        { to: "/", icon: Home, label: "Home", end: true },
        { to: "/caregiver", icon: Users, label: "Caregiver Portal" },
        { to: "/chat", icon: MessageCircleMore, label: "AI Assistant" },
        { to: "/learn", icon: GraduationCap, label: "Learning Hub" },
      ],
    },
  ],
  provider: [
    {
      label: "Main",
      items: [
        { to: "/", icon: Home, label: "Home", end: true },
        { to: "/provider", icon: Stethoscope, label: "Clinical Workspace" },
        { to: "/chat", icon: MessageCircleMore, label: "Clinical Copilot" },
        { to: "/learn", icon: GraduationCap, label: "Learning Hub" },
      ],
    },
  ],
};

export { Accessibility as AccessibilityIcon };

export function flatNav(role) {
  const groups = NAV[role] || NAV.patient;
  const items = groups.flatMap((g) => g.items);
  items.push({ to: "/accessibility", icon: Accessibility, label: "Accessibility" });
  return items;
}
