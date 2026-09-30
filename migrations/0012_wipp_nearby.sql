-- Nearby visibility: hashed opaque token only. No phone/email/user id in BLE payload.

CREATE TABLE IF NOT EXISTS wipp_nearby_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_nearby_sessions_profile
  ON wipp_nearby_sessions (profile_id, expires_at);

CREATE INDEX IF NOT EXISTS wipp_nearby_sessions_expires
  ON wipp_nearby_sessions (expires_at);
