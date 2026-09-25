/**
 * Haversine formula to compute great-circle distance between two coordinates in kilometers.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in km
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Computes a dynamic detour waypoint bypassing a hazard polygon.
 * @param {[number, number]} start [lon, lat]
 * @param {[number, number]} end [lon, lat]
 * @param {object} avoid_polygons GeoJSON Polygon or MultiPolygon
 * @returns {{ lon: number, lat: number, offsetDeg: number } | null}
 */
export function computeDetourWaypoint(start, end, avoid_polygons) {
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
    allPoints.forEach(p => {
      sLon += p[0];
      sLat += p[1];
    });
    const cLon = sLon / allPoints.length;
    const cLat = sLat / allPoints.length;

    // Compute maximum radius of the polygon from center
    let maxRadiusDeg = 0;
    allPoints.forEach(p => {
      const d = Math.sqrt(Math.pow(p[0] - cLon, 2) + Math.pow(p[1] - cLat, 2));
      if (d > maxRadiusDeg) maxRadiusDeg = d;
    });

    // Offset waypoint outside hazard circle: radius + safe margin (approx 1.45x radius or at least ~18-20km)
    const offsetDeg = Math.max(maxRadiusDeg * 1.45, 0.16);

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / mag;
    const perpY = dx / mag;

    // Detour waypoint coordinates
    const waypointLon = Number((cLon + perpX * offsetDeg).toFixed(5));
    const waypointLat = Number((cLat + perpY * offsetDeg).toFixed(5));

    if (!isNaN(waypointLon) && !isNaN(waypointLat)) {
      return { lon: waypointLon, lat: waypointLat, offsetDeg };
    }
  } catch (detourErr) {
    console.warn('Detour calculation error:', detourErr);
  }

  return null;
}
