const geoip = require("geoip-lite");

function isSuspiciousTiming(date = new Date()) {
  const h = date.getUTCHours();
  return h <= 5; // crude baseline: midnight-5am UTC
}

// Haversine formula for distance in KM
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function computeRiskScore({ isNewDevice, isNewLocation, failedAttempts = 0, suspiciousTiming = false, impossibleTravel = false, knownThreat = false, isVpnProxy = false }) {
  let score = 0;
  if (isNewDevice) score += 15;
  if (isNewLocation) score += 20;
  if (failedAttempts >= 3) score += 25;
  if (failedAttempts >= 10) score += 50; // Credential stuffing indicator
  if (suspiciousTiming) score += 10;
  if (impossibleTravel) score += 40;
  if (knownThreat) score += 60;
  if (isVpnProxy) score += 20;
  return Math.max(0, Math.min(100, score));
}

async function evaluateRisk({ pool, userId, ipAddress, userAgent, deviceKey, failedAttempts, loginTime = new Date(), isVpnProxy = false, knownThreat = false }) {
  let isNewDevice = false;
  let isNewLocation = false;
  let impossibleTravel = false;
  let location = "Unknown";
  let lat = null, lon = null;

  // Heuristic: Check User-Agent for Tor or suspicious proxies
  if (userAgent && (userAgent.toLowerCase().includes("tor") || userAgent.toLowerCase().includes("proxy"))) {
    isVpnProxy = true;
  }

  // Enhance location with GeoIP
  if (ipAddress) {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      location = [geo.city, geo.country].filter(Boolean).join(", ");
      if (geo.ll) {
        lat = geo.ll[0];
        lon = geo.ll[1];
      }
    }
  }

  if (userId && deviceKey) {
    const device = await pool.query(
      `select id from devices where user_id = $1 and device_key = $2 limit 1`,
      [userId, deviceKey]
    );
    isNewDevice = device.rowCount === 0;
  }

  if (userId && location !== "Unknown") {
    // Look back at the last successful login to check distance vs time
    const prev = await pool.query(
      `select location, ip_address, created_at
         from login_events
        where user_id = $1 and success = true and location is not null and location != 'Unknown'
        order by created_at desc
        limit 1`,
      [userId]
    );
    
    const prevRow = prev.rows?.[0];
    if (prevRow) {
      isNewLocation = prevRow.location !== location;
      
      if (lat && lon && prevRow.ip_address) {
        const prevGeo = geoip.lookup(prevRow.ip_address);
        if (prevGeo && prevGeo.ll) {
          const distKm = getDistance(prevGeo.ll[0], prevGeo.ll[1], lat, lon);
          const hoursDiff = Math.abs(loginTime.getTime() - new Date(prevRow.created_at).getTime()) / 3600000;
          
          if (distKm && hoursDiff > 0) {
            const speed_kmh = distKm / hoursDiff;
            // Impossible travel if > 900 km/h (speed of commercial airliner)
            if (speed_kmh > 900) {
              impossibleTravel = true;
            }
          }
        }
      }
    }
  }

  const suspiciousTiming = isSuspiciousTiming(loginTime);
  const score = computeRiskScore({ isNewDevice, isNewLocation, failedAttempts, suspiciousTiming, impossibleTravel, knownThreat, isVpnProxy });

  return {
    score,
    factors: { isNewDevice, isNewLocation, failedAttempts, suspiciousTiming, impossibleTravel, knownThreat, isVpnProxy },
    location
  };
}

module.exports = { computeRiskScore, evaluateRisk };

