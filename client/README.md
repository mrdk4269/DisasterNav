# DisasterNav Frontend (`/client`)

The **DisasterNav Frontend** is a real-time reactive geospatial single-page application built with React, Leaflet, and Turf.js. It renders interactive maps, disaster cycle hazard perimeters, navigation corridors, and crisis alerts.

---

## 🏗️ Architecture & Folder Structure

```
client/
├── public/                       # Static public assets
├── src/
│   ├── api/                      # Client-side API fetchers (calls backend /api proxy)
│   │   ├── earthquakes.js        # Calls GET /api/earthquakes
│   │   ├── fires.js              # Calls GET /api/fires
│   │   ├── floods.js             # Client flood layer loader
│   │   ├── geocoding.js          # Calls GET /api/geocode
│   │   ├── routing.js            # Calls POST /api/route
│   │   └── README.md             # Guide explaining the client API layer
│   ├── assets/                   # SVG and image assets
│   ├── components/               # React UI Components
│   │   ├── ActiveTripHUD.jsx     # Floating heads-up navigation display
│   │   ├── ActiveTripMarker.jsx  # Moving user waypoint on route
│   │   ├── AlertSheet.jsx        # Expandable bottom crisis alert tray
│   │   ├── DemoModal.jsx         # Custom hazard injection modal
│   │   ├── DetailModal.jsx       # Disaster incident inspection modal
│   │   ├── DisasterCycleLayer.jsx# Concentric hazard ripples & containment lines
│   │   ├── FilterChips.jsx       # Layer filtering controls
│   │   ├── GeospatialKey.jsx     # Map symbology legend
│   │   ├── MapView.jsx           # Leaflet map container & tile engine
│   │   ├── NavDrawer.jsx         # Route planning and waypoint drawer
│   │   ├── RouteLayer.jsx        # Polyline rendering for safe/hazardous paths
│   │   ├── Sidebar.jsx           # Left navigation bar & system status
│   │   ├── ToastNotification.jsx # Real-time notification banners
│   │   ├── TopBar.jsx            # Telemetry status, audio toggle, demo trigger
│   │   └── UserLocationMarker.jsx# Live GPS location dot
│   ├── data/                     # Client-side fallback datasets (earthquakes, fires, floods)
│   ├── utils/                    # Frontend utilities
│   │   ├── audio.js              # Web Audio API sound synthesis (zero external MP3s)
│   │   └── geometry.js           # Turf.js polygon generation & line intersection
│   ├── App.css                   # Component-specific layout and styles
│   ├── App.jsx                   # Main React application coordinator
│   ├── index.css                 # Global design system & Tailwind/CSS variables
│   └── main.jsx                  # React DOM root entry point
├── index.html                    # Root HTML document
├── package.json                  # Frontend dependencies (React, Leaflet, Turf)
├── vite.config.js                # Vite config with /api proxy to localhost:3001
└── README.md                     # This documentation file
```

---

## 🔄 How the Frontend Connects to the Backend

During development, the frontend runs on port `5173` via Vite. In `vite.config.js`, an HTTP proxy is configured:

```javascript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

Whenever a frontend service in `src/api/` calls `fetch('/api/route')`, the browser sends it to `http://localhost:5173/api/route`, and Vite seamlessly forwards the request to the Express backend at `http://localhost:3001/api/route`.

This avoids browser CORS blocks and eliminates hardcoded backend URLs in client code.

---

## 🚀 Running the Frontend

From the root project directory:
```bash
npm run dev:client
```

Or from inside `client/`:
```bash
npm run dev
```

App opens at **`http://localhost:5173`**.
