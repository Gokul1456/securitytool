const { getRedisClient } = require("../shared/utils/redis");

const WINDOW_MS = 15 * 60; // 15 minutes in seconds

function keyFor(userId, ip) {
  return `login_attempts:${userId || "anon"}:${ip || "unknown"}`;
}

async function recordFailedAttempt({ userId, ip }) {
  const redisClient = getRedisClient();
  const key = keyFor(userId, ip);

  // Increment the counter
  const count = await redisClient.incr(key);

  // If this is the first failure, set an expiration
  if (count === 1) {
    await redisClient.expire(key, WINDOW_MS);
  }

  return count;
}

async function resetAttempts({ userId, ip }) {
  const redisClient = getRedisClient();
  const key = keyFor(userId, ip);
  await redisClient.del(key);
}

// Standardized client IP detection (supports proxies)
function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  return req.ip;
}

module.exports = {
  recordFailedAttempt,
  resetAttempts,
  getClientIp,
};

