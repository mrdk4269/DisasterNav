import express from 'express';
import cors from 'cors';
import { config } from './src/config/index.js';

// Route Handlers
import earthquakeRoutes from './src/routes/earthquakeRoutes.js';
import fireRoutes from './src/routes/fireRoutes.js';
import geocodeRoutes from './src/routes/geocodeRoutes.js';
import routingRoutes from './src/routes/routingRoutes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DisasterNav Backend Proxy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount API Routers
app.use('/api/earthquakes', earthquakeRoutes);
app.use('/api/fires', fireRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/route', routingRoutes);

// Start Server
app.listen(config.PORT, () => {
  console.log(`[DisasterNav Backend] Listening on http://localhost:${config.PORT}`);
  console.log(`[DisasterNav Backend] Endpoints mounted:`);
  console.log(`  - GET  /api/health`);
  console.log(`  - GET  /api/earthquakes`);
  console.log(`  - GET  /api/fires`);
  console.log(`  - GET  /api/geocode?q=:query`);
  console.log(`  - POST /api/route`);
});

export default app;
