-- Per-member chat preferences. Not message content.
-- muted_until NULL = not muted. infinity = always. A finite timestamp expires on its own.
-- manually_unread_at is a reminder. It does not change receipts.

ALTER TABLE wipp_chat_members ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE wipp_chat_members ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE wipp_chat_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;
ALTER TABLE wipp_chat_members ADD COLUMN IF NOT EXISTS manually_unread_at TIMESTAMPTZ;
