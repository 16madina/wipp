-- WIPP Touch: ephemeral share tokens (BLE + QR + code share the same invite)

CREATE TABLE IF NOT EXISTS wipp_touch_invites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  sender_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  receiver_id TEXT REFERENCES wipp_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS wipp_touch_invites_code
  ON wipp_touch_invites (code);

CREATE INDEX IF NOT EXISTS wipp_touch_invites_sender_status
  ON wipp_touch_invites (sender_id, status, expires_at);

CREATE INDEX IF NOT EXISTS wipp_touch_invites_active_expires
  ON wipp_touch_invites (status, expires_at)
  WHERE status = 'active';
