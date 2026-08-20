const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base API Healthcheck
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    project: 'SpotRent - Peer-to-Peer Micro-Venue & Space Rental Platform',
    version: '1.0.0',
    documentation: '/api/auth/register, /api/auth/login, /api/auth/me'
  });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
