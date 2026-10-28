const { supabaseAnon, supabaseAdmin } = require('../config/config');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Middleware to verify Supabase JWT in Authorization header
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token missing or invalid format', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Authentication token not provided', 401);
    }

    // Verify token using Supabase Anon client
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !authData.user) {
      return errorResponse(res, 'Unauthorized: Invalid or expired token', 401, authError?.message);
    }

    const user = authData.user;

    // Fetch user profile from database to get up-to-date role and details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    user.profile = profile || null;
    user.role = profile?.role || user.user_metadata?.role || 'renter';

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 'Authentication error', 500, err.message);
  }
};

/**
 * Middleware to restrict access to Admins only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required', 401);
  }

  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Forbidden: Admin privileges required', 403);
  }

  next();
};

/**
 * Middleware that extracts user if Bearer token is provided, but does not block if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const { data: authData } = await supabaseAnon.auth.getUser(token);
        if (authData?.user) {
          const user = authData.user;
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          user.profile = profile || null;
          user.role = profile?.role || user.user_metadata?.role || 'renter';
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Silently continue for optional auth
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
};

