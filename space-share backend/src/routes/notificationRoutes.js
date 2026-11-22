const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { optionalAuth } = require('../middlewares/authMiddleware');

// Notifications
router.get('/', optionalAuth, messageController.getNotifications);
router.patch('/:id/read', optionalAuth, messageController.markNotificationRead);
router.post('/read-all', optionalAuth, messageController.markAllNotificationsRead);

module.exports = router;
