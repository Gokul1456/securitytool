-- Unified SAIS schema (single source of truth)
-- Includes: core auth/session tables + login telemetry + alerts + notifications + scan logs.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  phone_e164        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  roles             TEXT[] NOT NULL DEFAULT ARRAY['user']::text[],

  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_key    TEXT NOT NULL,
  user_agent    TEXT,
  first_seen_ip INET,
  last_seen_ip  INET,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, device_key)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_last_seen ON devices (user_id, last_seen_at DESC);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id           UUID REFERENCES devices(id) ON DELETE SET NULL,

  refresh_jti         UUID NOT NULL UNIQUE,
  refresh_token_hash  TEXT NOT NULL,

  ip_address          INET,
  user_agent          TEXT,

  suspicious          BOOLEAN NOT NULL DEFAULT FALSE,
  risk_score          INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,

  revoked_at          TIMESTAMPTZ,
  rotated_at          TIMESTAMPTZ,
  replaced_by_jti     UUID
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active
  ON sessions (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

-- Login events (telemetry) - Partitioned by range
CREATE TABLE IF NOT EXISTS login_events (
  id            UUID DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  device_id     UUID REFERENCES devices(id) ON DELETE SET NULL,
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,

  event_type    TEXT NOT NULL, -- LOGIN_SUCCESS | LOGIN_FAILED | SDK_LOGIN_ATTEMPT
  success       BOOLEAN NOT NULL,

  ip_address    INET,
  user_agent    TEXT,
  device_key    TEXT,
  location      TEXT,

  risk_score    INTEGER NOT NULL DEFAULT 0,
  anomalies     JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions for current and next month
CREATE TABLE IF NOT EXISTS login_events_y2026m03 PARTITION OF login_events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS login_events_y2026m04 PARTITION OF login_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX IF NOT EXISTS idx_login_events_user_created ON login_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_ip_created ON login_events (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_event_type ON login_events (event_type);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  device_id     UUID REFERENCES devices(id) ON DELETE SET NULL,

  severity      TEXT NOT NULL, -- LOW | MEDIUM | HIGH | CRITICAL
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  risk_score    INTEGER NOT NULL DEFAULT 0,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,

  status        TEXT NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  closed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status_created ON alerts (status, created_at DESC);

-- Notifications (used by Login Notifier + admin)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Security events (compat with Login Notifier) - Partitioned
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  device_info TEXT,
  location TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_vpn BOOLEAN,
  is_proxy BOOLEAN,
  risk_score NUMERIC,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions
CREATE TABLE IF NOT EXISTS security_events_y2026m03 PARTITION OF security_events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS security_events_y2026m04 PARTITION OF security_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX IF NOT EXISTS idx_security_events_user_created
  ON security_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events (event_type);

-- Scan logs
CREATE TABLE IF NOT EXISTS scan_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,

  filename      TEXT NOT NULL,
  sha256        TEXT,
  size_mb       NUMERIC,
  file_type     TEXT,
  status        TEXT NOT NULL,
  engine        TEXT,
  report        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_user_created ON scan_logs (user_id, created_at DESC);

