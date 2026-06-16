// src/middleware/auth.js
// ─────────────────────────────────────────────────────────────
// Authentication & authorisation middleware.
//
//  verifyToken  — validates the JWT from the Authorization header
//  requireAdmin — gate-keeps routes to Admin role only
// ─────────────────────────────────────────────────────────────
const jwt = require('jsonwebtoken');

/**
 * verifyToken
 * ──────────────────────────────────────────────────────────────
 * Expects the request to carry a Bearer token in the header:
 *   Authorization: Bearer <token>
 *
 * On success  : attaches the decoded payload to `req.user` and calls next().
 * On failure  : responds with 401 (missing / invalid) or 403 (expired).
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Must be present and start with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1]; // extract the raw token string

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

/**
 * requireAdmin
 * ──────────────────────────────────────────────────────────────
 * Must be chained AFTER verifyToken in the route definition.
 * Checks that the decoded token carries the 'Admin' role.
 *
 * Usage:
 *   router.post('/register', verifyToken, requireAdmin, authController.register);
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};

module.exports = { verifyToken, requireAdmin };
