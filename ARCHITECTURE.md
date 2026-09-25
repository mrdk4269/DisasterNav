# DisasterNav Architecture Guide: Frontend vs. Backend

This guide explains how DisasterNav is structured, clearly distinguishing between the **Frontend** (`/client`) and the **Backend** (`/server`), how they communicate, and where specific features live.

---

## 🗺️ High-Level System Architecture

```mermaid
graph TD
    subgraph Browser ["User Browser (Frontend: Port 5173)"]
        UI["React UI (App.jsx)"]
        Map["Leaflet Map Engine (MapView.jsx)"]
        Drawers["HUD & Drawers (NavDrawer, ActiveTripHUD)"]
        ClientAPI["Frontend API Client (src/api/*)"]
        UI --> Map
        UI --> Drawers
        Drawers --> ClientAPI
    end

    subgraph DevProxy ["Vite Development Server (Port 5173)"]
        Proxy["Vite HTTP Proxy (/api/*)"]
    end

    subgraph Backend ["DisasterNav Express Server (Backend: Port 3001)"]
        ServerEntry["server.js (Express Entry Point)"]
        Routes["Routes (src/routes/*)"]
        Services["Services (src/services/*)"]
        Cache["In-Memory TTL Cache (src/utils/cache.js)"]
        GeoUtils["Geometry & Detour (src/utils/geoUtils.js)"]
        FallbackData["Fallback Datasets (src/data/*)"]

        ServerEntry --> Routes
        Routes --> Services
        Services <--> Cache
        Services --> GeoUtils
        Services --> FallbackData
    end

    subgraph External ["External Upstream Providers"]
        USGS["USGS ShakeNet (Earthquakes)"]
        FIRMS["NASA FIRMS VIIRS (Wildfires)"]
        Photon["Komoot Photon (OSM Geocoding)"]
        ORS["OpenRouteService / OSRM (Routing)"]
    end

    ClientAPI -->|HTTP Fetch /api/*| Proxy
    Proxy -->|Local Forward| ServerEntry
    Services -->|Secure HTTPS| USGS
    Services -->|Secure HTTPS (API Key)| FIRMS
    Services -->|HTTPS| Photon
    Services -->|HTTPS (API Key / Fallback)| ORS
```

---

## ⚖️ Frontend vs. Backend: At a Glance

| Feature / Concern | Frontend (`/client`) | Backend (`/server`) |
|-------------------|----------------------|---------------------|
| **Core Technology** | React 18, Vite, Leaflet, Turf.js | Node.js, Express, native Fetch |
| **Port** | `http://localhost:5173` | `http://localhost:3001` |
| **Primary Job** | Interactive visual UI, user clicks, drawing map vectors | Data proxying, API key security, caching, server-side detour routing |
| **Where it Runs** | In the user's web browser | On the local or cloud Node.js server |
| **API Keys** | **None** (never expose keys to the browser) | `FIRMS_API_KEY`, `ORS_API_KEY` stored in `.env` |
| **Data Sources** | Calls `/api/*` on Vite dev server | Calls USGS, NASA FIRMS, Photon, and ORS APIs |
| **Fallbacks** | Local mock data if network disconnected | Built-in realistic datasets if upstream APIs fail |

---

## 📁 1. Frontend Structure (`/client`)

The frontend code lives inside `client/`. Everything executed in the user's browser is here:

```
client/
├── public/                 # Static assets, logos, icons
├── src/
│   ├── api/                # ⚡ FRONTEND API CLIENT LAYER
│   │   ├── earthquakes.js  # Sends fetch('/api/earthquakes')
│   │   ├── fires.js        # Sends fetch('/api/fires')
│   │   ├── floods.js       # Loads flood telemetry
│   │   ├── geocoding.js    # Sends fetch('/api/geocode?q=...')
│   │   ├── routing.js      # Sends fetch('/api/route', { start, end, avoid_polygons })
│   │   └── README.md       # Explains the client API layer
│   │
│   ├── components/         # 🎨 USER INTERFACE COMPONENTS
│   │   ├── ActiveTripHUD.jsx      # Navigation HUD overlay
│   │   ├── ActiveTripMarker.jsx   # Dynamic vehicle/user marker
│   │   ├── AlertSheet.jsx         # Bottom sliding alert tray
│   │   ├── DemoModal.jsx          # Admin hazard injection panel
│   │   ├── DetailModal.jsx        # Disaster details modal
│   │   ├── DisasterCycleLayer.jsx # Concentric hazard ripples & containment circles
│   │   ├── FilterChips.jsx        # Disaster layer visibility toggle chips
│   │   ├── GeospatialKey.jsx      # Symbology legend drawer
│   │   ├── MapView.jsx            # Interactive Leaflet map container
│   │   ├── NavDrawer.jsx          # Route planning sidebar & address search
│   │   ├── RouteLayer.jsx         # Leaflet polyline for active routes
│   │   ├── Sidebar.jsx            # Left navigation sidebar
│   │   ├── ToastNotification.jsx  # Notification popups
│   │   ├── TopBar.jsx             # Top status bar & sound toggle
│   │   └── UserLocationMarker.jsx # Live GPS location marker
│   │
│   ├── data/               # 📦 STATIC MOCK DATASETS
│   │   ├── mockEarthquakes.js
│   │   ├── mockFires.js
│   │   └── mockFloods.js
│   │
│   ├── utils/              # 🛠️ CLIENT HELPERS
│   │   ├── audio.js        # Web Audio API sound telemetry synthesizer
│   │   └── geometry.js     # Turf.js circular cycle buffers & line intersection
│   │
│   ├── App.css             # Component layout styles
│   ├── App.jsx             # Root React application coordinator & state management
│   ├── index.css           # Global CSS variables & design tokens
│   └── main.jsx            # React root mount point
│
├── index.html              # HTML template
├── package.json            # Frontend packages: React, Leaflet, Turf
├── vite.config.js          # Vite config & dev server reverse proxy
└── README.md               # Frontend guide
```

---

## 📁 2. Backend Structure (`/server`)

The backend code lives inside `server/`. It is structured into standard architectural layers:

```
server/
├── src/
│   ├── config/             # ⚙️ CONFIGURATION & ENVIRONMENT
│   │   └── index.js        # Loads .env, exports PORT, API keys, cache TTL
│   │
│   ├── data/               # 📦 FALLBACK DATASETS
│   │   └── fallbackFires.js# Realistic wildfire data for India/local region
│   │
│   ├── routes/             # 🚦 HTTP ROUTE CONTROLLERS (Express Routers)
│   │   ├── earthquakeRoutes.js  # GET  /api/earthquakes
│   │   ├── fireRoutes.js        # GET  /api/fires
│   │   ├── geocodeRoutes.js     # GET  /api/geocode
│   │   └── routingRoutes.js     # POST /api/route
│   │
│   ├── services/           # 🧠 BUSINESS & INTEGRATION SERVICES
│   │   ├── earthquakeService.js # Fetches USGS ShakeNet GeoJSON & formats properties
│   │   ├── fireService.js       # Fetches NASA FIRMS CSV, parses, or serves fallback
│   │   ├── geocodeService.js    # Proxies Komoot Photon OSM geocoding with caching
│   │   └── routingService.js    # ORS avoid_polygons routing + OSRM geometric detour fallback
│   │
│   └── utils/              # 🧰 BACKEND UTILITIES
│       ├── cache.js        # In-memory TTL cache (5-minute window)
│       └── geoUtils.js     # Haversine distance formula & geometric detour calculation
│
├── .env                    # Secret API keys (ORS, FIRMS)
├── .env.example            # Environment template
├── package.json            # Backend packages: Express, Cors, Dotenv
├── README.md               # Backend guide
└── server.js               # Main Express application entry point & middleware mounting
```

---

## 🔌 3. How Frontend and Backend Communicate

During local development:
1. **Frontend runs on**: `http://localhost:5173`
2. **Backend runs on**: `http://localhost:3001`

To prevent Cross-Origin Resource Sharing (CORS) issues and avoid hardcoding `http://localhost:3001` in client code, **Vite provides a reverse proxy** configured in `client/vite.config.js`:

```javascript
// client/vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

### Request Flow Example:
1. User searches for a route to "Berkeley Hills" in the UI.
2. `client/src/api/routing.js` executes:
   ```javascript
   fetch('/api/route', {
     method: 'POST',
     body: JSON.stringify({ start, end, avoid_polygons })
   })
   ```
3. The browser sends the request to `http://localhost:5173/api/route`.
4. Vite's proxy receives the request and forwards it to `http://localhost:3001/api/route`.
5. `server/server.js` routes it to `routingRoutes.js` -> `routingService.js`.
6. The backend checks OpenRouteService or calculates a safe detour waypoint around the disaster polygon using `geoUtils.js`.
7. The result returns back through Vite to `client/src/components/RouteLayer.jsx`.
8. The Leaflet map paints the safe path in bright green!

---

## 🏃 4. Running the Entire System

From the root directory:

```bash
# Run both Backend and Frontend simultaneously with live-reload:
npm run dev

# Or run them in separate terminals:
npm run dev:server    # Terminal 1: Starts Express on http://localhost:3001
npm run dev:client    # Terminal 2: Starts React on http://localhost:5173
```
