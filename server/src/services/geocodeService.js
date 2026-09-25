import { getCached, setCached } from '../utils/cache.js';

/**
 * Geocoding search service proxying Photon / Komoot OpenStreetMap API.
 * Includes in-memory caching for query results.
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchGeocode(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();
  const cacheKey = `geocode_${cleanQuery.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8`;
    const photonRes = await fetch(photonUrl, {
      headers: { 'User-Agent': 'DisasterNav-Demo-App/1.0' },
      signal: AbortSignal.timeout(4000)
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (data.features && data.features.length > 0) {
        const results = data.features.map((f, idx) => {
          const p = f.properties || {};
          const name = p.name || p.city || p.state || cleanQuery;
          const parts = [p.name, p.street, p.city, p.state, p.country].filter(Boolean);
          const fullName = parts.length > 0 ? parts.join(', ') : name;
          return {
            id: `photon-${p.osm_id || idx}`,
            name: name,
            fullName: fullName,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            type: p.osm_value || 'place',
            class: p.osm_key || 'place'
          };
        });

        setCached(cacheKey, results);
        return results;
      }
    }
  } catch (err) {
    console.warn('[GeocodeService] Photon error:', err.message);
  }

  return [];
}
