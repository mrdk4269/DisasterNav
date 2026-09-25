import express from 'express';

const router = express.Router();

/**
 * Computes a dynamic detour waypoint bypassing a hazard polygon.
 */
function computeDetourWaypoint(start, end, avoid_polygons) {
  if (!avoid_polygons || !avoid_polygons.coordinates) return null;

  try {
    const allPoints = [];
    function collectPoints(arr) {
      if (Array.isArray(arr) && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        allPoints.push(arr);
      } else if (Array.isArray(arr)) {
        arr.forEach(collectPoints);
      }
    }
    collectPoints(avoid_polygons.coordinates);

    if (allPoints.length === 0) return null;

    let sLon = 0, sLat = 0;
    allPoints.forEach(p => { sLon += p[0]; sLat += p[1]; });
    const cLon = sLon / allPoints.length;
    const cLat = sLat / allPoints.length;

    // Compute maximum radius of the polygon from center
    let maxRadiusDeg = 0;
    allPoints.forEach(p => {
      const d = Math.sqrt(Math.pow(p[0] - cLon, 2) + Math.pow(p[1] - cLat, 2));
      if (d > maxRadiusDeg) maxRadiusDeg = d;
    });

    // Safe offset margin (radius + 45% safe buffer or at least ~18-20km)
    const offsetDeg = Math.max(maxRadiusDeg * 1.45, 0.16);

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / mag;
    const perpY = dx / mag;

    const waypointLon = Number((cLon + perpX * offsetDeg).toFixed(5));
    const waypointLat = Number((cLat + perpY * offsetDeg).toFixed(5));

    if (!isNaN(waypointLon) && !isNaN(waypointLat)) {
      return { lon: waypointLon, lat: waypointLat, offsetDeg };
    }
  } catch (err) {
    console.warn('[Routing] Detour calculation error:', err);
  }

  return null;
}

/**
 * POST /api/route
 * Calculates safe vehicle driving route bypassing hazard polygons.
 * Payload: { start: [lon, lat], end: [lon, lat], avoid_polygons?: GeoJSON }
 */
router.post('/', async (req, res) => {
  try {
    const { start, end, avoid_polygons } = req.body;

    if (!start || !end || start.length !== 2 || end.length !== 2) {
      return res.status(400).json({ error: 'Valid start [lon, lat] and end [lon, lat] coordinates required' });
    }

    console.log('[Routing] Route requested between:', start, 'and', end);
    if (avoid_polygons) {
      console.log('[Routing] Hazard avoidance requested. Polygon type:', avoid_polygons.type);
    }

    const orsKey = process.env.ORS_API_KEY;

    // 1. Attempt OpenRouteService if API key is provided
    if (orsKey && orsKey !== 'your_ors_key_here') {
      try {
        const orsBody = {
          coordinates: [start, end],
          preference: 'recommended',
          units: 'km'
        };

        if (avoid_polygons && avoid_polygons.coordinates) {
          orsBody.options = {
            avoid_polygons: {
              type: avoid_polygons.type,
              coordinates: avoid_polygons.coordinates
            }
          };
          console.log('[Routing] Applying options.avoid_polygons to ORS payload');
        }

        const orsRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
          method: 'POST',
          headers: {
            'Authorization': orsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orsBody)
        });

        if (orsRes.ok) {
          const orsData = await orsRes.json();
          return res.json({
            provider: 'OpenRouteService',
            avoided: !!avoid_polygons,
            orsWarnings: orsData.error || orsData.metadata?.engine?.warnings || null,
            route: orsData
          });
        }
      } catch (orsErr) {
        console.warn('[Routing] ORS failed, falling back to OSRM:', orsErr.message);
      }
    }

    // 2. Intelligent OSRM Fallback with dynamic geometric detour
    let coordinatesPath = `${start[0]},${start[1]};${end[0]},${end[1]}`;

    if (avoid_polygons && avoid_polygons.coordinates) {
      const detour = computeDetourWaypoint(start, end, avoid_polygons);
      if (detour) {
        coordinatesPath = `${start[0]},${start[1]};${detour.lon},${detour.lat};${end[0]},${end[1]}`;
        console.log(`[Routing] Detour waypoint computed at [${detour.lon}, ${detour.lat}]`);
      }
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesPath}?overview=full&geometries=geojson&steps=true`;
    const osrmRes = await fetch(osrmUrl, { headers: { 'User-Agent': 'DisasterNav-Hackathon-App/1.0' } });

    if (!osrmRes.ok) {
      throw new Error(`OSRM engine responded with status ${osrmRes.status}`);
    }

    const osrmData = await osrmRes.json();
    if (!osrmData.routes || osrmData.routes.length === 0) {
      return res.status(404).json({ error: 'No route found between coordinates' });
    }

    const bestRoute = osrmData.routes[0];
    const geojsonRoute = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: bestRoute.geometry,
          properties: {
            distance: bestRoute.distance,
            duration: bestRoute.duration,
            summary: {
              distanceKm: (bestRoute.distance / 1000).toFixed(1),
              durationMin: Math.round(bestRoute.duration / 60)
            }
          }
        }
      ]
    };

    res.json({
      provider: 'OSRM / OpenStreetMap Engine',
      avoided: !!avoid_polygons,
      route: geojsonRoute
    });

  } catch (err) {
    console.error('[Routing] Error:', err.message);
    res.status(500).json({ error: 'Routing failed: ' + err.message });
  }
});

export default router;
