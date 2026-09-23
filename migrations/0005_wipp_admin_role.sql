-- Admin role + moderation tables
ALTER TABLE wipp_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

UPDATE wipp_profiles SET role = 'admin' WHERE lower(username) = 'admin';

CREATE INDEX IF NOT EXISTS wipp_profiles_role
  ON wipp_profiles (role);

CREATE TABLE IF NOT EXISTS wipp_blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS wipp_blocks_blocked
  ON wipp_blocks (blocked_id);

CREATE TABLE IF NOT EXISTS wipp_moderation_flags (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL, -- user | message | chat
  target_id TEXT NOT NULL,
  reporter_id TEXT REFERENCES wipp_profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open', -- open | reviewed | dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wipp_moderation_flags_status
  ON wipp_moderation_flags (status, created_at DESC);
