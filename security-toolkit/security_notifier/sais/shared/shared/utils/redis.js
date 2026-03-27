const Redis = require("ioredis");
const { loadSharedConfig } = require("../config");

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    const config = loadSharedConfig(process.env);
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });
    redisClient.on("error", (err) => console.error("Redis Client Error", err));
  }
  return redisClient;
}

module.exports = { getRedisClient };
