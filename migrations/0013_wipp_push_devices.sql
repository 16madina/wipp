-- Lot 6: device push tokens (multi-install) + generic notify for WIPP Privé (killed-app redaction).
-- Does not store message plaintext. Does not identify a user by token alone.

ALTER TABLE wipp_push_tokens ADD COLUMN IF NOT EXISTS installation_id TEXT;
ALTER TABLE wipp_push_tokens ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS wipp_push_tokens_install
  ON wipp_push_tokens (profile_id, installation_id)
  WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS wipp_push_tokens_token
  ON wipp_push_tokens (token)
  WHERE disabled_at IS NULL;

-- Per-member: force generic push copy (no name / preview). Used for WIPP Privé.
ALTER TABLE wipp_chat_members ADD COLUMN IF NOT EXISTS generic_notify BOOLEAN NOT NULL DEFAULT false;
