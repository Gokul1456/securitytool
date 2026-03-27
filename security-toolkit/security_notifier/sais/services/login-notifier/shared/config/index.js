const { z } = require("zod");

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().positive().default(4000),
  SERVICE_NAME: z.string().default("service"),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default("sais"),
  JWT_AUDIENCE: z.string().default("sais-api"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  CORS_ORIGINS: z.string().default(""),

  LOG_LEVEL: z.string().default("info"),

  // Inter-service URLs (used by gateway / core when running in compose)
  SAIS_CORE_URL: z.string().default("http://sais-core:4001"),
  LOGIN_NOTIFIER_URL: z.string().default("http://login-notifier:4002"),
  SECURITY_TOOLS_URL: z.string().default("http://security-tools:4003"),

  // Shared auth between services
  SAIS_INTERNAL_API_KEY: z.string().min(16).default("changeme-in-prod"),

  // SDK keys (comma-separated). Used by external websites mounting SAIS SDK.
  SAIS_SDK_API_KEYS: z.string().default(""),

  REDIS_URL: z.string().default("redis://redis:6379"),
  SLACK_WEBHOOK_URL: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().optional(),
});

function parseCorsOrigins(corsOrigins) {
  return corsOrigins
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadSharedConfig(processEnv = process.env) {
  const parsed = baseEnvSchema.safeParse(processEnv);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${msg}`);
  }

  const cfg = parsed.data;
  return Object.freeze({
    ...cfg,
    isProd: cfg.NODE_ENV === "production",
    isTest: cfg.NODE_ENV === "test",
    corsOrigins: parseCorsOrigins(cfg.CORS_ORIGINS),
    sdkApiKeys: cfg.SAIS_SDK_API_KEYS.split(",").map((s) => s.trim()).filter(Boolean),
  });
}

module.exports = { loadSharedConfig };

