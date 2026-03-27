require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { spawn } = require("child_process");
const path = require("path");

// Adjusted paths for local run via shared_new
const { loadSharedConfig } = require("./shared_new/config");
const { createLogger } = require("./shared_new/utils/logger");
const { getRedisClient } = require("./shared_new/utils/redis");
const { metricsMiddleware, metricsEndpoint } = require("./shared_new/utils/metrics");
const { requireInternalApiKey } = require("./shared_new/middlewares/auth");
const { runScanJobSync } = require("./scannerQueue");

const config = loadSharedConfig(process.env);
const logger = createLogger({ serviceName: "security-tools", level: config.LOG_LEVEL || (config.isProd ? "info" : "debug") });

const app = express();
app.set("trust proxy", true);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  req.id = req.header("x-request-id") || require("crypto").randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
});

app.use(metricsMiddleware);

const redisClient = getRedisClient();

app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : false, credentials: true }));
app.use(
  rateLimit({
    store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
    windowMs: 60_000, 
    limit: 120, 
    standardHeaders: true, 
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}:${req.id}`
  })
);

app.get("/metrics", metricsEndpoint);
app.get("/health", (req, res) => res.json({ status: "ok", service: "security-tools" }));

function runPython(scriptRel, args) {
  const python = process.env.PYTHON || config.PYTHON || "python";
  const script = path.join(__dirname, scriptRel);

  return new Promise((resolve, reject) => {
    const p = spawn(python, [script, ...args], { cwd: __dirname, env: process.env });
    let stdout = "";
    let stderr = "";
    p.stdout?.on("data", (d) => (stdout += d.toString()));
    p.stderr?.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(Object.assign(new Error(`scanner_failed:${code}`), { code, stdout, stderr }));
    });
  });
}

app.post("/web", requireInternalApiKey({ internalApiKey: config.SAIS_INTERNAL_API_KEY }), async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: "url is required" });
  try {
    const out = await runPython("scanner.py", ["--url", url]);
    res.json({ ok: true, output: out.stdout || out.stderr || "" });
  } catch (e) {
    logger.error("scan_web_failed", { message: e.message, stderr: e.stderr });
    res.status(500).json({ ok: false, error: "scan failed", details: e.stderr || e.stdout || e.message });
  }
});

app.post("/single", requireInternalApiKey({ internalApiKey: config.SAIS_INTERNAL_API_KEY }), async (req, res) => {
  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: "filename is required" });
  try {
    const out = await runScanJobSync(filename);
    res.json({ ok: true, output: out.stdout || out.stderr || "" });
  } catch (e) {
    logger.error("scan_single_failed", { message: e.message });
    res.status(500).json({ ok: false, error: "scan failed" });
  }
});

const port = Number(process.env.PORT || 4003);
app.listen(port, () => logger.info("security_tools_listening", { port, env: config.NODE_ENV }));
