import express from 'express';

const router = express.Router();

const geocodeCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/geocode?q=query
 * Proxies Komoot Photon (OpenStreetMap) geocoding with in-memory caching.
 */
router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }

  const cleanQuery = query.trim().toLowerCase();
  
  // Check cache
  const cached = geocodeCache.get(cleanQuery);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return res.json(cached.data);
  }

  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8`;
    const photonRes = await fetch(photonUrl, {
      headers: { 'User-Agent': 'DisasterNav-Hackathon-App/1.0' },
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

        geocodeCache.set(cleanQuery, { data: results, timestamp: Date.now() });
        return res.json(results);
      }
    }
  } catch (err) {
    console.warn('[Geocode] Photon search error:', err.message);
  }

  return res.json([]);
});

export default router;
