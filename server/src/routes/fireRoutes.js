import express from 'express';
import { getFires } from '../services/fireService.js';

const router = express.Router();

/**
 * GET /api/fires
 * Proxies NASA FIRMS thermal hotspots or delivers high-fidelity local disaster feeds.
 */
router.get('/', async (req, res) => {
  try {
    const result = await getFires();
    res.json(result);
  } catch (err) {
    console.error('[FireRoutes] Error:', err);
    res.status(500).json({ error: 'Failed to fetch fire telemetry: ' + err.message });
  }
});

export default router;
