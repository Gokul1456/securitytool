require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const { loadSharedConfig } = require("./shared_new/config");
const { createLogger } = require("./shared_new/utils/logger");
const { getRedisClient } = require("./shared_new/utils/redis");
const { metricsMiddleware, metricsEndpoint } = require("./shared_new/utils/metrics");
const { createPool } = require("./shared_new/db/pool");

// Middlewares
const { requestContext } = require("./middlewares/requestContext");
const { buildRoutes } = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const config = loadSharedConfig(process.env);
  const logger = createLogger({ serviceName: "sais-core", level: config.LOG_LEVEL || (config.isProd ? "info" : "debug") });
  const pool = createPool(config.DATABASE_URL);

  const app = express();
  app.set("trust proxy", true);

  app.use(requestContext());
  app.use(metricsMiddleware);
  
  const redisClient = getRedisClient();
  
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : false,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Device-Id", "X-SAIS-Api-Key"],
      maxAge: 600,
    })
  );

  app.use(
    rateLimit({
      store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => `${req.ip}:${req.id || "unknown"}`
    })
  );

  app.get("/metrics", metricsEndpoint);

  app.get("/health", async (req, res) => {
    try {
      const db = await pool.query("select 1 as ok");
      res.json({ status: "ok", service: "sais-core", db: db.rows?.[0]?.ok === 1 ? "ok" : "unknown", requestId: req.id });
    } catch(e) {
      res.status(500).json({ status: "error", service: "sais-core", error: e.message });
    }
  });

  app.use("/auth", buildRoutes({ config, logger, pool }));
  app.use(errorHandler(logger));

  return { app, config, logger, pool };
}

module.exports = { createApp };
