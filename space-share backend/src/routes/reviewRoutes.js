const express = require('express');
const router = express.Router({ mergeParams: true });
const { optionalAuth, requireAuth } = require('../middlewares/authMiddleware');
const {
  getVenueReviews,
  createVenueReview,
  addHostReply,
} = require('../controllers/reviewController');

// GET /api/venues/:id/reviews - Fetch ratings & reviews for a venue
router.get('/', getVenueReviews);

// POST /api/venues/:id/reviews - Submit review (open to signed-in users or verified guests)
router.post('/', optionalAuth, createVenueReview);

// POST /api/venues/:id/reviews/:reviewId/reply - Host response
router.post('/:reviewId/reply', requireAuth, addHostReply);

module.exports = router;
