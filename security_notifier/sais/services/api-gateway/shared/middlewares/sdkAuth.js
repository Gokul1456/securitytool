function requireSdkApiKey({ allowEmptyInDev = true } = {}) {
  return (req, res, next) => {
    const key = req.header("x-sais-api-key");
    const raw = process.env.SAIS_SDK_API_KEYS || "";
    const keys = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!keys.length && (allowEmptyInDev && process.env.NODE_ENV !== "production")) {
      return next();
    }

    if (!key || !keys.includes(key)) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    next();
  };
}

module.exports = { requireSdkApiKey };

