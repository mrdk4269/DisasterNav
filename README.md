# DisasterNav (DisasterGuard GEO-OPS) MVP

Real-Time Disaster Awareness & Safe Navigation Web App built with React, Leaflet, Turf.js, and an Express proxy backend.

---

## ✨ Features & User Specific Implementations

1. **Clean, Modern UI (Non-Dark Theme with Exact Structure & Positioning)**
   - Replicates the structural layout from the PRD & reference design:
     - **Left Sidebar**: DisasterGuard / GEO-OPS CORE brand header, navigation items (Tactical Map, Active Incidents, Safe Navigation, Inject Hazard, Analytics), and bottom status footer (`DEFCON 2`, `SYNC: UTC`, `SAT-LINK EST 99.98%`).
     - **Top Bar**: Live map center coordinates (`37.7749° N, 122.4194° W`), Active Alert banner, Opt-in sound toggle, Evac/Demo trigger button.
     - **Secondary Bar**: `LIVE TELEMETRY: ACTIVE | FREQ 433.92 MHz`, OpenStreetMap Nominatim live search with autocomplete, and floating **Geospatial Key** legend toggle.
     - **Filter Chips**: All Disasters, Earthquakes, Forest Fires, Flood Zones, and Route Status.
     - **Floating "SAFE NAVIGATION" Button** at bottom-right.
     - **Bottom Alert Sheet**: "Active Crisis Alerts Near You" expandable to reveal live crisis cards sorted nearest first.

2. **Distinctive Cycle Effect for Disaster Hazard Areas (Key Visual)**
   - **Wildfire (e.g. Pine Ridge)**: Flame icon inside a circular orange node, attached badge (`38% Contain`), encircled by concentric hazard circles: inner core, **dashed containment perimeter** (matching the reference design), and outer threat ripple.
   - **Flood Inundation (e.g. Verdugo Basin)**: Hydro wave icon inside a circular blue node, attached badge (`+4.2 ft Crest`), encircled by concentric hydro inundation ripple rings.
   - **Earthquakes**: Seismic icon inside a red circular node, Richter magnitude badge (`M4.2`), encircled by concentric seismic wave rings.

3. **GPS Location Handling**
   - **Strictly follows instruction**: If GPS is not active, denied, or unavailable, the user's location marker (`YOU ARE HERE`) is **not shown**, avoiding any false confusion. Only when real browser geolocation is granted and active does the pulsing location dot appear.

4. **Opt-in Audio Telemetry**
   - Built using the Web Audio API with zero external MP3 dependencies. Muted by default, activated with 1-click on the top bar audio toggle (`Audio: ON`). Compliant with browser autoplay security policies.

5. **Admin / Demo Hazard Injection Panel**
   - Dedicated panel allowing immediate on-the-fly injection of a Wildfire, Flood, or Earthquake with custom coordinates and cycle radius, guaranteeing live hackathon demos even if no active disaster is currently in the vicinity.

6. **Safe Navigation & Hazard Avoidance Rerouting**
   - Enter destination or click a preset demo target (e.g. Berkeley Hills, Verdugo Basin, SFO).
   - Uses Turf.js geometry checking to detect if the route LineString intersects any disaster cycle buffer.
   - If a hazard is detected: displays a warning banner and automatically re-routes around the disaster geometry using OpenRouteService `avoid_polygons` (or intelligent waypoint detour), rendering the verified safe corridor in solid green!

---

## 📁 Project Structure: Frontend vs. Backend

This monorepo cleanly separates the **Frontend** and the **Backend**:

```
DisasterNav/
├── client/                 # 🌐 FRONTEND (React, Leaflet, Turf.js)
│   ├── src/
│   │   ├── api/            # Frontend API client fetchers (calls backend proxy)
│   │   ├── components/     # React UI components (Map, HUD, Modals, Drawers)
│   │   ├── data/           # Client mock & offline data
│   │   └── utils/          # Web Audio & Turf.js geometry helpers
│   ├── vite.config.js      # Proxies /api requests to localhost:3001
│   └── README.md           # [Frontend Documentation](client/README.md)
│
├── server/                 # ⚙️ BACKEND (Express, Caching, Routing Engine)
│   ├── routes/             # Self-contained endpoints for Hackathon demo
│   │   ├── earthquakes.js  # USGS ShakeNet earthquake feed + cache
│   │   ├── fires.js        # NASA FIRMS hotspots + fallback data
│   │   ├── geocode.js      # Komoot Photon (OSM) search
│   │   └── routing.js      # Safe routing & hazard polygon avoidance
│   ├── server.js           # Clean Express app entry point mounting routes
│   └── README.md           # [Backend Documentation](server/README.md)
│
├── ARCHITECTURE.md         # 📖 [Full Architecture & Data Flow Guide](ARCHITECTURE.md)
└── package.json            # Root workspace scripts to run both simultaneously
```

> 📖 **Need a complete breakdown of data flow and architecture?** Read **[ARCHITECTURE.md](ARCHITECTURE.md)**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Running the App
From the root directory:
```bash
npm run dev
```
This runs both the backend Express proxy on port `3001` and the React frontend on `http://localhost:5173`.

Alternatively, you can run them individually:
```bash
# In terminal 1 (Backend):
npm run dev:server

# In terminal 2 (Frontend):
npm run dev:client
```

Open **`http://localhost:5173`** in your browser.

---

## 🛰️ Architecture & APIs

- **USGS ShakeNet**: Real-time worldwide M2.5+ earthquake GeoJSON feed.
- **NASA FIRMS**: Active fire thermal hotspots (proxied through Express backend with local high-fidelity fallback).
- **NOAA River Net**: Simulated hydro inundation flood zones.
- **Komoot Photon / Nominatim**: Free geocoding location search.
- **Routing Engine**: OpenRouteService / OSRM proxy supporting dynamic hazard polygon avoidance.
- **Turf.js**: Circular cycle polygon buffering, geodesic distance calculations, and boolean line intersection testing.

