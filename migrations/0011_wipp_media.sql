-- Ciphertext attachments, view-once claim, ephemeral metadata, sealed reports.
-- No filename, MIME, coordinates, or plaintext columns.

ALTER TABLE wipp_chats ADD COLUMN IF NOT EXISTS disappear_after_ms INTEGER;
ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS wipp_attachments (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES wipp_chats(id) ON DELETE CASCADE,
  message_id TEXT,
  owner_id TEXT NOT NULL REFERENCES wipp_profiles(id),
  state TEXT NOT NULL DEFAULT 'uploading',
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  view_once BOOLEAN NOT NULL DEFAULT false,
  chunk_count INTEGER NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wipp_attachment_chunks (
  attachment_id TEXT NOT NULL REFERENCES wipp_attachments(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  ciphertext_b64 TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (attachment_id, chunk_index)
);

ALTER TABLE wipp_moderation_flags ADD COLUMN IF NOT EXISTS sealed_payload TEXT;
ALTER TABLE wipp_moderation_flags ADD COLUMN IF NOT EXISTS chat_id TEXT;
ALTER TABLE wipp_moderation_flags ADD COLUMN IF NOT EXISTS message_id TEXT;
ALTER TABLE wipp_moderation_flags ADD COLUMN IF NOT EXISTS retain_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS wipp_moderation_access (
  id TEXT PRIMARY KEY,
  flag_id TEXT NOT NULL REFERENCES wipp_moderation_flags(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wipp_moderation_keys (
  id TEXT PRIMARY KEY,
  public_jwk TEXT NOT NULL,
  private_jwk TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wipp_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_attachment_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_moderation_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_moderation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_moderation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_blocks ENABLE ROW LEVEL SECURITY;
