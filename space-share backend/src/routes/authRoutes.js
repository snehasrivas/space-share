const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateMe } = require('../controllers/authcontroller');
const { requireAuth } = require('../middlewares/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.patch('/me', requireAuth, updateMe);

module.exports = router;
