const jwt = require("jsonwebtoken");

function requireInternalApiKey() {
  return (req, res, next) => {
    // Read the S2S token
    const s2sToken = req.header("x-sais-internal-token") || req.header("x-sais-internal-key");
    const secret = process.env.SAIS_INTERNAL_API_KEY || "changeme-in-prod";
    
    // Check if it's the raw key for backward compatibility
    if (s2sToken === secret) {
      return next();
    }

    // Allow SDK keys for direct demo bypass
    const sdkKey = req.header("x-sais-api-key");
    const allowedSdkKeys = (process.env.SAIS_SDK_API_KEYS || "").split(",");
    if (sdkKey && allowedSdkKeys.includes(sdkKey)) {
        return next();
    }
    
    if (!s2sToken) return res.status(401).json({ error: "Missing S2S auth" });

    // Validate if it's a signed JWT (HMAC)
    try {
      const payload = jwt.verify(s2sToken, secret, {
        issuer: "sais-gateway"
      });
      req.s2s = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid S2S auth" });
    }
  };
}

module.exports = { requireInternalApiKey };

