import { config } from '../config/index.js';
import { computeDetourWaypoint } from '../utils/geoUtils.js';

/**
 * Calculate vehicle driving route between start and end coordinates.
 * Supports avoidance of dynamic hazard zones via OpenRouteService (avoid_polygons),
 * and falls back seamlessly to OSRM with dynamic detour waypoint geometry calculation.
 * 
 * @param {[number, number]} start [lon, lat]
 * @param {[number, number]} end [lon, lat]
 * @param {object|null} avoid_polygons GeoJSON Polygon or MultiPolygon
 * @returns {Promise<{ provider: string, avoided: boolean, route: object, orsWarnings?: any }>}
 */
export async function calculateRoute(start, end, avoid_polygons = null) {
  // Coordinates validation
  if (!start || !end || start.length !== 2 || end.length !== 2) {
    throw new Error('Valid start [lon, lat] and end [lon, lat] coordinates required');
  }

  console.log('[RoutingService] Start [lon, lat]:', start, 'End [lon, lat]:', end);
  if (avoid_polygons) {
    console.log('[RoutingService] avoid_polygons type:', avoid_polygons.type);
    const sample = avoid_polygons.type === 'Polygon'
      ? avoid_polygons.coordinates?.[0]?.[0]
      : avoid_polygons.coordinates?.[0]?.[0]?.[0];
    console.log('[RoutingService] avoid_polygons sample coordinate [lon, lat]:', sample);
  }

  const orsKey = config.ORS_API_KEY;

  // 1. If ORS key is present and configured, attempt ORS directions with avoid_polygons
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
        console.log('[RoutingService] Sending to ORS with options.avoid_polygons');
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

        if (orsData.error) {
          console.error('[RoutingService] ORS returned error in response body:', JSON.stringify(orsData.error));
        }
        if (orsData.metadata?.engine?.warnings) {
          console.warn('[RoutingService] ORS engine warnings:', JSON.stringify(orsData.metadata.engine.warnings));
        }
        if (orsData.metadata?.query?.options) {
          console.log('[RoutingService] ORS confirmed options applied:', JSON.stringify(orsData.metadata.query.options));
        } else if (avoid_polygons) {
          console.warn('[RoutingService] ⚠️ ORS response metadata does not confirm avoid_polygons was applied!');
        }

        const featureCount = orsData.features?.length || 0;
        console.log(`[RoutingService] ORS returned ${featureCount} route feature(s)`);

        return {
          provider: 'OpenRouteService',
          avoided: !!avoid_polygons,
          orsWarnings: orsData.error || orsData.metadata?.engine?.warnings || null,
          route: orsData
        };
      } else {
        const errText = await orsRes.text();
        console.warn('[RoutingService] ORS API rejected request:', orsRes.status, errText);
      }
    } catch (orsErr) {
      console.warn('[RoutingService] ORS call failed, falling back to OSRM:', orsErr.message);
    }
  }

  // 2. Backup Router: OSRM public API with dynamic detour waypoint
  let coordinatesPath = `${start[0]},${start[1]};${end[0]},${end[1]}`;

  if (avoid_polygons && avoid_polygons.coordinates) {
    const detour = computeDetourWaypoint(start, end, avoid_polygons);
    if (detour) {
      coordinatesPath = `${start[0]},${start[1]};${detour.lon},${detour.lat};${end[0]},${end[1]}`;
      console.log(`[RoutingService] Computed detour waypoint at [lon, lat]: [${detour.lon}, ${detour.lat}] (offset: ${detour.offsetDeg.toFixed(3)} deg)`);
    }
  }

  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordinatesPath}?overview=full&geometries=geojson&steps=true`;
  const osrmRes = await fetch(osrmUrl, { headers: { 'User-Agent': 'DisasterNav/1.0' } });

  if (!osrmRes.ok) {
    throw new Error(`OSRM responded with status ${osrmRes.status}`);
  }

  const osrmData = await osrmRes.json();
  if (!osrmData.routes || osrmData.routes.length === 0) {
    throw new Error('No route found between coordinates');
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

  return {
    provider: 'OSRM / OpenStreetMap Engine',
    avoided: !!avoid_polygons,
    route: geojsonRoute
  };
}
