const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
} = require('../controllers/authcontroller');
const { protect } = require('../middlewares/authMiddleware');

// Public Auth Endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Auth Endpoints
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
