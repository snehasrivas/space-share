const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const venueRoutes = require('./venueRoutes');
const verificationRoutes = require('./verificationRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const messageRoutes = require('./messageRoutes');
const notificationRoutes = require('./notificationRoutes');

// Mount feature routes
router.use('/auth', authRoutes);
router.use('/venues', venueRoutes);
router.use('/verifications', verificationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'space-share-backend',
  });
});

module.exports = router;
