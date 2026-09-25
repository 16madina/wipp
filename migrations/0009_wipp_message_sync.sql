-- Message sync: replies, edits, tombstones, hides, reactions, pins, receipts.
-- RLS on: the API connects as table owner (bypasses RLS). Direct Data API roles get no policies.

ALTER TABLE wipp_chats ADD COLUMN IF NOT EXISTS realtime_key TEXT;
UPDATE wipp_chats
SET realtime_key = id || '-' || floor(random() * 1000000000)::text
WHERE realtime_key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wipp_chats_realtime_key ON wipp_chats (realtime_key);

ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS reply_to TEXT;
ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE wipp_messages ADD COLUMN IF NOT EXISTS pinned_by TEXT;

CREATE TABLE IF NOT EXISTS wipp_reactions (
  message_id TEXT NOT NULL REFERENCES wipp_messages(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

CREATE TABLE IF NOT EXISTS wipp_message_hides (
  message_id TEXT NOT NULL REFERENCES wipp_messages(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

CREATE TABLE IF NOT EXISTS wipp_receipts (
  message_id TEXT NOT NULL REFERENCES wipp_messages(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, profile_id)
);

ALTER TABLE wipp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_message_hides ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE wipp_chat_members ENABLE ROW LEVEL SECURITY;
