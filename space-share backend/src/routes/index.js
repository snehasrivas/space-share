const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const renterRoutes = require('./renterRoutes');

router.use('/auth', authRoutes);
router.use('/rent',renterRoutes)
module.exports = router;
