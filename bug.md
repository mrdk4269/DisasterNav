# 🐛 DisasterNav — Bug Report

> **Generated:** 2026-09-25  
> **Scope:** Full codebase audit — Server (`server/`) + Client (`client/src/`)  
> **Total Bugs Found:** 22

---

## Table of Contents

| # | Severity | Status | File | Bug Summary |
|---|----------|--------|------|-------------|
| 1 | 🔴 Critical | ✅ Resolved | `server/.env` | API keys committed to version control |
| 2 | 🔴 Critical | ✅ Resolved | `server/.env` | Malformed `FIRMS_API_KEY` with stray colon |
| 3 | 🔴 Critical | ✅ Resolved | `App.jsx` | API spam / infinite re-fetch loop on map panning |
| 4 | 🟠 High | ✅ Resolved | `App.jsx` | Side effects inside React state updater function |
| 5 | 🟠 High | ✅ Resolved | `NavDrawer.jsx` | Stale coordinates when user types over autocomplete |
| 6 | 🟠 High | ✅ Resolved | `ToastNotification.jsx` | Toast never auto-closes due to unstable `onClose` ref |
| 7 | 🟠 High | ✅ Resolved | `fires.js` (client) | Invalid date format breaks Safari/Firefox |
| 8 | 🟠 High | ✅ Resolved | `routing.js` (client) | Multi-polygon centroid detour sends user to nowhere |
| 9 | 🟠 High | ✅ Resolved | `server/routes/geocode.js` | Unbounded geocode cache causes memory leak |
| 10 | 🟠 High | ✅ Resolved | `AlertSheet.jsx` | Crash when `disasters` prop is undefined |
| 11 | 🟡 Medium | `ActiveTripHUD.jsx` | ETA jumps to 15 min when distance is exactly 0 |
| 12 | 🟡 Medium | `ActiveTripMarker.jsx` / `UserLocationMarker.jsx` | Markers vanish at 0° lat/lon |
| 13 | 🟡 Medium | `geometry.js` | `ensureLonLat` only works for India coordinates |
| 14 | 🟡 Medium | `geometry.js` | `calculateRemainingRoute` ignores MultiLineString |
| 15 | 🟡 Medium | `App.jsx` | Missing geolocation watch cleanup on unmount |
| 16 | 🟡 Medium | `MapView.jsx` | Excessive re-renders from `move` event |
| 17 | 🟡 Medium | `server/server.js` | No global error handler for unhandled rejections |
| 18 | 🟡 Medium | `server/routes/earthquakes.js` | `toFixed` crash on null magnitude |
| 19 | 🟢 Low | `TopBar.jsx` | Debounce timer not cleared on unmount |
| 20 | 🟢 Low | `TopBar.jsx` | Missing error handling on geocoding search |
| 21 | 🟢 Low | `earthquakes.js` (client) | Missing `Array.isArray()` guard on `json.data` |
| 22 | 🟢 Low | `index.css` / `App.css` | Z-index conflict between markers and UI controls |

---

## 🔴 Critical Bugs

### Bug #1 — API Keys Committed to Version Control

- **File:** [`server/.env`](file:///c:/Disasternav%20demo/server/.env) (Lines 2–3)
- **Category:** Security Vulnerability
- **Severity:** 🔴 Critical

**Description:**  
Real API keys for `FIRMS_API_KEY` and `ORS_API_KEY` are hardcoded in the `.env` file, and the `.env` file is tracked by Git (not in `.gitignore` for the root).

**Why it's a problem:**  
Anyone with access to the repository can extract and abuse these API keys, leading to unauthorized usage, quota exhaustion, or billing charges.

**Suggested Fix:**  
1. Add `server/.env` to the root `.gitignore`  
2. Rotate/revoke the compromised keys immediately  
3. Only keep `server/.env.example` with placeholder values in version control

---

### Bug #2 — Malformed `FIRMS_API_KEY` with Stray Colon

- **File:** [`server/.env`](file:///c:/Disasternav%20demo/server/.env) (Line 2)
- **Category:** Configuration Error
- **Severity:** 🔴 Critical

**Description:**  
The line reads:
```
FIRMS_API_KEY=: 6eae87b8ca83de89fde303cb6ea96d6b
```
The value loaded by `dotenv` will be `": 6eae87b8ca83de89fde303cb6ea96d6b"` (with a colon, space, and then the key). This makes every FIRMS API call fail with an authentication error.

**Why it's a problem:**  
The fire data endpoint will never successfully authenticate, silently falling back to hardcoded data. The app appears to work but is never showing real fire data.

**Suggested Fix:**  
Remove the stray colon and space:
```
FIRMS_API_KEY=6eae87b8ca83de89fde303cb6ea96d6b
```

---

### Bug #3 — API Spam / Infinite Re-fetch Loop on Map Panning

- **File:** [`App.jsx`](file:///c:/Disasternav%20demo/client/src/App.jsx) (Lines 214–260) & [`MapView.jsx`](file:///c:/Disasternav%20demo/client/src/components/MapView.jsx) (Lines 33–35)
- **Category:** Performance / React useEffect Loop
- **Severity:** 🔴 Critical

**Description:**  
`loadDisasterData` is wrapped in `useCallback` with `telemetryCoords` in its dependency array. The `useEffect` on line 256 depends on `loadDisasterData` and sets up a 30-second polling interval. In `MapView.jsx`, the `map.on('move')` event fires on every animation frame during panning and calls `onCenterChange`, which updates `telemetryCoords` state.

**Why it's a problem:**  
Panning the map rapidly updates `telemetryCoords` → recreates `loadDisasterData` → forces the `useEffect` to teardown and immediately re-execute `loadDisasterData()`. This spams `fetchEarthquakes()`, `fetchFires()`, and `fetchFloods()` dozens of times per second, causing severe lag and potentially DDoS-ing the backend and upstream USGS/FIRMS APIs.

**Suggested Fix:**  
- Use a `useRef` for `telemetryCoords` inside the polling logic so changes don't trigger re-renders
- Or change the map event from `move` to `moveend` to only fire once after panning completes
- Remove `telemetryCoords` from `loadDisasterData`'s dependency array and read it from a ref instead

---

## 🟠 High Severity Bugs

### Bug #4 — Side Effects Inside React State Updater Function

- **File:** [`App.jsx`](file:///c:/Disasternav%20demo/client/src/App.jsx) (Lines 192–211)
- **Category:** React Anti-pattern / State Management
- **Severity:** 🟠 High

**Description:**  
Inside `handlePositionTick`, the `setTripData(currentTrip => { ... })` state updater performs side effects: it calls `setRemainingRouteGeoJSON()`, `setDistanceRemainingKm()`, and initiates async API calls via `getRoute()`.

**Why it's a problem:**  
React state updater functions must be pure. React may invoke updaters multiple times before committing (especially in Strict Mode), leading to duplicate API calls, race conditions, and unpredictable state.

**Suggested Fix:**  
Access `tripData` via a ref (`tripDataRef.current`) and run side effects directly inside `handlePositionTick`, outside of any state updater.

---

### Bug #5 — Stale Coordinates When User Types Over Autocomplete

- **File:** [`NavDrawer.jsx`](file:///c:/Disasternav%20demo/client/src/components/NavDrawer.jsx) (Lines 85–92, 100–107, 161)
- **Category:** Logic Error / State Management
- **Severity:** 🟠 High

**Description:**  
When the user types into origin/destination inputs, `handleOriginSearch` and `handleDestSearch` update the text state but do **not** reset the coordinate state (`originCoords` / `destCoords`) to `null`.

**Why it's a problem:**  
If a user picks "Delhi" from autocomplete (setting `destCoords`), then manually changes the text to "Mumbai" without clicking a suggestion, `handleCalculateRoute` sees `destCoords` is non-null and skips geocoding — silently routing to Delhi instead of Mumbai.

**Suggested Fix:**  
Add `setOriginCoords(null)` inside `handleOriginSearch` and `setDestCoords(null)` inside `handleDestSearch`.

---

### Bug #6 — Toast Never Auto-Closes Due to Unstable `onClose` Reference

- **File:** [`ToastNotification.jsx`](file:///c:/Disasternav%20demo/client/src/components/ToastNotification.jsx) (Lines 5–11)
- **Category:** React Anti-pattern / Stale Dependencies
- **Severity:** 🟠 High

**Description:**  
`onClose` is included in the `useEffect` dependency array. The parent (`App.jsx`) passes an inline arrow function `onClose={() => setToast(null)}`, whose reference changes on every render.

**Why it's a problem:**  
On frequent parent re-renders (e.g., during GPS tracking or map panning), the effect re-runs every time, clearing and restarting the 7-second timeout. The toast effectively never auto-dismisses.

**Suggested Fix:**  
Use a ref pattern for the callback:
```javascript
const onCloseRef = useRef(onClose);
useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
// In the timer effect, only depend on [toast] and call onCloseRef.current()
```

---

### Bug #7 — Invalid Date Format Breaks Safari/Firefox

- **File:** [`client/src/api/fires.js`](file:///c:/Disasternav%20demo/client/src/api/fires.js) (Line 26)
- **Category:** Logic Error / Date Formatting
- **Severity:** 🟠 High

**Description:**  
The line constructs date strings like `"2023-11-20 0430"`:
```javascript
detectedTime: item.acq_date ? `${item.acq_date} ${item.acq_time || ''}` : ...
```

**Why it's a problem:**  
This is not a valid ISO 8601 or RFC 2822 date string. `new Date("2023-11-20 0430")` returns `Invalid Date` on Safari and Firefox, causing rendering crashes or broken sorting anywhere this value is parsed.

**Suggested Fix:**  
Parse `acq_date` and `acq_time` into a proper ISO string:
```javascript
detectedTime: item.acq_date
  ? new Date(`${item.acq_date}T${String(item.acq_time).padStart(4,'0').slice(0,2)}:${String(item.acq_time).padStart(4,'0').slice(2)}:00Z`).toISOString()
  : new Date().toISOString()
```

---

### Bug #8 — Multi-Polygon Centroid Detour Sends User to Nowhere

- **File:** [`client/src/api/routing.js`](file:///c:/Disasternav%20demo/client/src/api/routing.js) (Lines 57–97)
- **Category:** Logic Error / Math Error
- **Severity:** 🟠 High

**Description:**  
The client-side fallback detour logic (also duplicated in `server/routes/routing.js` lines 12–56) averages ALL coordinates across ALL polygons in the `avoidPolygons` GeoJSON to find a single centroid for the detour waypoint.

**Why it's a problem:**  
With multiple separate disasters (e.g., one in North India, one in South India), the centroid lands in the middle of nowhere. The detour waypoint will be hundreds of kilometers off course.

**Suggested Fix:**  
Iterate through each polygon individually, determine which one actually intersects the route path, and compute a detour only for the intersecting polygon(s).

---

### Bug #9 — Unbounded Geocode Cache Causes Memory Leak

- **File:** [`server/routes/geocode.js`](file:///c:/Disasternav%20demo/server/routes/geocode.js) (Line 5)
- **Category:** Memory Leak
- **Severity:** 🟠 High

**Description:**  
```javascript
const geocodeCache = new Map();
```
The geocode cache grows indefinitely — entries are added but never evicted (even expired ones are only bypassed, not deleted).

**Why it's a problem:**  
Over time, the Map accumulates unlimited entries consuming ever-increasing memory. In a long-running production server, this will eventually cause an out-of-memory crash.

**Suggested Fix:**  
Implement a max-size LRU eviction strategy, or periodically sweep and delete entries older than the TTL:
```javascript
if (geocodeCache.size > 500) {
  const oldest = geocodeCache.keys().next().value;
  geocodeCache.delete(oldest);
}
```

---

### Bug #10 — Crash When `disasters` Prop Is Undefined

- **File:** [`AlertSheet.jsx`](file:///c:/Disasternav%20demo/client/src/components/AlertSheet.jsx) (Line 23)
- **Category:** Logic Error / Crash Risk
- **Severity:** 🟠 High

**Description:**  
```javascript
const sortedDisasters = [...disasters].map(...)
```
If `disasters` is `undefined` or `null` (e.g., during initial loading), the spread operator throws `TypeError: disasters is not iterable`, crashing the entire React component tree.

**Why it's a problem:**  
A brief loading state or parent re-render timing issue will crash the entire app with no error boundary to catch it.

**Suggested Fix:**  
```javascript
const sortedDisasters = [...(disasters || [])].map(...)
```

---

## 🟡 Medium Severity Bugs

### Bug #11 — ETA Jumps to 15 Minutes When Distance Is Exactly 0

- **File:** [`ActiveTripHUD.jsx`](file:///c:/Disasternav%20demo/client/src/components/ActiveTripHUD.jsx) (Lines 27–29)
- **Category:** Logic Error
- **Severity:** 🟡 Medium

**Description:**  
```javascript
const etaMinutes = distanceRemainingKm
  ? Math.max(1, Math.round((distanceRemainingKm / 60) * 60))
  : 15;
```
`distanceRemainingKm === 0` is falsy in JavaScript, so when the user arrives at the destination (0 km remaining), the ETA displays 15 minutes instead of 0 or 1.

**Suggested Fix:**  
```javascript
const etaMinutes = (distanceRemainingKm !== null && distanceRemainingKm !== undefined)
  ? Math.max(1, Math.round((distanceRemainingKm / 60) * 60))
  : 15;
```

---

### Bug #12 — Markers Vanish at 0° Latitude or 0° Longitude

- **File:** [`ActiveTripMarker.jsx`](file:///c:/Disasternav%20demo/client/src/components/ActiveTripMarker.jsx) (Line 34) & [`UserLocationMarker.jsx`](file:///c:/Disasternav%20demo/client/src/components/UserLocationMarker.jsx) (Line 24)
- **Category:** Logic Error
- **Severity:** 🟡 Medium

**Description:**  
```javascript
if (!location || !location[0] || !location[1]) return null;
```
JavaScript treats `0` as falsy. If a coordinate is exactly `0` (e.g., the Equator or Prime Meridian), the marker won't render.

**Suggested Fix:**  
```javascript
if (!location || location.length < 2 || location[0] == null || location[1] == null) return null;
```

---

### Bug #13 — `ensureLonLat` Only Works for India Coordinates

- **File:** [`geometry.js`](file:///c:/Disasternav%20demo/client/src/utils/geometry.js) (Lines 14–21)
- **Category:** Logic Error
- **Severity:** 🟡 Medium

**Description:**  
The coordinate-swapping heuristic is hardcoded to India's bounding box (`a >= 5 && a <= 45 && b >= 60 && b <= 105`). Coordinates outside India (e.g., USA, Japan, Europe) passed as `[lat, lon]` will not be swapped.

**Why it's a problem:**  
Any usage outside India silently produces reversed coordinates, crashing Turf.js geometry functions or placing markers in the wrong location.

**Suggested Fix:**  
Use a general heuristic based on valid lat/lon ranges, or strictly require callers to pass `[lon, lat]` and remove the auto-swap entirely.

---

### Bug #14 — `calculateRemainingRoute` Ignores MultiLineString

- **File:** [`geometry.js`](file:///c:/Disasternav%20demo/client/src/utils/geometry.js) (Lines 297–299)
- **Category:** Logic Error
- **Severity:** 🟡 Medium

**Description:**  
The function checks `if (!lineFeature || lineFeature.geometry?.type !== 'LineString')` and returns the original un-sliced route. `MultiLineString` geometries are completely ignored.

**Why it's a problem:**  
Some routing engines return `MultiLineString`. When this happens, active navigation silently fails to crop the route behind the user, showing the full original route indefinitely.

**Suggested Fix:**  
Add handling for `MultiLineString` by extracting the longest `LineString` segment or flattening coordinates.

---

### Bug #15 — Missing Geolocation Watch Cleanup on Unmount

- **File:** [`App.jsx`](file:///c:/Disasternav%20demo/client/src/App.jsx) (Lines 75, 434–442)
- **Category:** Memory Leak
- **Severity:** 🟡 Medium

**Description:**  
The app starts a GPS watch via `navigator.geolocation.watchPosition` when a trip begins, stored in `watchIdRef`. While `handleEndTrip` clears it, there is no cleanup on component unmount.

**Why it's a problem:**  
If the component unmounts during an active trip (e.g., Hot Module Replacement in dev, or navigating away), the browser continues tracking location indefinitely, causing memory leaks and battery drain.

**Suggested Fix:**  
```javascript
useEffect(() => {
  return () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
  };
}, []);
```

---

### Bug #16 — Excessive Re-renders from `move` Event

- **File:** [`MapView.jsx`](file:///c:/Disasternav%20demo/client/src/components/MapView.jsx) (Lines 33–35)
- **Category:** Performance Issue
- **Severity:** 🟡 Medium

**Description:**  
The `MapEvents` component binds to Leaflet's `move` event, which fires on every animation frame during panning, triggering `onCenterChange` continuously.

**Why it's a problem:**  
This causes React to update state on every frame, re-rendering the entire component tree and making map panning feel jittery.

**Suggested Fix:**  
Use `moveend` instead of `move`, or debounce the `onCenterChange` callback (e.g., with `lodash.debounce` or a manual `setTimeout`).

---

### Bug #17 — No Global Error Handler for Unhandled Rejections

- **File:** [`server/server.js`](file:///c:/Disasternav%20demo/server/server.js)
- **Category:** Error Handling
- **Severity:** 🟡 Medium

**Description:**  
The Express server has no global error-handling middleware and no `process.on('unhandledRejection')` / `process.on('uncaughtException')` handlers.

**Why it's a problem:**  
An unhandled promise rejection in any route handler will crash the entire Node.js process with no graceful recovery or logging.

**Suggested Fix:**  
Add a global Express error handler and process-level handlers:
```javascript
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
```

---

### Bug #18 — `toFixed` Crash on Null Magnitude

- **File:** [`server/routes/earthquakes.js`](file:///c:/Disasternav%20demo/server/routes/earthquakes.js) (Line 35)
- **Category:** Type Safety / Crash
- **Severity:** 🟡 Medium

**Description:**  
```javascript
const mag = f.properties.mag || 0;
badgeLabel: `M${mag.toFixed(1)} Richter`,
```
If `f.properties.mag` is `null`, `mag` becomes `0` (a number), so `toFixed` works. However, if `f.properties.mag` is `undefined` and `f.properties` itself is missing properties, the expression `f.properties.mag` could cause a deeper crash if `f.properties` is `undefined`.

**Why it's a problem:**  
USGS GeoJSON occasionally has features with missing or null `properties` fields. Accessing `f.properties.mag` on a feature with no `properties` object will throw a `TypeError`.

**Suggested Fix:**  
```javascript
const mag = f.properties?.mag ?? 0;
```

---

## 🟢 Low Severity Bugs

### Bug #19 — Debounce Timer Not Cleared on Unmount

- **File:** [`TopBar.jsx`](file:///c:/Disasternav%20demo/client/src/components/TopBar.jsx) (Lines 19–37)
- **Category:** Memory Leak / Unsafe State Update
- **Severity:** 🟢 Low

**Description:**  
The `setTimeout` used for debouncing geocoding search is stored in `debounceRef` but never cleaned up when `TopBarSearch` unmounts.

**Why it's a problem:**  
If the user types a query and the search bar unmounts before the 200ms delay finishes, the timeout fires and attempts to set state on an unmounted component.

**Suggested Fix:**  
```javascript
useEffect(() => {
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, []);
```

---

### Bug #20 — Missing Error Handling on Geocoding Search

- **File:** [`TopBar.jsx`](file:///c:/Disasternav%20demo/client/src/components/TopBar.jsx) (Line 34)
- **Category:** Missing Error Handling
- **Severity:** 🟢 Low

**Description:**  
The async call `const places = await searchLocations(val)` inside the debounced timeout has no `try/catch` block.

**Why it's a problem:**  
If the network request fails, it results in an unhandled promise rejection. The UI might stall without clearing previous results.

**Suggested Fix:**  
Wrap in `try/catch`:
```javascript
try {
  const places = await searchLocations(val);
  setResults(places);
  setShowDropdown(true);
} catch (err) {
  console.warn('Search failed:', err);
  setResults([]);
}
```

---

### Bug #21 — Missing `Array.isArray()` Guard on `json.data`

- **File:** [`client/src/api/earthquakes.js`](file:///c:/Disasternav%20demo/client/src/api/earthquakes.js) (Line 10)
- **Category:** Type Safety
- **Severity:** 🟢 Low

**Description:**  
```javascript
if (json.data && json.data.length > 0)
```
This does not verify that `json.data` is actually an array. If the backend returns `json.data` as an error string, `.slice(0, 30)` returns a substring and `.map()` throws a `TypeError`.

**Why it's a problem:**  
The `fires.js` API correctly uses `Array.isArray()` — this inconsistency means earthquake data is less resilient to malformed backend responses.

**Suggested Fix:**  
```javascript
if (json.data && Array.isArray(json.data) && json.data.length > 0)
```

---

### Bug #22 — Z-Index Conflict Between Markers and UI Controls

- **File:** [`index.css`](file:///c:/Disasternav%20demo/client/src/index.css) & [`App.css`](file:///c:/Disasternav%20demo/client/src/App.css)
- **Category:** CSS Bug
- **Severity:** 🟢 Low

**Description:**  
Hovering over a disaster marker sets `z-index: 1000 !important` (in `index.css`). The `.top-right-controls` overlay has `z-index: 999` (in `App.css`).

**Why it's a problem:**  
If a marker is positioned underneath the top-right controls, hovering elevates the marker above the controls, intercepting mouse clicks meant for the Demo Mode or Sound buttons.

**Suggested Fix:**  
Increase `.top-right-controls` z-index to `1050` to always sit above map markers.

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 7 |
| 🟡 Medium | 8 |
| 🟢 Low | 4 |
| **Total** | **22** |
