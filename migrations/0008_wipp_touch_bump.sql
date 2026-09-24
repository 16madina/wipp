-- WIPP Touch bump arbitration (shock + RSSI candidates)

ALTER TABLE wipp_touch_invites
  ADD COLUMN IF NOT EXISTS shock_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arbitration TEXT NOT NULL DEFAULT 'waiting_shock',
  ADD COLUMN IF NOT EXISTS matched_profile_id TEXT REFERENCES wipp_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arbitration_log JSONB;

CREATE TABLE IF NOT EXISTS wipp_touch_candidates (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES wipp_touch_invites(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  rssi_samples JSONB NOT NULL DEFAULT '[]',
  median_rssi DOUBLE PRECISION,
  detected_at TIMESTAMPTZ NOT NULL,
  shock_at TIMESTAMPTZ,
  platform TEXT,
  foreground BOOLEAN NOT NULL DEFAULT false,
  channel TEXT NOT NULL DEFAULT 'ble',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invite_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_touch_candidates_invite
  ON wipp_touch_candidates (invite_id, detected_at);

CREATE TABLE IF NOT EXISTS wipp_touch_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO wipp_touch_config (key, value) VALUES
  ('bump', '{
    "shockGThreshold": 2.2,
    "shockMaxDurationMs": 120,
    "windowBeforeMs": 1500,
    "windowAfterMs": 1500,
    "windowAfterIosBgMs": 5000,
    "rssiMinDbm": -55,
    "rssiGapDb": 8,
    "calibrationLog": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
