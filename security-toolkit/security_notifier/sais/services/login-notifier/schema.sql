-- Login Notifier toolkit schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT, -- User email for notifications
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

CREATE TABLE IF NOT EXISTS security_events_y2026m03 PARTITION OF security_events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS security_events_y2026m04 PARTITION OF security_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX IF NOT EXISTS idx_security_events_user_created
    ON security_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events (event_type);

CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ip_address TEXT,
    device_info TEXT,
    location TEXT,
    first_seen_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_user_created
    ON security_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_ip
    ON user_devices (user_id, ip_address);

