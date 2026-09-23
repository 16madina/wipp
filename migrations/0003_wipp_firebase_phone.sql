-- Firebase Phone Auth bridge: link Firebase UID + phone to Wipp profiles
ALTER TABLE wipp_profiles
  ADD COLUMN IF NOT EXISTS firebase_uid TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS wipp_profiles_phone
  ON wipp_profiles (phone_e164)
  WHERE phone_e164 IS NOT NULL;
