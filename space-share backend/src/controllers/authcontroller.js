const {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  verifyPassword,
  findUserByResetToken
} = require('../data/user');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken
} = require('../services/tokenServices');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Register a new user (Renter / Host)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, fullName, email, password, confirmPassword, role, phone, avatar, bio } = req.body;

    const userName = name || fullName;

    // Validation
    if (!userName || !email || !password) {
      return errorResponse(res, 400, 'Please provide full name, email, and password');
    }

    if (confirmPassword && password !== confirmPassword) {
      return errorResponse(res, 400, 'Passwords do not match');
    }

    if (password.length < 6) {
      return errorResponse(res, 400, 'Password must be at least 6 characters long');
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, 400, 'Please provide a valid email address');
    }

    const allowedRoles = ['renter', 'host', 'admin'];
    const userRole = role && allowedRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'renter';

    // Check existing user
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return errorResponse(res, 400, 'User with this email already exists');
    }

    // Create User
    const user = await createUser({
      name: userName,
      email,
      password,
      role: userRole,
      phone: phone || '',
      avatar: avatar || '',
      bio: bio || ''
    });

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Format response payload
    const userPayload = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      createdAt: user.createdAt
    };

    return successResponse(res, 201, 'User registered successfully', {
      user: userPayload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get tokens
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide email and password');
    }

    // Find user (include password for hashing check)
    const user = await findUserByEmail(email, true);
    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password credentials');
    }

    // Verify password
    const isMatch = await verifyPassword(user, password);
    if (!isMatch) {
      return errorResponse(res, 401, 'Invalid email or password credentials');
    }

    // Generate Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const userPayload = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      createdAt: user.createdAt
    };

    return successResponse(res, 200, 'User logged in successfully', {
      user: userPayload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return errorResponse(res, 404, 'User profile not found');
    }

    const userPayload = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      avatar: user.avatar || '',
      bio: user.bio || '',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return successResponse(res, 200, 'User profile retrieved', { user: userPayload });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update profile details
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar, bio } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (bio !== undefined) updateFields.bio = bio;

    const updatedUser = await updateUser(req.user.id, updateFields);
    if (!updatedUser) {
      return errorResponse(res, 404, 'User not found');
    }

    const userPayload = {
      id: updatedUser._id || updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone || '',
      avatar: updatedUser.avatar || '',
      bio: updatedUser.bio || '',
      updatedAt: updatedUser.updatedAt
    };

    return successResponse(res, 200, 'Profile updated successfully', { user: userPayload });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 400, 'Please provide current and new password');
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters long');
    }

    const user = await findUserByEmail(req.user.email, true);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const isMatch = await verifyPassword(user, currentPassword);
    if (!isMatch) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    await updateUser(req.user.id, { password: newPassword });

    return successResponse(res, 200, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, 400, 'Refresh token is required');
    }

    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return errorResponse(res, 401, 'Invalid or expired refresh token');
    }

    const user = await findUserById(decoded.id);
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return successResponse(res, 200, 'Access token refreshed successfully', {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout User / Session invalidation
 * @route   POST /api/auth/logout
 * @access  Private / Public
 */
const logout = async (req, res, next) => {
  try {
    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password (Initiate reset token)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 400, 'Please provide an email address');
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return errorResponse(res, 404, 'No user found with that email');
    }

    const { resetToken, resetPasswordToken, resetPasswordExpire } = generateResetToken();

    await updateUser(user._id || user.id, {
      resetPasswordToken,
      resetPasswordExpire
    });

    return successResponse(res, 200, 'Password reset token generated', {
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password using token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return errorResponse(res, 400, 'Please provide reset token and new password');
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 400, 'New password must be at least 6 characters long');
    }

    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await findUserByResetToken(hashedToken);
    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired reset token');
    }

    await updateUser(user._id || user.id, {
      password: newPassword,
      resetPasswordToken: undefined,
      resetPasswordExpire: undefined
    });

    return successResponse(res, 200, 'Password has been reset successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};
