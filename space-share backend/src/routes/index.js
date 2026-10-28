const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const venueRoutes = require('./venueRoutes');
const verificationRoutes = require('./verificationRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');

// Mount feature routes
router.use('/auth', authRoutes);
router.use('/venues', venueRoutes);
router.use('/verifications', verificationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'space-share-backend',
  });
});

module.exports = router;
