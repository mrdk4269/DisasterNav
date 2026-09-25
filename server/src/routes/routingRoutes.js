import express from 'express';
import { calculateRoute } from '../services/routingService.js';

const router = express.Router();

/**
 * POST /api/route
 * Calculates vehicle driving route, optionally avoiding hazard polygons.
 * Payload: { start: [lon, lat], end: [lon, lat], avoid_polygons?: GeoJSON }
 */
router.post('/', async (req, res) => {
  try {
    const { start, end, avoid_polygons } = req.body;
    if (!start || !end || start.length !== 2 || end.length !== 2) {
      return res.status(400).json({ error: 'Valid start [lon, lat] and end [lon, lat] coordinates required' });
    }

    const routeResult = await calculateRoute(start, end, avoid_polygons);
    res.json(routeResult);
  } catch (err) {
    console.error('[RoutingRoutes] Routing error:', err.message);
    const statusCode = err.message.includes('No route found') ? 404 : 500;
    res.status(statusCode).json({ error: 'Routing failed: ' + err.message });
  }
});

export default router;
