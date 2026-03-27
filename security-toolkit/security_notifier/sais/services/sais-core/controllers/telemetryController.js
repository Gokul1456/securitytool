const { validationResult } = require("express-validator");

const { evaluateRisk } = require("../services/riskEngine");
const { dispatchHighRiskAlert } = require("../services/alertDispatcher");

async function ingestLoginTelemetry(ctx, req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid input", details: errors.array() });

    const { pool, config, logger } = ctx;
    const {
      userId = null,
      email = null,
      ipAddress = req.ip,
      deviceKey = req.header("x-device-id") || null,
      deviceInfo = req.body.deviceInfo || req.header("user-agent") || null,
      location = null,
      failedAttempts = 0,
      success = true,
      metadata = {},
    } = req.body || {};

    const risk = await evaluateRisk({
      pool,
      userId,
      ipAddress,
      userAgent: deviceInfo, // Pass user agent for heuristic detection
      deviceKey,
      location,
      failedAttempts,
      loginTime: new Date(),
    });

    await pool.query(
      `insert into login_events (user_id, email, event_type, success, ip_address, user_agent, device_key, location, risk_score, anomalies, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)`,
      [
        userId,
        email,
        "SDK_LOGIN_ATTEMPT",
        !!success,
        ipAddress || null,
        deviceInfo,
        deviceKey,
        location,
        risk.score,
        JSON.stringify(risk.factors || {}),
        JSON.stringify(metadata || {}),
      ]
    );

    if (risk.score > 50 && userId) {
      await dispatchHighRiskAlert({
        config,
        logger,
        payload: {
          userId,
          email,
          title: "High risk login attempt",
          message: "A login attempt was flagged as high risk by SAIS.",
          riskScore: risk.score,
          metadata: { ipAddress, deviceKey, location, failedAttempts, anomalies: risk.factors },
        },
      });
    }

    return res.json({ ok: true, riskScore: risk.score, factors: risk.factors });
  } catch (err) {
    next(err);
  }
}

module.exports = { ingestLoginTelemetry };

