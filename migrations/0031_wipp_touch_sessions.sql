-- WIPP Touch without Bluetooth: ephemeral symmetric sessions matched on the server
-- from a physical "bump" (motion sensors) + optional UWB confirmation + mutual consent.
-- Server-only table: RLS on, no policy, no grant to anon/authenticated.

CREATE TABLE IF NOT EXISTS wipp_touch_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  caps JSONB NOT NULL DEFAULT '{}'::jsonb,
  state TEXT NOT NULL DEFAULT 'waiting' CHECK (state IN (
    'waiting', 'bumped', 'candidate', 'ambiguous', 'unavailable',
    'connected', 'already_connected', 'declined', 'expired', 'cancelled', 'failed'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  -- minimal bump signature (server-time ms), wiped when the session ends
  bump_at BIGINT,
  bump_peak REAL,
  bump_dur_ms INTEGER,
  bump_energy REAL,
  bump_count INTEGER NOT NULL DEFAULT 0,
  peer_session_id TEXT REFERENCES wipp_touch_sessions(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  -- UWB (Nearby Interaction) ephemeral exchange, wiped when the session ends
  uwb_token TEXT,
  uwb_distance_cm REAL,
  uwb_status TEXT CHECK (uwb_status IS NULL OR uwb_status IN ('pending', 'near', 'far', 'unavailable')),
  connection_id UUID,
  CHECK (bump_count <= 20)
);

CREATE INDEX IF NOT EXISTS wipp_touch_sessions_bumped
  ON wipp_touch_sessions (bump_at)
  WHERE state = 'bumped';

CREATE INDEX IF NOT EXISTS wipp_touch_sessions_profile
  ON wipp_touch_sessions (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wipp_touch_sessions_created
  ON wipp_touch_sessions (created_at);

ALTER TABLE wipp_touch_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wipp_touch_sessions FROM anon, authenticated;

INSERT INTO wipp_touch_config (key, value) VALUES
  ('session', '{
    "sessionTtlMs": 25000,
    "confirmTtlMs": 45000,
    "bumpWindowMs": 600,
    "minPeakG": 1.6,
    "peakRatioMax": 3.5,
    "durDiffMaxMs": 220,
    "maxRttMs": 2500,
    "uwbMaxCm": 30,
    "uwbTimeoutMs": 6000,
    "maxBumps": 12,
    "purgeAfterMs": 600000
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
