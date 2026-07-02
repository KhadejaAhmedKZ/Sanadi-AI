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
  BarChart3,
  HeartPulse,
  Glasses,
  Users,
  BookOpenText,
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
        { to: "/analytics", icon: BarChart3, label: "Analytics" },
      ],
    },
    {
      label: "Care Modules",
      items: [
        { to: "/care", icon: HeartPulse, label: "Specialized Care" },
        { to: "/care/rehabilitation", icon: Glasses, label: "VR Rehab" },
      ],
    },
  ],
  caregiver: [
    {
      label: "Main",
      items: [
        { to: "/", icon: Home, label: "Home", end: true },
        { to: "/caregiver", icon: Users, label: "Caregiver Portal" },
        { to: "/care", icon: BookOpenText, label: "Care Guides" },
      ],
    },
  ],
  provider: [
    {
      label: "Main",
      items: [
        { to: "/", icon: Home, label: "Home", end: true },
        { to: "/provider", icon: Stethoscope, label: "Provider Portal" },
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
