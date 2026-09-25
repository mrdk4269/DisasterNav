import express from 'express';
import { getEarthquakes } from '../services/earthquakeService.js';

const router = express.Router();

/**
 * GET /api/earthquakes
 * Fetches real-time M2.5+ earthquake alerts from USGS ShakeNet with 5-minute caching.
 */
router.get('/', async (req, res) => {
  try {
    const result = await getEarthquakes();
    res.json(result);
  } catch (err) {
    console.error('[EarthquakeRoutes] Error:', err);
    res.status(500).json({ error: 'Failed to fetch earthquakes: ' + err.message });
  }
});

export default router;
