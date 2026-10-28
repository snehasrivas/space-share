const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes/index');
const errorHandler = require('./middlewares/errorHandler');
const { errorResponse } = require('./utils/apiResponse');

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// HTTP request logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse incoming JSON with rawBody preservation for payment webhooks (HMAC verification)
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
    limit: '10mb',
  })
);

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount all API routes
app.use('/api', routes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    name: 'Space Share API',
    description: 'Platform for renting local spaces and venues for events and celebrations',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// Catch-all 404 handler for undefined routes
app.use((req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
