const { supabaseAnon, supabaseAdmin } = require('../config/config');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Register a new user
 * Uses supabaseAdmin.auth.admin.createUser with email_confirm: true, then signs in
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    // Validate role against user_role enum ('owner', 'renter', 'admin')
    const allowedRoles = ['owner', 'renter'];
    // Prevent self-registering as admin directly unless explicitly allowed or default to renter
    const userRole = role && allowedRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'renter';

    // Create user via admin API with email pre-confirmed
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        phone: phone || '',
        role: userRole,
      },
    });

    if (createError) {
      return errorResponse(res, createError.message, 400);
    }

    const newUser = createData.user;

    // Ensure profile row exists in profiles table
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', newUser.id)
      .maybeSingle();

    if (!existingProfile) {
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.id,
        email: newUser.email,
        full_name: full_name || '',
        phone: phone || '',
        role: userRole,
        updated_at: new Date().toISOString(),
      });
    }

    // Sign in the user to generate session and tokens
    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return successResponse(
        res,
        { user: newUser },
        'Account created successfully. Please log in.',
        201
      );
    }

    // Fetch the final profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', newUser.id)
      .maybeSingle();

    return successResponse(
      res,
      {
        session: sessionData.session,
        user: sessionData.user,
        profile: profile || null,
      },
      'User registered and authenticated successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Log in an existing user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return errorResponse(res, error.message, 401);
    }

    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    return successResponse(
      res,
      {
        session: data.session,
        user: data.user,
        profile: profile || null,
      },
      'Login successful'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user profile
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return errorResponse(res, 'Failed to fetch user profile', 500, error.message);
    }

    return successResponse(
      res,
      {
        user: req.user,
        profile: profile || null,
      },
      'User profile fetched successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Update current user profile
 * SECURITY: Operates strictly on req.user.id, ignores any ID/role from req.body
 */
const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, phone, avatar_url, bio } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (bio !== undefined) updates.bio = bio;

    // Update in profiles table
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (profileError) {
      return errorResponse(res, 'Failed to update profile', 500, profileError.message);
    }

    // Also sync user_metadata in auth
    const metadataUpdates = {};
    if (full_name !== undefined) metadataUpdates.full_name = full_name;
    if (phone !== undefined) metadataUpdates.phone = phone;
    if (avatar_url !== undefined) metadataUpdates.avatar_url = avatar_url;

    if (Object.keys(metadataUpdates).length > 0) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...req.user.user_metadata,
          ...metadataUpdates,
        },
      });
    }

    return successResponse(
      res,
      { profile: updatedProfile },
      'Profile updated successfully'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  getMe,
  updateMe,
};
