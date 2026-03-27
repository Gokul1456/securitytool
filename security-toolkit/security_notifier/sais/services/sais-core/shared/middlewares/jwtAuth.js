const jwt = require("jsonwebtoken");

function requireJwt({ roles = [] } = {}) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "Missing authorization token" });

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
        issuer: process.env.JWT_ISSUER || "sais",
        audience: process.env.JWT_AUDIENCE || "sais-api",
      });
      req.user = payload;

      if (roles.length) {
        const userRoles = Array.isArray(payload.roles) ? payload.roles : [];
        const ok = roles.some((r) => userRoles.includes(r));
        if (!ok) return res.status(403).json({ error: "Forbidden" });
      }

      return next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = { requireJwt };

