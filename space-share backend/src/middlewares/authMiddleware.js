const { verifyAccessToken } = require('../services/tokenServices');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect middleware: Ensures valid JWT token is provided in headers
 */
const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized, access token missing');
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return errorResponse(res, 401, 'Not authorized, token invalid or expired');
  }

  req.user = decoded;
  next();
};

/**
 * Role-Based Authorization middleware (e.g., authorize('host', 'admin'))
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route`
      );
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
