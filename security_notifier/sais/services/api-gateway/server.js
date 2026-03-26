require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");

const path = require("path");

const { loadSharedConfig } = require(require.resolve("../shared/config"));
const { createLogger } = require(require.resolve("../shared/utils/logger"));
const { getRedisClient } = require(require.resolve("../shared/utils/redis"));
const { metricsMiddleware, metricsEndpoint } = require(require.resolve("../shared/utils/metrics"));

const config = loadSharedConfig(process.env);
const logger = createLogger({ serviceName: "api-gateway", level: config.LOG_LEVEL || (config.isProd ? "info" : "debug") });

const app = express();
app.set("trust proxy", true);
app.use(helmet());

// Only parse JSON body for internal gateway routes to avoid proxy hangs
const jsonParser = express.json({ limit: "1mb" });

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all in dev OR if * is explicitly in CORS_ORIGINS
      const allowAll = !config.isProd || config.corsOrigins.includes("*");
      if (!origin || allowAll || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn("cors_rejected", { origin });
        callback(null, false); // Block other origins
      }
    },
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
    keyGenerator: (req) => `${req.ip}:${req.id}`, 
  })
);

app.get("/metrics", metricsEndpoint);
app.get("/health", async (req, res) => res.json({ status: "ok", service: "api-gateway" }));
app.get("/sais/dashboard", jsonParser, async (req, res) => {
    if (process.env.SAIS_ENABLED === 'false') return res.send("<h1>🛡️ SAIS is Disabled</h1>");
    
    try {
        // Fetch raw metrics from local components mapping
        const response = await fetch(`http://localhost:${port}/metrics`);
        const metrics = await response.text();
        
        res.send(`
            <html>
                <head>
                <title>SAIS Security Dashboard</title>
                <style>
                    body { font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 2rem; }
                    .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; }
                    pre { color: #38bdf8; overflow-x: auto; }
                    h1 { margin-bottom: 0.5rem; color: #e2e8f0; }
                </style>
                </head>
                <body>
                    <h1>🛡️ SAIS Operations Dashboard</h1>
                    <div class="card">
                        <h3>System Status: <span style="color:#22c55e">ONLINE</span></h3>
                        <p>Redis, PostgreSQL, ClamAV, and BullMQ queues are active layer components.</p>
                    </div>
                    <div class="card">
                        <h3>Live Platform API Gateway Metrics</h3>
                        <pre>${metrics}</pre>
                    </div>
                </body>
            </html>
        `);
    } catch(e) {
        res.status(500).send("Dashboard metrics unavailable: " + e.message);
    }
});

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
      const sdkKeys = config.sdkApiKeys || [];
      const clientKey = req.header("x-sais-api-key");
      
      if (clientKey && sdkKeys.includes(clientKey)) {
        logger.debug("proxy_sais_sdk_auth_success", { clientKey, route: req.path });
        // Sign HMAC token
        const token = require("jsonwebtoken").sign(
          { service: "api-gateway", timestamp: Date.now() },
          config.SAIS_INTERNAL_API_KEY,
          { issuer: "sais-gateway", expiresIn: "1m" }
        );
        proxyReq.setHeader("x-sais-internal-token", token);
        // Fallback for backwards compatibility just in case
        proxyReq.setHeader("x-sais-internal-key", config.SAIS_INTERNAL_API_KEY);
      } else {
        logger.warn("proxy_sais_sdk_auth_missing_or_invalid", { clientKey, route: req.path });
      }
    },
    onError: (err, req, res) => {
      logger.error("proxy_error", { route: pathPrefix, err: { message: err.message } });
      res.status(502).json({ error: "Bad gateway" });
    },
  });
}

// Central routing
// Manual Fetch Proxy for scan (solves body-streaming hangs in Docker)
app.post("/scan/*", jsonParser, async (req, res) => {
    const targetPath = req.path.replace(/^\/scan/, "");
    const targetUrl = `${config.SECURITY_TOOLS_URL}${targetPath}`;
    
    try {
        const clientKey = req.header("x-sais-api-key");
        const fetchRes = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-sais-api-key': clientKey || "",
                'x-request-id': req.id
            },
            body: JSON.stringify(req.body)
        });
        
        const data = await fetchRes.json();
        res.status(fetchRes.status).json(data);
    } catch (err) {
        logger.error("scan_proxy_fetch_failed", { url: targetUrl, error: err.message });
        res.status(502).json({ error: "Bad gateway (Fetch)" });
    }
});

// sais-core mounts all routes under /auth, so we keep the /auth prefix when forwarding
app.use("/auth", mkProxy(config.SAIS_CORE_URL, "/auth", true));
app.use("/notify", mkProxy(config.LOGIN_NOTIFIER_URL, "/notify"));

const port = Number(process.env.PORT || 4000);
app.listen(port, "0.0.0.0", () => logger.info("api_gateway_listening", { port, env: config.NODE_ENV }));
