const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { optionalAuth } = require('../middlewares/authMiddleware');

// Conversations & Chat Threads
router.get('/conversations', optionalAuth, messageController.getConversations);
router.get('/conversations/:id', optionalAuth, messageController.getConversation);
router.post('/messages', optionalAuth, messageController.sendMessage);

module.exports = router;
