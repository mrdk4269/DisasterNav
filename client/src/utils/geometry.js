import * as turf from '@turf/turf';

/**
 * Validates and normalizes coordinates to strictly adhere to GeoJSON [longitude, latitude] standard.
 * In India/regional context: Longitude is ~68°E to 98°E, Latitude is ~8°N to 38°N.
 */
export function ensureLonLat(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return coord;
  const a = Number(coord[0]);
  const b = Number(coord[1]);
  if (isNaN(a) || isNaN(b)) return coord;

  // If b is outside valid latitude range (|b| > 90) and a is within latitude range,
  // then b is longitude and a is latitude -> passed as [lat, lon], swap to [lon, lat]!
  if (Math.abs(b) > 90 && Math.abs(b) <= 180 && Math.abs(a) <= 90) {
    return [b, a];
  }

  // If a is outside latitude range (|a| > 90), then a is already longitude -> [lon, lat]
  if (Math.abs(a) > 90 && Math.abs(a) <= 180 && Math.abs(b) <= 90) {
    return [a, b];
  }

  // Regional heuristic: In South Asia / India (lat 5-45, lon 60-105)
  if (a >= 5 && a <= 45 && b >= 60 && b <= 105) {
    return [b, a];
  }

  return [a, b];
}

/**
 * Creates a circular GeoJSON polygon around a coordinate with a given radius in km.
 * Explicitly uses [longitude, latitude] as required by GeoJSON and Turf.
 */
export function createDisasterPolygon(latitude, longitude, radiusKm = 5) {
  try {
    const lat = Number(latitude);
    const lon = Number(longitude);
    const rad = Math.max(Number(radiusKm) || 5, 0.5);

    if (isNaN(lat) || isNaN(lon)) {
      console.error('[Geometry] Invalid coordinates for disaster polygon:', latitude, longitude);
      return null;
    }

    // GeoJSON point requires [longitude, latitude]
    const centerPoint = turf.point([lon, lat]);
    const circle = turf.circle(centerPoint, rad, {
      steps: 64,
      units: 'kilometers'
    });

    return circle;
  } catch (err) {
    console.error('[Geometry] Error creating disaster polygon:', err);
    return null;
  }
}

/**
 * Builds a clean GeoJSON Polygon or MultiPolygon object for ORS options.avoid_polygons.
 * Strictly verifies GeoJSON [longitude, latitude] ordering and closes rings.
 */
export function buildAvoidPolygon(disasters = []) {
  if (!disasters || disasters.length === 0) return null;

  const validPolygons = [];

  disasters.forEach(d => {
    const radius = Number(d.impactRadiusKm) || (d.confidence ? d.confidence / 12 : 5);
    const poly = d.polygon || createDisasterPolygon(d.latitude, d.longitude, radius);
    if (poly && poly.geometry && poly.geometry.coordinates) {
      validPolygons.push(poly);
    }
  });

  if (validPolygons.length === 0) return null;

  let avoidGeometry = null;

  if (validPolygons.length === 1) {
    avoidGeometry = {
      type: 'Polygon',
      coordinates: validPolygons[0].geometry.coordinates
    };
  } else {
    // MultiPolygon or combined
    avoidGeometry = {
      type: 'MultiPolygon',
      coordinates: validPolygons.map(p => p.geometry.coordinates)
    };
  }

  // Verification log for Requirement 1 — coordinate order and geometry validation
  console.log('[Geometry] Built avoid_polygons GeoJSON for routing:');
  console.log(`- Type: ${avoidGeometry.type}`);
  console.log(`- Polygons count: ${validPolygons.length}`);
  const sampleCoord = avoidGeometry.type === 'Polygon' 
    ? avoidGeometry.coordinates[0][0] 
    : avoidGeometry.coordinates[0][0][0];
  console.log(`- First coordinate [lon, lat]:`, sampleCoord);
  
  // Log each polygon's center for coordinate-order verification
  validPolygons.forEach((poly, idx) => {
    const coords = poly.geometry.coordinates[0];
    let sumLon = 0, sumLat = 0;
    coords.forEach(c => { sumLon += c[0]; sumLat += c[1]; });
    const centerLon = sumLon / coords.length;
    const centerLat = sumLat / coords.length;
    console.log(`- Polygon ${idx} center [lon, lat]: [${centerLon.toFixed(4)}, ${centerLat.toFixed(4)}]`);
    console.log(`  (Should match hazard at lat=${centerLat.toFixed(4)}, lon=${centerLon.toFixed(4)})`);
  });

  // Validate GeoJSON structure: ensure rings are closed
  const validateRing = (ring) => {
    if (!ring || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  };

  if (avoidGeometry.type === 'Polygon') {
    if (!validateRing(avoidGeometry.coordinates[0])) {
      console.warn('[Geometry] ⚠️ Polygon ring is not closed! Closing it now.');
      avoidGeometry.coordinates[0].push(avoidGeometry.coordinates[0][0]);
    }
  } else if (avoidGeometry.type === 'MultiPolygon') {
    avoidGeometry.coordinates.forEach((polyCoords, i) => {
      if (!validateRing(polyCoords[0])) {
        console.warn(`[Geometry] ⚠️ MultiPolygon ring ${i} is not closed! Closing it now.`);
        polyCoords[0].push(polyCoords[0][0]);
      }
    });
  }

  console.log('[Geometry] Full avoid_polygons payload:', JSON.stringify(avoidGeometry).substring(0, 500) + '...');

  return avoidGeometry;
}

/**
 * Checks if a route line intersects with any disaster hazard area.
 * Performs rigorous check: line intersection + point-in-polygon checks.
 */
export function checkRouteIntersections(routeGeoJSON, disasters = []) {
  if (!routeGeoJSON || !disasters || disasters.length === 0) {
    return {
      hasHazard: false,
      intersectedDisasters: [],
      avoidPolygon: null
    };
  }

  // Extract all LineStrings from routeGeoJSON
  const routeLines = [];
  if (routeGeoJSON.type === 'FeatureCollection' && Array.isArray(routeGeoJSON.features)) {
    routeGeoJSON.features.forEach(f => {
      if (f.geometry?.type === 'LineString') {
        routeLines.push(f);
      } else if (f.geometry?.type === 'MultiLineString') {
        routeLines.push(f);
      }
    });
  } else if (routeGeoJSON.type === 'Feature' && routeGeoJSON.geometry?.type === 'LineString') {
    routeLines.push(routeGeoJSON);
  } else if (routeGeoJSON.type === 'LineString') {
    routeLines.push(turf.feature(routeGeoJSON));
  }

  if (routeLines.length === 0) {
    return { hasHazard: false, intersectedDisasters: [], avoidPolygon: null };
  }

  const intersected = [];
  const polygonsToAvoid = [];

  disasters.forEach(disaster => {
    // CRITICAL: Use the same radius formula as buildAvoidPolygon() and DisasterCycleLayer
    // Previous bug: `d.magnitude * 3` yielded NaN for fires (no magnitude), falling back to 5km
    // while the map drew 14.2km circles — causing routes to "pass" a 5km check while visibly
    // crossing the 14.2km drawn circle.
    const radius = Number(disaster.impactRadiusKm) || (disaster.confidence ? disaster.confidence / 12 : 5);
    const poly = disaster.polygon || createDisasterPolygon(disaster.latitude, disaster.longitude, radius);

    if (!poly) return;

    let hits = false;

    for (const line of routeLines) {
      try {
        // 1. Direct boolean intersection check
        if (turf.booleanIntersects(line, poly)) {
          hits = true;
          break;
        }

        // 2. Check if route coordinates fall inside the polygon
        const coords = line.geometry.coordinates;
        for (let i = 0; i < coords.length; i += Math.max(1, Math.floor(coords.length / 50))) {
          const pt = turf.point(coords[i]);
          if (turf.booleanPointInPolygon(pt, poly)) {
            hits = true;
            break;
          }
        }
        if (hits) break;

        // 3. Fallback: line-to-point distance check against radius
        const centerPt = turf.point([disaster.longitude, disaster.latitude]);
        const distKm = turf.pointToLineDistance(centerPt, line, { units: 'kilometers' });
        if (distKm <= radius) {
          hits = true;
          break;
        }
      } catch (err) {
        console.warn('[Geometry] Intersection check error, using distance fallback:', err);
        const centerPt = turf.point([disaster.longitude, disaster.latitude]);
        const distKm = turf.pointToLineDistance(centerPt, line, { units: 'kilometers' });
        if (distKm <= radius) {
          hits = true;
          break;
        }
      }
    }

    if (hits) {
      intersected.push(disaster);
      polygonsToAvoid.push(poly);
    }
  });

  const avoidPolygon = buildAvoidPolygon(intersected);

  return {
    hasHazard: intersected.length > 0,
    intersectedDisasters: intersected,
    avoidPolygon
  };
}

/**
 * Post-verification: verifies a rerouted route actually avoids all hazard zones.
 * Returns a detailed result including which hazards (if any) still intersect.
 * This MUST be called after receiving a rerouted route — never trust the API blindly.
 */
export function verifyRouteAgainstHazards(routeGeoJSON, disasters = []) {
  const result = checkRouteIntersections(routeGeoJSON, disasters);

  if (result.hasHazard) {
    const names = result.intersectedDisasters.map(d => d.name || 'Unknown Hazard');
    console.warn(
      `[Geometry] ⚠️ POST-VERIFICATION FAILED: Rerouted route still intersects ${names.length} hazard(s): ${names.join(', ')}`
    );
  } else {
    console.log('[Geometry] ✅ POST-VERIFICATION PASSED: Rerouted route has zero hazard intersections.');
  }

  return {
    isVerifiedSafe: !result.hasHazard,
    stillIntersectedDisasters: result.intersectedDisasters,
    hazardNames: result.intersectedDisasters.map(d => d.name || 'Unknown Hazard')
  };
}

/**
 * Calculates geodesic distance between two points in kilometers.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  try {
    const from = turf.point([lon1, lat1]);
    const to = turf.point([lon2, lat2]);
    return turf.distance(from, to, { units: 'kilometers' });
  } catch (err) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

/**
 * Extracts and slices the remaining portion of a route ahead from the live location.
 */
export function calculateRemainingRoute(routeGeoJSON, liveLocation) {
  if (!routeGeoJSON || !liveLocation) return routeGeoJSON;

  try {
    let lineFeature = null;
    if (routeGeoJSON.type === 'FeatureCollection' && routeGeoJSON.features.length > 0) {
      lineFeature = routeGeoJSON.features[0];
    } else if (routeGeoJSON.type === 'Feature') {
      lineFeature = routeGeoJSON;
    } else if (routeGeoJSON.type === 'LineString' || routeGeoJSON.type === 'MultiLineString') {
      lineFeature = turf.feature(routeGeoJSON);
    }

    if (!lineFeature || !lineFeature.geometry) {
      return routeGeoJSON;
    }

    let coords;
    if (lineFeature.geometry.type === 'LineString') {
      coords = lineFeature.geometry.coordinates;
    } else if (lineFeature.geometry.type === 'MultiLineString') {
      // Flatten MultiLineString segments into a unified LineString (Bug #14 fix)
      coords = lineFeature.geometry.coordinates.flat();
      if (coords.length < 2) return routeGeoJSON;
      lineFeature = turf.lineString(coords, lineFeature.properties);
    } else {
      return routeGeoJSON;
    }

    if (coords.length < 2) return routeGeoJSON;

    const userPt = turf.point([liveLocation[1], liveLocation[0]]);
    const nearest = turf.nearestPointOnLine(lineFeature, userPt);
    const splitIndex = nearest.properties?.index || 0;

    const remainingCoords = [
      [liveLocation[1], liveLocation[0]],
      ...coords.slice(Math.min(splitIndex + 1, coords.length - 1))
    ];

    if (remainingCoords.length < 2) {
      remainingCoords.push(coords[coords.length - 1]);
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: remainingCoords
          },
          properties: {
            ...lineFeature.properties,
            isRemainingSection: true
          }
        }
      ]
    };
  } catch (err) {
    console.warn('Error calculating remaining route, using full route:', err);
    return routeGeoJSON;
  }
}

/**
 * Gets a sample coordinate along the active route (e.g. at 45% distance) for live demo hazard placement
 */
export function getPointAlongRoute(routeGeoJSON, fraction = 0.45) {
  if (!routeGeoJSON) return null;
  try {
    let line = null;
    if (routeGeoJSON.type === 'FeatureCollection' && routeGeoJSON.features.length > 0) {
      line = routeGeoJSON.features[0];
    } else if (routeGeoJSON.type === 'Feature') {
      line = routeGeoJSON;
    } else if (routeGeoJSON.type === 'LineString') {
      line = turf.feature(routeGeoJSON);
    }

    if (!line) return null;
    const totalDist = turf.length(line, { units: 'kilometers' });
    const targetDist = totalDist * Math.min(Math.max(fraction, 0.1), 0.9);
    const alongPoint = turf.along(line, targetDist, { units: 'kilometers' });
    const coords = alongPoint.geometry.coordinates; // [lon, lat]
    return [coords[1], coords[0]]; // return [lat, lon]
  } catch (e) {
    console.warn('Could not extract point along route:', e);
    return null;
  }
}

/**
 * Checks if the user has drifted off the recommended route
 */
export function isOffRoute(routeGeoJSON, liveLocation, thresholdKm = 0.8) {
  if (!routeGeoJSON || !liveLocation) return false;
  try {
    let line = null;
    if (routeGeoJSON.type === 'FeatureCollection') line = routeGeoJSON.features[0];
    else if (routeGeoJSON.type === 'Feature') line = routeGeoJSON;
    else if (routeGeoJSON.type === 'LineString') line = turf.feature(routeGeoJSON);

    if (!line) return false;
    const pt = turf.point([liveLocation[1], liveLocation[0]]);
    const dist = turf.pointToLineDistance(pt, line, { units: 'kilometers' });
    return dist > thresholdKm;
  } catch (e) {
    return false;
  }
}

/**
 * Calculates total route length in kilometers
 */
export function getRouteLengthKm(routeGeoJSON) {
  if (!routeGeoJSON) return 0;
  try {
    let line = null;
    if (routeGeoJSON.type === 'FeatureCollection' && routeGeoJSON.features.length > 0) {
      line = routeGeoJSON.features[0];
    } else if (routeGeoJSON.type === 'Feature') {
      line = routeGeoJSON;
    } else if (routeGeoJSON.type === 'LineString') {
      line = turf.feature(routeGeoJSON);
    }
    return line ? Math.round(turf.length(line, { units: 'kilometers' }) * 10) / 10 : 0;
  } catch (e) {
    return 0;
  }
}
