function saisSdk(apiKey, opts = {}) {
  if (!apiKey) throw new Error("sais-sdk: API_KEY is required");

  const endpoint = (opts.endpoint || process.env.SAIS_GATEWAY_URL || "http://localhost:4000").replace(/\/+$/, "");
  const telemetryPath = opts.telemetryPath || "/auth/telemetry/login";

  return function middleware(req, res, next) {
    const startedAt = Date.now();

    res.on("finish", () => {
      const path = req.originalUrl || req.url || "";
      const method = req.method || "GET";

      const shouldLog =
        typeof opts.shouldLog === "function"
          ? !!opts.shouldLog(req, res)
          : method === "POST" && /login/i.test(path);

      if (!shouldLog) return;

      const userId = (req.user && (req.user.id || req.user.sub)) || (req.body && (req.body.userId || req.body.id)) || null;
      const email = (req.user && req.user.email) || (req.body && req.body.email) || null;
      const deviceKey = req.header("x-device-id") || null;
      const deviceInfo = req.header("user-agent") || null;
      const ipAddress = req.ip || null;
      const success = res.statusCode < 400;

      const body = {
        userId,
        email,
        ipAddress,
        deviceKey,
        deviceInfo,
        location: req.header("x-location") || null,
        failedAttempts: Number(req.header("x-failed-attempts") || 0) || 0,
        success,
        metadata: {
          path,
          method,
          statusCode: res.statusCode,
          latencyMs: Date.now() - startedAt,
          sdk: "sais-sdk@1.0.0",
        },
      };

      // fire-and-forget
      Promise.resolve()
        .then(() =>
          fetch(endpoint + telemetryPath, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-sais-api-key": apiKey,
            },
            body: JSON.stringify(body),
          })
        )
        .catch(() => {});
    });

    next();
  };
}

module.exports = saisSdk;

