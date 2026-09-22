-- WIPP messaging core: profiles (@username), sessions, 1:1 chats, messages.
-- Applied by PGLite at startup and by scripts/migrate.mjs when DATABASE_URL is set.

CREATE TABLE IF NOT EXISTS wipp_profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wipp_profiles_username_lower
  ON wipp_profiles (lower(username));

CREATE TABLE IF NOT EXISTS wipp_sessions (
  token TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS wipp_sessions_profile
  ON wipp_sessions (profile_id);

CREATE TABLE IF NOT EXISTS wipp_chats (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wipp_chat_members (
  chat_id TEXT NOT NULL REFERENCES wipp_chats(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, profile_id)
);

CREATE INDEX IF NOT EXISTS wipp_chat_members_profile
  ON wipp_chat_members (profile_id);

CREATE TABLE IF NOT EXISTS wipp_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES wipp_chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES wipp_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wipp_messages_client_id
  ON wipp_messages (chat_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS wipp_messages_chat_created
  ON wipp_messages (chat_id, created_at);
