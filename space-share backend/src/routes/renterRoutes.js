const express = require('express');
const router = express.Router();
const renterController = require('../controllers/renterController');
const {protect} = require('../middlewares/authMiddleware');
// Frontend search form submission endpoint
router.post('/search-lawns',protect,(req,res,next)=>{ renterController.userQuery(req,res,next)});

module.exports = router;