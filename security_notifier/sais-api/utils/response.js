/**
 * utils/response.js
 * -----------------
 * Centralised response helpers — keeps all route handlers lean and consistent.
 *
 * Every API response follows the same envelope:
 *   Success → { success: true,  data:  <payload> }
 *   Error   → { success: false, error: <message> }
 *
 * Usage:
 *   const { ok, fail } = require("../utils/response");
 *   return ok(res, { riskScore: 70, alert: true });
 *   return fail(res, "Scan timed out", 408);
 */

"use strict";

/**
 * ok(res, data, code)
 * Send a successful JSON response.
 *
 * @param {import("express").Response} res
 * @param {object|any}  data  – payload to place under the `data` key
 * @param {number}      code  – HTTP status code (default 200)
 */
function ok(res, data, code = 200) {
  return res.status(code).json({
    success: true,
    data,
  });
}

/**
 * fail(res, message, code, extra)
 * Send an error JSON response.
 *
 * @param {import("express").Response} res
 * @param {string}  message – human-readable error message
 * @param {number}  code    – HTTP status code (default 500)
 * @param {object}  extra   – optional extra fields merged into the response
 */
function fail(res, message, code = 500, extra = {}) {
  return res.status(code).json({
    success: false,
    error:   message,
    ...extra,
  });
}

module.exports = { ok, fail };
