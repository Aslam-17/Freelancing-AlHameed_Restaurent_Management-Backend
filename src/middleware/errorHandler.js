// src/middleware/errorHandler.js
// ─────────────────────────────────────────────────────────────
// Centralised Express error-handling middleware.
// Must be registered LAST in server.js (after all routes).
// ─────────────────────────────────────────────────────────────

/**
 * Global error handler.
 * Normalises Mongoose validation errors, duplicate-key errors,
 * and cast errors into clean JSON responses.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // ── Mongoose: document not found (CastError on invalid ObjectId) ──
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message    = `Resource not found. Invalid ID: ${err.value}`;
  }

  // ── Mongoose: unique-key constraint violation ──
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    statusCode  = 409;
    message     = `Duplicate value: '${err.keyValue[field]}' already exists for field '${field}'.`;
  }

  // ── Mongoose: validation errors ──
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message    = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // ── JWT errors (backup — should usually be caught in verifyToken) ──
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 403;
    message    = 'Token has expired.';
  }

  // Log stack in development only
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler — catches requests that reach no route.
 * Register this BEFORE errorHandler in server.js.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
