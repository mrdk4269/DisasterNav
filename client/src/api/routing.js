/**
 * Routing and Safe Navigation Client
 * Communicates with /api/route proxy (supporting ORS with avoid_polygons and OSRM fallback)
 */
export async function getRoute(startCoords, endCoords, avoidPolygons = null) {
  // startCoords: [lat, lon], endCoords: [lat, lon]
  // GeoJSON requires [lon, lat]
  const start = [startCoords[1], startCoords[0]];
  const end = [endCoords[1], endCoords[0]];

  // Verification Logging for Requirement 1
  console.log('[Routing Client] Initiating route calculation:');
  console.log(`- Start [lon, lat]: [${start[0]}, ${start[1]}]`);
  console.log(`- End [lon, lat]: [${end[0]}, ${end[1]}]`);
  if (avoidPolygons) {
    console.log(`- avoid_polygons Type: ${avoidPolygons.type}`);
    console.log('- avoid_polygons GeoJSON payload:', JSON.stringify(avoidPolygons));
  } else {
    console.log('- No avoidance requested (baseline route)');
  }

  try {
    const res = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start,
        end,
        avoid_polygons: avoidPolygons
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[Routing Client] Received route from ${data.provider}. Avoided:`, data.avoided);
      return {
        success: true,
        provider: data.provider,
        avoided: data.avoided,
        routeGeoJSON: data.route
      };
    } else {
      const errText = await res.text();
      console.warn('[Routing Client] Server responded with error:', res.status, errText);
    }
  } catch (backendErr) {
    console.warn('[Routing Client] Backend route proxy error, attempting direct client fallback:', backendErr.message);
  }

  // Direct client fallback to public OSRM if proxy fails
  try {
    let coordinatesPath = `${start[0]},${start[1]};${end[0]},${end[1]}`;

    if (avoidPolygons && avoidPolygons.coordinates) {
      try {
        // Bug #8 fix: For MultiPolygon, find the polygon closest to route midpoint
        // instead of averaging all coordinates globally
        const routeMidLon = (start[0] + end[0]) / 2;
        const routeMidLat = (start[1] + end[1]) / 2;

        let polygonRings;
        if (avoidPolygons.type === 'MultiPolygon') {
          // Each element in coordinates is a polygon (array of rings)
          let closestDist = Infinity;
          let closestRing = null;
          for (const polygon of avoidPolygons.coordinates) {
            const ring = polygon[0]; // outer ring
            if (!ring || ring.length === 0) continue;
            let cLon = 0, cLat = 0;
            ring.forEach(p => { cLon += p[0]; cLat += p[1]; });
            cLon /= ring.length;
            cLat /= ring.length;
            const dist = Math.sqrt(Math.pow(cLon - routeMidLon, 2) + Math.pow(cLat - routeMidLat, 2));
            if (dist < closestDist) {
              closestDist = dist;
              closestRing = ring;
            }
          }
          polygonRings = closestRing ? [closestRing] : [];
        } else {
          // Single Polygon: coordinates[0] is the outer ring
          polygonRings = avoidPolygons.coordinates[0] ? [avoidPolygons.coordinates[0]] : [];
        }

        const allPoints = polygonRings.flat();

        if (allPoints.length > 0) {
          let sLon = 0, sLat = 0;
          allPoints.forEach(p => { sLon += p[0]; sLat += p[1]; });
          const cLon = sLon / allPoints.length;
          const cLat = sLat / allPoints.length;

          // Compute max radius of polygon from center
          let maxDistDeg = 0;
          allPoints.forEach(p => {
            const d = Math.sqrt(Math.pow(p[0] - cLon, 2) + Math.pow(p[1] - cLat, 2));
            if (d > maxDistDeg) maxDistDeg = d;
          });

          // Required detour offset: at least polygon radius + buffer (approx ~0.15 to 0.25 deg)
          const offsetDeg = Math.max(maxDistDeg * 1.4, 0.16);

          const dx = end[0] - start[0];
          const dy = end[1] - start[1];
          const mag = Math.sqrt(dx * dx + dy * dy) || 1;
          const perpX = -dy / mag;
          const perpY = dx / mag;

          // Offset waypoint outside the hazard circle
          const waypointLon = Number((cLon + perpX * offsetDeg).toFixed(5));
          const waypointLat = Number((cLat + perpY * offsetDeg).toFixed(5));

          if (!isNaN(waypointLon) && !isNaN(waypointLat)) {
            coordinatesPath = `${start[0]},${start[1]};${waypointLon},${waypointLat};${end[0]},${end[1]}`;
            console.log(`[Routing Client Fallback] Computed detour waypoint at [lon, lat]: [${waypointLon}, ${waypointLat}]`);
          }
        }
      } catch (e) {
        console.warn('Detour calculation error in client fallback:', e);
      }
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesPath}?overview=full&geometries=geojson&steps=true`;
    const fallbackRes = await fetch(osrmUrl);
    const osrmJson = await fallbackRes.json();

    if (osrmJson.routes && osrmJson.routes.length > 0) {
      const best = osrmJson.routes[0];
      return {
        success: true,
        provider: 'OSRM Direct Fallback',
        avoided: !!avoidPolygons,
        routeGeoJSON: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: best.geometry,
              properties: {
                distance: best.distance,
                duration: best.duration,
                summary: {
                  distanceKm: (best.distance / 1000).toFixed(1),
                  durationMin: Math.round(best.duration / 60)
                }
              }
            }
          ]
        }
      };
    }
  } catch (directErr) {
    console.error('All routing options failed:', directErr);
  }

  return { success: false, error: 'Could not calculate route between points.' };
}
