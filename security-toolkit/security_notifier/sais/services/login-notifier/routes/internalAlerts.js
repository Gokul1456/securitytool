const express = require("express");
const router = express.Router();

const db = require("../db");
const emailService = require("../services/emailService");

router.post("/", async (req, res, next) => {
  try {
    const got = req.header("x-sais-internal-key");
    if (!got || got !== process.env.SAIS_INTERNAL_API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId, email, title, message, eventType = "SAIS_HIGH_RISK", riskScore = null, metadata = {} } = req.body || {};
    if (!userId || !title || !message) {
      return res.status(400).json({ error: "userId, title, message are required" });
    }

    const notif = await db.query(
      `insert into notifications (user_id, title, message, type, status, metadata)
       values ($1, $2, $3, 'security', 'unread', $4)
       returning *`,
      [userId, title, message, metadata]
    );

    await db.query(
      `insert into security_events (user_id, email, event_type, ip_address, device_info, location, metadata, risk_score)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        email || null,
        eventType,
        metadata.ipAddress || null,
        metadata.deviceKey || null,
        metadata.location || null,
        metadata,
        riskScore,
      ]
    );

    // Send the security email if an email address is provided (in the background)
    if (email) {
      const resolvedEventType = (eventType !== "SAIS_HIGH_RISK") ? eventType : (metadata.anomalies?.newLocation ? 'NEW_LOCATION_LOGIN' : 'NEW_IP_LOGIN');
      emailService.sendSecurityAlert({
        to: email,
        eventType: resolvedEventType,
        time: new Date().toLocaleString(),
        previousIp: metadata.previousIp || (metadata.anomalies ? "Unknown" : null),
        newIp: metadata.ipAddress || "Unknown",
        location: metadata.location || "Unknown Location"
      }).catch(err => console.error("Background email alert failed:", err));
    }

    res.json({ ok: true, notification: notif.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

