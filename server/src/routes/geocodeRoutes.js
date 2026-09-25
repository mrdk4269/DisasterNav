import express from 'express';
import { searchGeocode } from '../services/geocodeService.js';

const router = express.Router();

/**
 * GET /api/geocode?q=query
 * Proxies Photon / Komoot search with in-memory caching.
 */
router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    const results = await searchGeocode(query);
    res.json(results);
  } catch (err) {
    console.error('[GeocodeRoutes] Error:', err);
    res.status(500).json({ error: 'Geocoding failed: ' + err.message });
  }
});

export default router;
