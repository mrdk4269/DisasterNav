/**
 * Curated active fire hotspots for India (matching mockFires.js and realistic NASA FIRMS coordinates)
 * Used when NASA FIRMS key is absent or offline.
 */
export const FALLBACK_FIRES = [
  {
    id: "fire-shivalik-pine",
    name: "Pine Ridge (Shivalik Hills)",
    latitude: 30.2240,
    longitude: 78.0850,
    confidence: 94,
    brightness: 348.2,
    impactRadiusKm: 14.2,
    containment: "38% Contain",
    acq_date: new Date().toISOString().split('T')[0],
    acq_time: "1145",
    frp: 82.4,
    source: "FSI / NASA FIRMS",
    status: "Wildfire Perimeter Active"
  },
  {
    id: "fire-nainital-ridge",
    name: "Nainital Pine Sector",
    latitude: 29.3919,
    longitude: 79.4542,
    confidence: 91,
    brightness: 336.5,
    impactRadiusKm: 18.5,
    containment: "22% Contain",
    acq_date: new Date().toISOString().split('T')[0],
    acq_time: "0930",
    frp: 64.1,
    source: "FSI / NASA FIRMS",
    status: "Rapid Slope Spread"
  },
  {
    id: "fire-western-ghats",
    name: "Khandala Ridge Brush Fire",
    latitude: 18.7520,
    longitude: 73.3650,
    confidence: 84,
    brightness: 318.0,
    impactRadiusKm: 11.8,
    containment: "65% Contain",
    acq_date: new Date().toISOString().split('T')[0],
    acq_time: "0815",
    frp: 45.2,
    source: "FSI / NASA FIRMS",
    status: "Containment Operations"
  },
  {
    id: "fire-similipal",
    name: "Similipal Forest Hotspot",
    latitude: 21.8540,
    longitude: 86.3420,
    confidence: 88,
    brightness: 329.0,
    impactRadiusKm: 15.0,
    containment: "45% Contain",
    acq_date: new Date().toISOString().split('T')[0],
    acq_time: "1020",
    frp: 52.8,
    source: "FSI / NASA FIRMS",
    status: "Active Canopy Fire"
  }
];
