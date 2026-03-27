const db = require("../db");
const geoip = require("geoip-lite");
const axios = require("axios");
const { sendNotification } = require("./notifier");
const emailService = require("./emailService");

async function lookupIpRisk(ip) {
  if (!ip) return { isVpn: null, isProxy: null, riskScore: null };

  try {
    const apiKey = process.env.IP_RISK_API_KEY;
    if (!apiKey) return { isVpn: null, isProxy: null, riskScore: null };

    const resp = await axios.get(`https://api.ipdata.co/${ip}`, {
      params: { "api-key": apiKey },
      timeout: 2000,
    });

    const data = resp.data || {};

    const isVpn =
      data.is_vpn ?? data.threat?.is_vpn ?? data.privacy?.vpn ?? false;
    const isProxy =
      data.is_proxy ?? data.threat?.is_proxy ?? data.privacy?.proxy ?? false;

    const riskScore = data.risk_score ?? data.threat?.score ?? null;

    return { isVpn: !!isVpn, isProxy: !!isProxy, riskScore };
  } catch (e) {
    console.error("lookupIpRisk error", e.message);
    return { isVpn: null, isProxy: null, riskScore: null };
  }
}

async function logSecurityEvent({
  userId,
  email,
  eventType,
  ip,
  device,
  location,
  metadata = {},
  notifyUser = true,
  isVpn = null,
  isProxy = null,
  riskScore = null,
}) {
  await db.query(
    `INSERT INTO security_events
      (user_id, email, event_type, ip_address, device_info, location, metadata, is_vpn, is_proxy, risk_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [userId, email, eventType, ip, device, location, metadata, isVpn, isProxy, riskScore]
  );

  if (notifyUser && userId) {
    const message = buildSecurityMessage({ eventType, ip, location, isVpn, isProxy });
    await sendNotification({
      userId,
      title: "Security Alert",
      message,
      type: "security",
      metadata: { eventType, ip, location, isVpn, isProxy, riskScore, ...metadata },
    });

    if (email) {
      // Find previous IP if available for NEW_IP_LOGIN or NEW_LOCATION_LOGIN
      let previousIp = null;
      if (eventType === 'NEW_IP_LOGIN' || eventType === 'NEW_LOCATION_LOGIN') {
        const last = await db.query(
          `SELECT ip_address FROM security_events WHERE user_id = $1 AND event_type = 'LOGIN_SUCCESS' ORDER BY created_at DESC LIMIT 1`,
          [userId]
        );
        previousIp = last.rows[0]?.ip_address || "Unknown";
      }

      await emailService.sendSecurityAlert({
        to: email,
        eventType,
        time: new Date().toLocaleString(),
        previousIp,
        newIp: ip,
        location: location || "Unknown Location"
      });
    }
  }
}

function buildSecurityMessage({ eventType, ip, location, isVpn, isProxy }) {
  const loc = location || ip || "an unknown location";
  const viaVpn = isVpn || isProxy ? " (connection appears to be via VPN/proxy)" : "";

  switch (eventType) {
    case "NEW_IP_LOGIN":
      return `New login detected from IP: ${ip}. Location: ${loc}${viaVpn}. If this wasn't you, please secure your account.`;
    case "NEW_LOCATION_LOGIN":
      return `Login detected from a new location: ${loc}${viaVpn}. If this wasn't you, please secure your account.`;
    case "NEW_DEVICE_LOGIN":
      return `New device login detected from ${loc}${viaVpn}. If this wasn't you, please secure your account.`;
    case "MULTIPLE_FAILED_LOGINS":
      return `Multiple failed login attempts were detected on your account from ${loc}${viaVpn}. Your account may be under attack.`;
    case "ACCOUNT_LOCKED":
      return `Your account has been temporarily locked due to suspicious activity${viaVpn}. Please follow the recovery steps.`;
    case "VPN_LOGIN":
      return `Login detected from ${loc} via a VPN/proxy connection. If this wasn't you, please secure your account.`;
    default:
      return `Suspicious activity detected on your account from ${loc}${viaVpn}.`;
  }
}

async function handleSuccessfulLoginSecurity({ userId, email, ip, userAgent }) {
  const { location } = resolveLocation(ip);
  const { isVpn, isProxy, riskScore } = await lookupIpRisk(ip);

  if (isVpn || isProxy) {
    await logSecurityEvent({
      userId,
      email,
      eventType: "VPN_LOGIN",
      ip,
      device: userAgent,
      location,
      isVpn,
      isProxy,
      riskScore,
    });
  }

  const existing = await findUserDevice({
    userId,
    ip,
    device: userAgent,
    location,
  });

  if (!existing) {
    await db.query(
      `INSERT INTO user_devices
        (user_id, ip_address, device_info, location)
       VALUES ($1, $2, $3, $4)`,
      [userId, ip, userAgent, location]
    );

    await logSecurityEvent({
      userId,
      email,
      eventType: "NEW_DEVICE_LOGIN",
      ip,
      device: userAgent,
      location,
      isVpn,
      isProxy,
      riskScore,
    });

    await logSecurityEvent({
      userId,
      email,
      eventType: "NEW_IP_LOGIN",
      ip,
      device: userAgent,
      location,
      notifyUser: false,
      isVpn,
      isProxy,
      riskScore,
    });
  } else {
    await db.query(`UPDATE user_devices SET last_seen_at = NOW() WHERE id = $1`, [
      existing.id,
    ]);
  }

  const lastLogin = await db.query(
    `SELECT location, created_at
       FROM security_events
      WHERE user_id = $1 AND event_type = 'LOGIN_SUCCESS'
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  );

  const prev = lastLogin.rows[0];
  const prevLoc = prev?.location || null;

  if (prevLoc && location && prevLoc !== location) {
    await logSecurityEvent({
      userId,
      email,
      eventType: "NEW_LOCATION_LOGIN",
      ip,
      device: userAgent,
      location,
      isVpn,
      isProxy,
      riskScore,
    });
  }

  await logSecurityEvent({
    userId,
    email,
    eventType: "LOGIN_SUCCESS",
    ip,
    device: userAgent,
    location,
    notifyUser: false,
    isVpn,
    isProxy,
    riskScore,
  });
}

async function handleFailedLoginSecurity({
  userId,
  ip,
  userAgent,
  failedCountForThisUser,
}) {
  const { location } = resolveLocation(ip);
  const { isVpn, isProxy, riskScore } = await lookupIpRisk(ip);

  await logSecurityEvent({
    userId,
    eventType: "LOGIN_FAILED",
    ip,
    device: userAgent,
    location,
    notifyUser: false,
    isVpn,
    isProxy,
    riskScore,
  });

  if (failedCountForThisUser >= 5 && userId) {
    await logSecurityEvent({
      userId,
      email: null, // We might not know the email for a failed login attempt yet
      eventType: "MULTIPLE_FAILED_LOGINS",
      ip,
      device: userAgent,
      location,
      isVpn,
      isProxy,
      riskScore,
    });
  }
}

function resolveLocation(ip) {
  const geo = geoip.lookup(ip);
  if (!geo) return { location: null };
  const parts = [geo.city, geo.country].filter(Boolean);
  return { location: parts.join(", ") || null };
}

async function findUserDevice({ userId, ip, device, location }) {
  const result = await db.query(
    `SELECT *
       FROM user_devices
      WHERE user_id = $1
        AND ip_address = $2
        AND device_info = $3
        AND COALESCE(location, '') = COALESCE($4, '')
      LIMIT 1`,
    [userId, ip, device, location]
  );

  return result.rows[0] || null;
}

module.exports = {
  logSecurityEvent,
  handleSuccessfulLoginSecurity,
  handleFailedLoginSecurity,
};

