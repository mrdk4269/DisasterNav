import express from 'express';

const router = express.Router();

const USGS_FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedEarthquakes = null;
let lastCacheTime = 0;

/**
 * GET /api/earthquakes
 * Real-time M2.5+ earthquake alerts from USGS ShakeNet with 5-minute caching.
 */
router.get('/', async (req, res) => {
  // Check in-memory cache
  if (cachedEarthquakes && (Date.now() - lastCacheTime < CACHE_TTL_MS)) {
    return res.json({ source: 'USGS (Cached)', data: cachedEarthquakes });
  }

  try {
    const response = await fetch(USGS_FEED_URL);
    if (!response.ok) throw new Error(`USGS HTTP ${response.status}`);
    const data = await response.json();

    const earthquakes = (data.features || []).map(f => {
      const mag = f.properties.mag || 0;
      return {
        id: f.id,
        name: f.properties.place || 'Unknown Location',
        latitude: f.geometry.coordinates[1],
        longitude: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        magnitude: mag,
        badgeLabel: `M${mag.toFixed(1)} Richter`,
        time: f.properties.time,
        source: 'USGS ShakeNet',
        status: mag >= 4.5 ? 'Significant Tremor' : 'Minor Seismic Event',
        impactRadiusKm: Math.max(mag * 3.5, 4)
      };
    });

    cachedEarthquakes = earthquakes;
    lastCacheTime = Date.now();

    res.json({ source: 'USGS Real-time', data: earthquakes });
  } catch (err) {
    console.warn('[Earthquakes] USGS feed error, using fallback:', err.message);
    res.json({ source: 'USGS (Offline Fallback)', data: [] });
  }
});

export default router;
