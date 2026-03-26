const express = require("express");
const { body } = require("express-validator");

const { requireJwt } = require("../shared/middlewares/jwtAuth");
const { requireSdkApiKey } = require("../shared/middlewares/sdkAuth");

const { ingestLoginTelemetry } = require("../controllers/telemetryController");
const { getRecentRiskEvents } = require("../controllers/adminController");

function buildRoutes(ctx) {
  const router = express.Router();

  router.get("/", (req, res) => res.json({ service: "SAIS Core", version: "1.0.0" }));

  // Compatibility endpoint for old/demo integrations
  router.post(
    "/analyze",
    requireSdkApiKey(),
    (req, res, next) => ingestLoginTelemetry(ctx, req, res, next)
  );

  // SDK / external apps call this to log login attempts centrally (mountable)
  router.post(
    "/telemetry/login",
    requireSdkApiKey(),
    body("userId").optional().isUUID(),
    body("ipAddress").optional().isString(),
    body("deviceKey").optional().isString().isLength({ min: 1, max: 200 }),
    body("deviceInfo").optional().isString().isLength({ max: 1000 }),
    body("location").optional().isString().isLength({ max: 200 }),
    body("failedAttempts").optional().isInt({ min: 0, max: 50 }),
    body("success").isBoolean(),
    (req, res, next) => ingestLoginTelemetry(ctx, req, res, next)
  );

  // Optional admin endpoints
  router.get("/admin/risk", requireJwt({ roles: ["admin"] }), (req, res, next) => getRecentRiskEvents(ctx, req, res, next));

  return router;
}

module.exports = { buildRoutes };

