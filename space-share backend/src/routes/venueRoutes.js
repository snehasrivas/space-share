const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const {
  getPublicVenues,
  getVenueById,
  createVenue,
  getMyVenues,
  updateVenue,
  deleteVenue,
  addVenueImage,
  deleteVenueImage,
  getVenueEventTypes,
  addVenueEventType,
  deleteVenueEventType,
  getVenueAvailability,
  addVenueAvailability,
  deleteVenueAvailability,
} = require('../controllers/venuecontroller');

// Public listing
router.get('/', getPublicVenues);

// Venues owned by current user (placed before /:id)
router.get('/my-venues', requireAuth, getMyVenues);

// Venue details (public if verified+active, or accessible by owner/admin)
router.get('/:id', optionalAuth, getVenueById);

// Venue CRUD
router.post('/', requireAuth, createVenue);
router.put('/:id', requireAuth, updateVenue);
router.patch('/:id', requireAuth, updateVenue);
router.delete('/:id', requireAuth, deleteVenue);

// Venue Images
router.post('/:id/images', requireAuth, upload.single('image'), addVenueImage);
router.delete('/:id/images/:imageId', requireAuth, deleteVenueImage);

// Event Types
router.get('/:id/event-types', getVenueEventTypes);
router.post('/:id/event-types', requireAuth, addVenueEventType);
router.delete('/:id/event-types/:eventTypeId', requireAuth, deleteVenueEventType);

// Availability
router.get('/:id/availability', getVenueAvailability);
router.post('/:id/availability', requireAuth, addVenueAvailability);
router.delete('/:id/availability/:availabilityId', requireAuth, deleteVenueAvailability);

module.exports = router;
