/**
 * server.js  — SAIS API  (Secure Access Intelligence System)
 * -----------------------------------------------------------
 * Ultra-final polish:
 *   ✅ Task 1 — X-Version header added to every response
 *   ✅ Task 4 — 404 handler using response helper
 *   ✅ Task 5 — [INFO] / [ERROR] / [WARN] log-level tags on all console calls
 */

"use strict";

require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const rateLimit = require("express-rate-limit");

const scanRoutes    = require("./routes/scan");
const authRoutes    = require("./routes/auth");
const { ok, fail }  = require("./utils/response");

const PORT    = Number(process.env.PORT    || 5000);
const VERSION = process.env.npm_package_version || "1.0.0";

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ─── Request ID ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  next();
});

// ─── Task 1: Branding + version headers (on every response) ──────────────────
app.use((req, res, next) => {
  res.setHeader("X-Service",    "SAIS API");
  res.setHeader("X-Version",    VERSION);       // ← Task 1
  res.setHeader("X-Request-Id", req.id);
  // Task 5: [INFO] level tag on inbound log
  console.log(`[${req.id}] [INFO]  --> ${req.method} ${req.url}`);
  next();
});

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs:        60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: "Too many requests. Please wait and try again." },
}));

// ─── Response logger ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    const level  = status >= 500 ? "[ERROR]" : status >= 400 ? "[WARN] " : "[INFO] ";
    const icon   = status >= 500 ? "❌" : status >= 400 ? "⚠️ " : "✅";
    // Task 5: level tag on response log
    console.log(`[${req.id}] ${level} ${icon} ${req.method} ${req.url} → ${status} (${ms}ms)`);
  });
  next();
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  return ok(res, {
    status:    "ok",
    service:   "SAIS API",
    version:   VERSION,
    uptime:    Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/scan", scanRoutes);
app.use("/auth", authRoutes);

// ─── Task 4: 404 handler (using response helper) ─────────────────────────────
app.use((req, res) => {
  console.log(`[${req.id}] [WARN]  Route not found: ${req.method} ${req.url}`);
  return fail(res, "Route not found", 404, {
    path:   req.url,
    method: req.method,
    hint:   "Available: GET /health | POST /scan/file | POST /auth/analyze",
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") {
    console.warn(`[${req.id}] [WARN]  File too large`);
    return fail(res, "File too large. Maximum allowed size is 10 MB.", 413);
  }
  console.error(`[${req.id}] [ERROR] Unhandled: ${err.message || err}`);
  return fail(res, err.message || "Internal server error", err.status || 500);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   SAIS — Secure Access Intelligence System          ║");
  console.log(`║   Listening on http://localhost:${PORT}                  ║`);
  console.log(`║   Version: ${VERSION.padEnd(43)}║`);
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║   POST /scan/file      → file malware scanner       ║");
  console.log("║   POST /auth/analyze   → login risk analysis        ║");
  console.log("║   GET  /health         → liveness probe             ║");
  console.log("╚══════════════════════════════════════════════════════╝");
});

function shutdown(signal) {
  console.log(`\n[SAIS] [INFO]  ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log("[SAIS] [INFO]  Server closed cleanly. Goodbye.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[SAIS] [ERROR] Forced exit after 5s timeout.");
    process.exit(1);
  }, 5000).unref();
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app;
