-- Push tokens + call invites (signaling for LiveKit A/V)

CREATE TABLE IF NOT EXISTS wipp_push_tokens (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  kind TEXT NOT NULL DEFAULT 'expo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, token)
);

CREATE INDEX IF NOT EXISTS wipp_push_tokens_profile
  ON wipp_push_tokens (profile_id);

CREATE TABLE IF NOT EXISTS wipp_call_invites (
  id TEXT PRIMARY KEY,
  caller_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  callee_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'audio',
  room_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  answered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS wipp_call_invites_callee_status
  ON wipp_call_invites (callee_id, status, expires_at);

CREATE INDEX IF NOT EXISTS wipp_call_invites_caller
  ON wipp_call_invites (caller_id, status);
