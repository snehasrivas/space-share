const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');
const {
  submitVerification,
  getVerifications,
  reviewVerification,
  getVenueVerificationStatus,
} = require('../controllers/verificationController');

// Venue Owner submit verification
router.post(
  '/submit',
  requireAuth,
  upload.fields([
    { name: 'id_proof', maxCount: 1 },
    { name: 'address_proof', maxCount: 1 },
  ]),
  submitVerification
);

// Venue Owner get verification status
router.get('/venue/:venueId', requireAuth, getVenueVerificationStatus);

// Admin review endpoints
router.get('/', requireAuth, requireAdmin, getVerifications);
router.post('/:id/review', requireAuth, requireAdmin, reviewVerification);

module.exports = router;
