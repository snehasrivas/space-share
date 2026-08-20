const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

/**
 * Generate Access Token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      role: user.role
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRE }
  );
};

/**
 * Generate Refresh Token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email
    },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRE }
  );
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate Password Reset Token (random hex + hashed version)
 */
const generateResetToken = () => {
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return { resetToken, resetPasswordToken, resetPasswordExpire };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateResetToken
};
