# DisasterNav Backend (`/server`)

The **DisasterNav Backend** is a lightweight, high-performance Node.js / Express proxy and safe navigation calculation engine designed for fast hackathon demonstrations.

---

## 🏗️ Clean Hackathon Structure

```
server/
├── routes/
│   ├── earthquakes.js    # Live USGS ShakeNet feed + in-memory cache (~45 lines)
│   ├── fires.js          # NASA FIRMS active fire hotspots + local fallback (~75 lines)
│   ├── geocode.js        # Komoot Photon (OSM) search & autocomplete (~40 lines)
│   └── routing.js        # Safe routing with dynamic hazard polygon avoidance (~130 lines)
├── .env                  # Local API keys (optional: FIRMS, ORS)
├── .env.example          # Environment template
├── package.json          # Dependencies & start scripts
├── README.md             # This guide
└── server.js             # Clean 35-line Express entry point mounting routes
```

---

## 🚀 Why This Structure is Great for Hackathons

1. **Self-Contained Code**: Each route file contains both its HTTP handler and its specific data/logic. When presenting, you don't need to jump between controllers, services, and utils.
2. **1-to-1 Mirror with Frontend**:
   - `client/src/api/routing.js` ➡️ `server/routes/routing.js`
   - `client/src/api/fires.js`   ➡️ `server/routes/fires.js`
   - Judges can immediately see how data flows from the React client to the Express endpoint.
3. **Resilient Fallbacks**: If judges are offline or without API keys, the server seamlessly provides realistic disaster feeds and dynamic geometry detour waypoints.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and server status |
| `GET` | `/api/earthquakes` | Real-time M2.5+ earthquake alerts from USGS |
| `GET` | `/api/fires` | Active wildfire hotspots (NASA FIRMS / FSI fallback) |
| `GET` | `/api/geocode?q=:query` | Search address/place name suggestions |
| `POST` | `/api/route` | Compute driving route avoiding hazard polygons |

---

## 🏃 Running the Backend

From the root project directory:
```bash
npm run dev:server
```

Or from inside `server/`:
```bash
npm run dev
```

Server runs on **`http://localhost:3001`**.
