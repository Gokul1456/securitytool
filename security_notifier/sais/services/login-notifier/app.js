require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const cors = require("cors");
const { loadSharedConfig } = require("../shared/config");
const { metricsMiddleware, metricsEndpoint } = require("../shared/utils/metrics");
const { getRedisClient } = require("../shared/utils/redis");

const notificationRoutes = require("./routes/notifications");
const authDemoRoutes = require("./routes/authDemo");
const internalAlertsRoutes = require("./routes/internalAlerts");

const app = express();

// Trust proxy for correct IP when behind load balancers
app.set("trust proxy", true);

app.use(helmet());
const config = loadSharedConfig(process.env);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all in dev OR if * is explicitly in CORS_ORIGINS
      const allowAll = !config.isProd || config.corsOrigins.includes("*");
      if (!origin || allowAll || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // Block other origins
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use(metricsMiddleware);

const redisClient = getRedisClient();

app.use(
  rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
    windowMs: 60_000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.headers["x-request-id"] || req.id || "unknown"}`
  })
);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Login Notifier Toolkit" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "login-notifier" });
});

app.get("/metrics", metricsEndpoint);

app.use("/api/notifications", notificationRoutes);
app.use("/api/demo", authDemoRoutes);
app.use("/internal/alerts", internalAlertsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

module.exports = app;

