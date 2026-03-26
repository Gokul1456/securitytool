const CircuitBreaker = require("opossum");
const jwt = require("jsonwebtoken");

const dispatchBreaker = new CircuitBreaker(async ({ config, logger, payload }) => {
  const url = `${config.LOGIN_NOTIFIER_URL.replace(/\/+$/, "")}/internal/alerts`;
  
  const token = jwt.sign(
    { service: "sais-core", timestamp: Date.now() },
    config.SAIS_INTERNAL_API_KEY,
    { issuer: "sais-gateway", expiresIn: "1m" }
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-sais-internal-key": config.SAIS_INTERNAL_API_KEY,
      "x-sais-internal-token": token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("alert_dispatch_failed", { status: res.status, body: text });
    const err = new Error(`Login Notifier rejected alert: ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  return res.json().catch(() => ({}));
}, {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000 
});

async function dispatchHighRiskAlert({ config, logger, payload }) {
  return dispatchBreaker.fire({ config, logger, payload });
}

module.exports = { dispatchHighRiskAlert };

