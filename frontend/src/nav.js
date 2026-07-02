// Single source of truth for role-based navigation — used by the Sidebar
// (grouped links) and the TopBar quick-search (flat, searchable list).
export const NAV = {
  patient: [
    {
      label: "Main",
      items: [
        { to: "/", icon: "🏠", label: "Home", end: true },
        { to: "/chat", icon: "💬", label: "AI Assistant" },
        { to: "/dashboard", icon: "📋", label: "My Health" },
        { to: "/appointments", icon: "📅", label: "Appointments" },
        { to: "/medications", icon: "💊", label: "Medications" },
        { to: "/analytics", icon: "📊", label: "Analytics" },
      ],
    },
    {
      label: "Care Modules",
      items: [
        { to: "/care", icon: "🏥", label: "Specialized Care" },
        { to: "/care/rehabilitation", icon: "🥽", label: "VR Rehab" },
      ],
    },
  ],
  caregiver: [
    {
      label: "Main",
      items: [
        { to: "/", icon: "🏠", label: "Home", end: true },
        { to: "/caregiver", icon: "👨‍👩‍👧", label: "Caregiver Portal" },
        { to: "/care", icon: "🏥", label: "Care Guides" },
      ],
    },
  ],
  provider: [
    {
      label: "Main",
      items: [
        { to: "/", icon: "🏠", label: "Home", end: true },
        { to: "/provider", icon: "👨‍⚕️", label: "Provider Portal" },
      ],
    },
  ],
};

export function flatNav(role) {
  const groups = NAV[role] || NAV.patient;
  const items = groups.flatMap((g) => g.items);
  items.push({ to: "/accessibility", icon: "♿", label: "Accessibility" });
  return items;
}
