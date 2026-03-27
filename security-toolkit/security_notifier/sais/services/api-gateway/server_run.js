require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");

const { loadSharedConfig } = require("./shared_new/config");
const { createLogger } = require("./shared_new/utils/logger");
const { getRedisClient } = require("./shared_new/utils/redis");
const { metricsMiddleware, metricsEndpoint } = require("./shared_new/utils/metrics");

const config = loadSharedConfig(process.env);
const logger = createLogger({ serviceName: "api-gateway", level: config.LOG_LEVEL || (config.isProd ? "info" : "debug") });

const app = express();
app.set("trust proxy", true);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : false,
    credentials: true,
  })
);
app.use((req, res, next) => {
  req.id = req.header("x-request-id") || require("crypto").randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
});

app.use(metricsMiddleware);

const redisClient = getRedisClient();

app.use(
  rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
    windowMs: 60_000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.id}`, // Custom rate limiting per IP + User 
  })
);

app.get("/metrics", metricsEndpoint);
app.get("/health", async (req, res) => res.json({ status: "ok", service: "api-gateway" }));

// Helper to build a proxy with optional path rewriting
function mkProxy(target, pathPrefix, keepPrefix = false) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    logLevel: "silent",
    pathRewrite: keepPrefix
      ? undefined // keep path as-is
      : (path) => path.replace(new RegExp(`^${pathPrefix}`), ""),
    onProxyReq: (proxyReq, req, res) => {
      if (req.id) proxyReq.setHeader("x-request-id", req.id);
      const sdkKeys = (config.SAIS_SDK_API_KEYS || "").split(",");
      const clientKey = req.header("x-sais-api-key");
      if (clientKey && sdkKeys.includes(clientKey)) {
        // Sign HMAC token
        const token = require("jsonwebtoken").sign(
          { service: "api-gateway", timestamp: Date.now() },
          config.SAIS_INTERNAL_API_KEY,
          { issuer: "sais-gateway", expiresIn: "1m" }
        );
        proxyReq.setHeader("x-sais-internal-token", token);
        // Fallback for backwards compatibility just in case
        proxyReq.setHeader("x-sais-internal-key", config.SAIS_INTERNAL_API_KEY);
      }
      if (req.body) {
        fixRequestBody(proxyReq, req);
      }
    },
    onError: (err, req, res) => {
      logger.error("proxy_error", { route: pathPrefix, err: { message: err.message } });
      res.status(502).json({ error: "Bad gateway" });
    },
  });
}

// Central routing
// sais-core mounts all routes under /auth, so we keep the /auth prefix when forwarding
app.use("/auth", mkProxy(config.SAIS_CORE_URL, "/auth", true));
app.use("/notify", mkProxy(config.LOGIN_NOTIFIER_URL, "/notify"));
app.use("/scan", mkProxy(config.SECURITY_TOOLS_URL, "/scan"));

const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => logger.info("api_gateway_listening", { port, env: config.NODE_ENV }));
