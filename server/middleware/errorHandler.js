/**
 * Centralised error handler.
 *
 * Catches anything thrown or passed via next(err) in controllers.
 * Returns a consistent JSON error shape that the frontend can rely on.
 */

export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";

  // Log full error in development; sanitise in production
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${req.method} ${req.path}]`, err);
  } else {
    console.error(`[${req.method} ${req.path}] ${status}: ${message}`);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

/**
 * 404 handler — for routes that don't match anything.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
  });
}
