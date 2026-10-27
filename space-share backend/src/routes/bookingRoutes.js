const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const {
  createBooking,
  getMyBookings,
  getVenueOwnerBookings,
  cancelBooking,
} = require('../controllers/bookingController');

// Renter: create a booking
router.post('/', requireAuth, createBooking);

// Renter: get my bookings
router.get('/my-bookings', requireAuth, getMyBookings);

// Venue owner: get bookings for my venues
router.get('/venue-bookings', requireAuth, getVenueOwnerBookings);

// Cancel a booking (renter, venue owner, or admin)
router.post('/:id/cancel', requireAuth, cancelBooking);

module.exports = router;
