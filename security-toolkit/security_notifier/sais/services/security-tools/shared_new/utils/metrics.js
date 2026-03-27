const promClient = require("prom-client");

// Setup default metrics (CPU, Memory, Event Loop Lag, etc.)
promClient.collectDefaultMetrics();

const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

function metricsMiddleware(req, res, next) {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on("finish", () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
  });
  next();
}

async function metricsEndpoint(req, res) {
  res.set("Content-Type", promClient.register.contentType);
  res.end(await promClient.register.metrics());
}

module.exports = { metricsMiddleware, metricsEndpoint, promClient };
