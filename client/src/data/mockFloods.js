// Hydro Inundation and River Flood dataset for India
export const MOCK_FLOODS = [
  {
    id: "flood-yamuna-basin",
    type: "flood",
    name: "Yamuna Basin Inundation",
    badgeLabel: "+4.2 ft Crest",
    latitude: 28.6850,
    longitude: 77.2450,
    crestHeight: "+4.2 ft Crest",
    waterLevelMeters: 206.8,
    impactRadiusKm: 12.5,
    detectedTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    source: "CWC River Net (Simulated)",
    status: "Severe Riverfront Breach",
    severity: "Urgent"
  },
  {
    id: "flood-brahmaputra-valley",
    type: "flood",
    name: "Brahmaputra Flood Plain",
    badgeLabel: "+5.6 ft Surge",
    latitude: 26.1850,
    longitude: 91.7550,
    crestHeight: "+5.6 ft Surge",
    waterLevelMeters: 51.4,
    impactRadiusKm: 24.0,
    detectedTime: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    source: "CWC River Net (Simulated)",
    status: "Major River Surge",
    severity: "Critical"
  },
  {
    id: "flood-kuttanad-basin",
    type: "flood",
    name: "Kuttanad Lowland Surge",
    badgeLabel: "+3.1 ft High",
    latitude: 9.4980,
    longitude: 76.4380,
    crestHeight: "+3.1 ft High",
    waterLevelMeters: 2.1,
    impactRadiusKm: 15.0,
    detectedTime: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    source: "CWC River Net (Simulated)",
    status: "Backwater Inundation",
    severity: "High"
  }
];
