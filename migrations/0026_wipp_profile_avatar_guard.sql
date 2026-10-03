-- The profile guard called auth.uid(). That casts the JWT sub to uuid.
-- A Firebase sub is not a uuid, so every avatar update failed with 22P02
-- after the Storage upload had already succeeded.
-- Server connections still have no end-user JWT and keep the previous bypass.
-- Immutable account fields stay locked for a signed-in member.

BEGIN;

CREATE OR REPLACE FUNCTION public.wipp_profiles_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  jwt_sub text := nullif(btrim(coalesce(auth.jwt()->>'sub', '')), '');
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR jwt_sub IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.username IS DISTINCT FROM OLD.username
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.firebase_uid IS DISTINCT FROM OLD.firebase_uid
     OR NEW.phone_e164 IS DISTINCT FROM OLD.phone_e164
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Champ non modifiable';
  END IF;
  RETURN NEW;
END $$;

UPDATE public.wipp_profiles p
SET avatar_url = latest.name
FROM (
  SELECT DISTINCT ON (split_part(o.name, '/', 2))
    split_part(o.name, '/', 2) AS profile_id,
    o.name
  FROM storage.objects o
  WHERE o.bucket_id = 'wipp-public-media'
    AND split_part(o.name, '/', 1) = 'business'
    AND split_part(o.name, '/', 3) LIKE 'avatar-%'
  ORDER BY split_part(o.name, '/', 2), o.created_at DESC
) latest
WHERE p.id = latest.profile_id
  AND p.avatar_url IS DISTINCT FROM latest.name;

COMMIT;
