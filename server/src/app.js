import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root: 2 levels up from server/src
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images');
const CLIENT_DIST_DIR = path.join(PROJECT_ROOT, 'client', 'dist');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static images (hotel photos)
app.use('/images', express.static(IMAGES_DIR));

// Mount REST API
app.use('/api', apiRouter);

// Serve compiled frontend if available
if (fs.existsSync(CLIENT_DIST_DIR)) {
  app.use(express.static(CLIENT_DIST_DIR));
  app.get('*', (req, res, next) => {
    // If request starts with /api or /images, skip to 404
    if (req.url.startsWith('/api') || req.url.startsWith('/images')) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
  });
} else {
  // Root greeting if client not compiled
  app.get('/', (req, res) => {
    res.json({
      message: 'TravelMate - Smart Group Travel Matcher API',
      version: '1.0.0',
      documentation: '/api/health'
    });
  });
}

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.url}`
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

export default app;
