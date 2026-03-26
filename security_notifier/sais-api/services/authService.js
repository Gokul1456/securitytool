/**
 * services/authService.js
 * -----------------------
 * Wraps the existing riskEngine logic (sais-core/services/riskEngine.js).
 *
 * The riskEngine's `computeRiskScore` is a pure synchronous function that
 * accepts risk factors and returns a 0-100 score. We reuse it directly here
 * without touching the original file.
 *
 * The more advanced `evaluateRisk` variant requires a PostgreSQL pool which may
 * not be available in a simple demo setup, so we fall back to `computeRiskScore`
 * when the database is not configured.
 */

"use strict";

const path = require("path");

// Portable path for SAIS risk engine
const { computeRiskScore } = require("../external-core/riskEngine");

// Alert threshold: scores ≥ 60 are flagged as high-risk
const ALERT_THRESHOLD = 60;

/**
 * analyzeLogin(data)
 *
 * @param {object} data
 * @param {boolean} [data.newDevice=false]      – login from an unseen device
 * @param {boolean} [data.newLocation=false]    – login from an unseen location
 * @param {number}  [data.failedAttempts=0]     – recent failed login count
 * @param {boolean} [data.oddTime=false]        – login at an unusual hour
 * @param {boolean} [data.impossibleTravel=false] – physically impossible travel
 * @param {boolean} [data.knownThreat=false]    – IP flagged as known threat
 * @param {boolean} [data.isVpnProxy=false]     – IP is VPN / proxy
 *
 * @returns {{ riskScore: number, alert: boolean, factors: object }}
 */
function analyzeLogin({
  newDevice      = false,
  newLocation    = false,
  failedAttempts = 0,
  oddTime        = false,
  impossibleTravel = false,
  knownThreat    = false,
  isVpnProxy     = false,
} = {}) {
  // Map incoming API params to what computeRiskScore expects
  const factors = {
    isNewDevice:      Boolean(newDevice),
    isNewLocation:    Boolean(newLocation),
    failedAttempts:   Number(failedAttempts) || 0,
    suspiciousTiming: Boolean(oddTime),
    impossibleTravel: Boolean(impossibleTravel),
    knownThreat:      Boolean(knownThreat),
    isVpnProxy:       Boolean(isVpnProxy),
  };

  // Call the real scoring function from existing codebase
  const riskScore = computeRiskScore(factors);
  const alert     = riskScore >= ALERT_THRESHOLD;

  return {
    riskScore,
    alert,
    factors,              // expose contributing factors for debugging / dashboards
    alertThreshold: ALERT_THRESHOLD,
  };
}

module.exports = { analyzeLogin };
