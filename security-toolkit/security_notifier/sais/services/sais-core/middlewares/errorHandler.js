function errorHandler(logger) {
  return (err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    const code = err.code || "INTERNAL_ERROR";
    const message = status >= 500 ? "Internal server error" : err.message;

    logger.error("request_error", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status,
      code,
      err: { message: err.message, stack: err.stack },
    });

    res.status(status).json({ error: message, code, requestId: req.id });
  };
}

module.exports = { errorHandler };

