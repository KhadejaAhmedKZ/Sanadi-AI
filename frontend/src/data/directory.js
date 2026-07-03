// Demo care directory — ALL entries are fictional (names, ratings, wait
// times). In production this would come from a hospital-network API.

export const HOSPITALS = [
  {
    id: "h1",
    name: "Al Noor Medical City",
    area: "Downtown",
    rating: 4.9,
    reviews: 1240,
    distanceKm: 2.1,
    waitMins: 10,
    specialties: ["Cardiology", "Orthopedics", "Neurology", "General"],
    perks: ["24/7 Emergency", "Robotic surgery", "Valet parking"],
  },
  {
    id: "h2",
    name: "Zayed Wellness Hospital",
    area: "Marina District",
    rating: 4.8,
    reviews: 980,
    distanceKm: 4.6,
    waitMins: 15,
    specialties: ["Maternity", "Pediatrics", "General"],
    perks: ["Family suites", "Neonatal ICU"],
  },
  {
    id: "h3",
    name: "Oasis Rehabilitation Center",
    area: "Green Valley",
    rating: 4.7,
    reviews: 640,
    distanceKm: 6.2,
    waitMins: 5,
    specialties: ["Physiotherapy", "Orthopedics"],
    perks: ["Hydrotherapy pool", "VR rehab suites", "Sports medicine"],
  },
  {
    id: "h4",
    name: "Crescent Heart Institute",
    area: "Medical Quarter",
    rating: 4.9,
    reviews: 1510,
    distanceKm: 7.8,
    waitMins: 20,
    specialties: ["Cardiology"],
    perks: ["Cath lab", "Cardiac rehab program"],
  },
  {
    id: "h5",
    name: "Palm Respiratory & Allergy Clinic",
    area: "Seaside",
    rating: 4.6,
    reviews: 420,
    distanceKm: 3.4,
    waitMins: 8,
    specialties: ["Respiratory", "General"],
    perks: ["Same-day spirometry", "Allergy testing"],
  },
  {
    id: "h6",
    name: "Falcon Neuro & Spine Hospital",
    area: "North Gate",
    rating: 4.8,
    reviews: 760,
    distanceKm: 9.5,
    waitMins: 25,
    specialties: ["Neurology", "Orthopedics"],
    perks: ["Sleep lab", "Minimally-invasive spine unit"],
  },
];

export const DOCTORS = [
  { id: "d1", name: "Dr. Mariam Al Suwaidi", specialty: "Cardiology", hospital: "Crescent Heart Institute", rating: 4.9, reviews: 512, years: 18, languages: ["Arabic", "English"] },
  { id: "d2", name: "Dr. Omar Khalifa", specialty: "Orthopedics", hospital: "Al Noor Medical City", rating: 4.8, reviews: 447, years: 14, languages: ["Arabic", "English", "French"] },
  { id: "d3", name: "Dr. Aisha Rahman", specialty: "Physiotherapy", hospital: "Oasis Rehabilitation Center", rating: 4.9, reviews: 389, years: 11, languages: ["English", "Urdu"] },
  { id: "d4", name: "Dr. Yusuf Haddad", specialty: "Neurology", hospital: "Falcon Neuro & Spine Hospital", rating: 4.7, reviews: 301, years: 16, languages: ["Arabic", "English"] },
  { id: "d5", name: "Dr. Leila Nasser", specialty: "Maternity", hospital: "Zayed Wellness Hospital", rating: 4.8, reviews: 623, years: 12, languages: ["Arabic", "English"] },
  { id: "d6", name: "Dr. Daniel Chen", specialty: "Respiratory", hospital: "Palm Respiratory & Allergy Clinic", rating: 4.6, reviews: 214, years: 9, languages: ["English", "Mandarin"] },
  { id: "d7", name: "Dr. Fatima Al Zaabi", specialty: "Pediatrics", hospital: "Zayed Wellness Hospital", rating: 4.9, reviews: 538, years: 15, languages: ["Arabic", "English"] },
  { id: "d8", name: "Dr. Hassan Mansour", specialty: "General", hospital: "Al Noor Medical City", rating: 4.7, reviews: 356, years: 20, languages: ["Arabic", "English", "Hindi"] },
];

export const SPECIALTIES = [
  "All", "General", "Cardiology", "Orthopedics", "Physiotherapy",
  "Neurology", "Maternity", "Pediatrics", "Respiratory",
];
