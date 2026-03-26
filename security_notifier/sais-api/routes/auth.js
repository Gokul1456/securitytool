/**
 * routes/auth.js
 * --------------
 * POST /auth/analyze
 *
 * Ultra-final polish:
 *   ✅ Task 3 — Uses ok() / fail() response helper throughout
 *   ✅ Task 5 — [INFO] / [WARN] / [ERROR] log-level tags on all console calls
 *   (Task 2 sensitive-field masking retained from previous pass)
 */

"use strict";

const express          = require("express");
const { analyzeLogin } = require("../services/authService");
const { ok, fail }     = require("../utils/response");

const router = express.Router();

// ─── Helper: mask sensitive fields before logging ─────────────────────────────
function maskBody(body = {}) {
  const safe = { ...body };
  if (safe.password !== undefined) safe.password = "***";
  if (safe.token    !== undefined) safe.token    = "***";
  if (safe.secret   !== undefined) safe.secret   = "***";
  if (safe.apiKey   !== undefined) safe.apiKey   = "***";
  return safe;
}

/**
 * POST /auth/analyze
 *
 * Body (JSON):
 * {
 *   newDevice        : boolean,
 *   newLocation      : boolean,
 *   failedAttempts   : number,
 *   oddTime          : boolean,
 *   impossibleTravel : boolean   (optional)
 *   knownThreat      : boolean   (optional)
 *   isVpnProxy       : boolean   (optional)
 * }
 *
 * Response envelope (via ok/fail helpers):
 * {
 *   success        : boolean,
 *   data: {
 *     riskScore      : number,
 *     alert          : boolean,
 *     factors        : object,
 *     alertThreshold : number
 *   }
 * }
 */
router.post("/analyze", async (req, res) => {
  const {
    newDevice,
    newLocation,
    failedAttempts,
    oddTime,
    impossibleTravel,
    knownThreat,
    isVpnProxy,
  } = req.body || {};

  // ── Input validation ──────────────────────────────────────────────────────
  const hasAnyField =
    newDevice      !== undefined ||
    newLocation    !== undefined ||
    failedAttempts !== undefined ||
    oddTime        !== undefined;

  if (!hasAnyField) {
    return fail(
      res,
      "Request body must include at least one of: newDevice, newLocation, failedAttempts, oddTime",
      400
    );
  }

  // Task 5: [INFO] tag + Task 2: sensitive fields masked
  console.log(`[${req.id}] [INFO]  [SAIS AUTH] Input:`, maskBody(req.body));

  try {
    const result = analyzeLogin({
      newDevice,
      newLocation,
      failedAttempts,
      oddTime,
      impossibleTravel,
      knownThreat,
      isVpnProxy,
    });

    // Task 5: [INFO] tag on result
    console.log(
      `[${req.id}] [INFO]  [SAIS AUTH] Risk Score: ${result.riskScore}/100 | ` +
      `Alert: ${result.alert ? "🚨 YES" : "✅ NO"}`
    );

    // Task 3: use ok() helper
    return ok(res, result);

  } catch (err) {
    // Task 5: [ERROR] tag
    console.error(`[${req.id}] [ERROR] [SAIS AUTH] ${err.message}`);
    return fail(res, "Internal analysis error", 500, { reason: err.message });
  }
});

module.exports = router;
