# Frontend API Client Layer (`client/src/api`)

## 💡 What is this folder?

This folder contains **Frontend HTTP Client Services**. 

It is located inside `client/src/` because these files run **in the user's browser**. They are responsible for making network requests to the **DisasterNav Backend Proxy** (`http://localhost:3001`) via Vite's local development proxy (`/api/*`).

### ⚠️ Common Confusion: "Is this the Backend?"
**No.** This is client-side code that talks to the backend:
- **Backend (`/server`)**: Listens on port `3001`, holds API keys, caches responses, and talks to NASA/USGS/ORS servers.
- **Frontend Client (`client/src/api`)**: Sends `fetch('/api/...')` calls from the browser to receive data and pass it to React state.

---

## 📂 File Directory

| File | Upstream Backend Route | Purpose |
|------|------------------------|---------|
| `earthquakes.js` | `GET /api/earthquakes` | Requests real-time USGS earthquake data |
| `fires.js` | `GET /api/fires` | Requests NASA FIRMS thermal hotspot data |
| `floods.js` | Local / Client Feed | Provides NOAA river inundation data |
| `geocoding.js` | `GET /api/geocode?q=...` | Requests location suggestions from Photon/OSM |
| `routing.js` | `POST /api/route` | Requests navigation paths avoiding hazard polygons |
