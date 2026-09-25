# DisasterNav Backend (`/server`)

The **DisasterNav Backend** is a high-performance Node.js / Express proxy and calculation engine. It acts as the secure intermediary between the DisasterNav frontend and external geospatial disaster telemetry feeds.

---

## 🏗️ Architecture & Folder Structure

```
server/
├── src/
│   ├── config/
│   │   └── index.js              # Environment configuration & constants
│   ├── data/
│   │   └── fallbackFires.js      # Curated fallback active wildfire dataset
│   ├── routes/
│   │   ├── earthquakeRoutes.js   # USGS ShakeNet earthquake endpoints
│   │   ├── fireRoutes.js         # NASA FIRMS active hotspot endpoints
│   │   ├── geocodeRoutes.js      # Komoot Photon OSM geocoding endpoints
│   │   └── routingRoutes.js      # OpenRouteService & OSRM safe routing endpoints
│   ├── services/
│   │   ├── earthquakeService.js  # Fetches & maps USGS GeoJSON feeds
│   │   ├── fireService.js        # Parses NASA FIRMS CSV & handles fallbacks
│   │   ├── geocodeService.js     # Manages geocoding requests with caching
│   │   └── routingService.js     # Calculates routes with polygon hazard avoidance
│   └── utils/
│       ├── cache.js              # In-memory TTL cache (5-minute window)
│       └── geoUtils.js           # Haversine distance & dynamic detour waypoint calculations
├── .env                          # Local environment variables
├── .env.example                  # Template for environment variables
├── package.json                  # Dependencies & scripts
├── README.md                     # This documentation file
└── server.js                     # Express app setup, middleware, and route mounting
```

---

## 🛡️ Why Have a Backend?

1. **CORS Resolution**: External services like NASA FIRMS and upstream feeds enforce CORS or require custom headers that cannot be called directly from browser JavaScript.
2. **API Key Security**: Sensitive keys (`FIRMS_API_KEY`, `ORS_API_KEY`) stay server-side and are never exposed in client bundle code.
3. **In-Memory Caching**: Shared TTL caching reduces redundant upstream network requests and protects against rate-limiting.
4. **Resilient Fallback Handling**: If external APIs fail or keys are absent, the server seamlessly provides realistic disaster feeds and dynamic geometry detour waypoints.

---

## 📡 API Endpoints

### 1. `GET /api/health`
Health check status of the backend server.
- **Response**: `{ status: "ok", service: "DisasterNav Backend Proxy", uptimeSeconds: number, timestamp: string }`

### 2. `GET /api/earthquakes`
Real-time worldwide M2.5+ earthquake alerts from USGS ShakeNet.
- **Cache**: 5 minutes
- **Response**: `{ source: string, data: Earthquake[] }`

### 3. `GET /api/fires`
Active thermal anomalies from NASA FIRMS VIIRS feed or high-fidelity regional fallbacks.
- **Cache**: 5 minutes
- **Response**: `{ source: string, data: Fire[] }`

### 4. `GET /api/geocode?q=:search_term`
Geographic search and autocomplete proxying Komoot Photon (OpenStreetMap).
- **Cache**: Query-based TTL
- **Response**: `Array<{ id, name, fullName, lat, lon, type, class }>`

### 5. `POST /api/route`
Computes driving navigation routes with dynamic disaster polygon avoidance.
- **Body**:
  ```json
  {
    "start": [longitude, latitude],
    "end": [longitude, latitude],
    "avoid_polygons": { "type": "Polygon", "coordinates": [...] }
  }
  ```
- **Response**: `{ provider: string, avoided: boolean, route: GeoJSONFeatureCollection }`

---

## 🚀 Running the Backend

From the root project directory:
```bash
npm run dev:server
```

Or from inside `server/`:
```bash
npm run dev
```
Server runs at **`http://localhost:3001`**.
