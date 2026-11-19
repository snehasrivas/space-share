const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { createOrder, verifyPayment, webhook } = require('../controllers/paymentController');

// Authenticated endpoints
router.post('/create-order', requireAuth, createOrder);
router.post('/verify', requireAuth, verifyPayment);

// Razorpay webhook — NO auth middleware; signature verified inside the handler
router.post('/webhook', webhook);

module.exports = router;
