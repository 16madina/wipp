-- Device pairing for web ↔ app concordance
CREATE TABLE IF NOT EXISTS wipp_link_codes (
  code TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  profile_id TEXT REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS wipp_link_codes_status
  ON wipp_link_codes (status, expires_at);

CREATE TABLE IF NOT EXISTS wipp_devices (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Web',
  kind TEXT NOT NULL DEFAULT 'web',
  session_token TEXT REFERENCES wipp_sessions(token) ON DELETE SET NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_devices_profile
  ON wipp_devices (profile_id);
