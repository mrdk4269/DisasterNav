import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route Handlers (Clean, self-contained endpoints for Hackathon demo)
import earthquakeRoutes from './routes/earthquakes.js';
import fireRoutes from './routes/fires.js';
import geocodeRoutes from './routes/geocode.js';
import routingRoutes from './routes/routing.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DisasterNav Backend Proxy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/earthquakes', earthquakeRoutes);
app.use('/api/fires', fireRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/route', routingRoutes);

// Global Error Handling Middleware (Bug #17 fix)
app.use((err, req, res, next) => {
  console.error('[DisasterNav Backend] Unhandled request error:', err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred'
  });
});

// Process-level crash guards
process.on('unhandledRejection', (reason, promise) => {
  console.error('[DisasterNav Backend] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[DisasterNav Backend] Uncaught Exception:', err);
});

app.listen(PORT, () => {
  console.log(`[DisasterNav Backend] Running at http://localhost:${PORT}`);
  console.log(`[DisasterNav Backend] Active Routes:`);
  console.log(`  - GET  /api/health`);
  console.log(`  - GET  /api/earthquakes`);
  console.log(`  - GET  /api/fires`);
  console.log(`  - GET  /api/geocode?q=:query`);
  console.log(`  - POST /api/route`);
});

export default app;
