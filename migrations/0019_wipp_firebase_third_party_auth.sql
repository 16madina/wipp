-- Firebase Third-Party Auth compatibility. DRAFT. Do not execute from the app.
-- Does not edit 0018. Does not change public.wipp_my_profile_id().
-- Does not delete rows, recreate tables, rewrite profiles, or rewrite storage.objects metadata.
--
-- Identity after this file:
--   auth.jwt()->>'sub' -> public.wipp_profiles.firebase_uid -> public.wipp_profiles.id
-- Private and public media ownership:
--   storage.objects.owner_id = auth.jwt()->>'sub'
-- Business-card authorization is profile-folder based, so pre-Firebase objects
-- remain usable without rewriting storage.objects.owner_id.
-- The deprecated owner uuid column is not used.

BEGIN;

DO $$
DECLARE
  uid_type text;
  me_args text;
  me_returns text;
  me_definer boolean;
  policy_count integer;
BEGIN
  IF to_regprocedure('wipp_private.wipp_me()') IS NULL THEN
    RAISE EXCEPTION 'preflight: wipp_private.wipp_me() is missing';
  END IF;
  IF to_regprocedure('public.wipp_my_profile_id()') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.wipp_my_profile_id() is missing';
  END IF;
  IF to_regclass('public.wipp_profiles') IS NULL THEN
    RAISE EXCEPTION 'preflight: public.wipp_profiles is missing';
  END IF;

  SELECT c.data_type
    INTO uid_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'wipp_profiles'
    AND c.column_name = 'firebase_uid';
  IF uid_type IS NULL THEN
    RAISE EXCEPTION 'preflight: public.wipp_profiles.firebase_uid is missing';
  END IF;
  IF uid_type <> 'text' THEN
    RAISE EXCEPTION 'preflight: firebase_uid type is %, expected text', uid_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (i.indkey)
    WHERE n.nspname = 'public'
      AND t.relname = 'wipp_profiles'
      AND a.attname = 'firebase_uid'
      AND i.indisunique
      AND i.indnkeyatts = 1
  ) THEN
    RAISE EXCEPTION 'preflight: firebase_uid has no single-column unique index';
  END IF;

  SELECT pg_get_function_identity_arguments(p.oid),
         pg_catalog.format_type(p.prorettype, NULL),
         p.prosecdef
    INTO me_args, me_returns, me_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'wipp_private'
    AND p.proname = 'wipp_me'
    AND pg_get_function_identity_arguments(p.oid) = '';
  IF me_args IS NULL THEN
    RAISE EXCEPTION 'preflight: wipp_private.wipp_me() has unexpected arguments';
  END IF;
  IF me_returns IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'preflight: wipp_private.wipp_me() returns %, expected text', me_returns;
  END IF;
  IF NOT me_definer THEN
    RAISE EXCEPTION 'preflight: wipp_private.wipp_me() is not SECURITY DEFINER';
  END IF;

  IF to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'preflight: storage.objects is missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'storage'
      AND c.table_name = 'objects'
      AND c.column_name = 'owner_id'
  ) THEN
    RAISE EXCEPTION 'preflight: storage.objects.owner_id is missing';
  END IF;

  SELECT count(*)
    INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname IN (
      'wipp_private_update',
      'wipp_private_delete',
      'wipp_public_update',
      'wipp_public_delete',
      'wipp_cards_update',
      'wipp_cards_delete'
    );
  IF policy_count <> 6 THEN
    RAISE EXCEPTION 'preflight: expected 6 storage policies, found %', policy_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'wipp-business-cards'
      AND NOT EXISTS (
        SELECT 1
        FROM public.wipp_profiles p
        WHERE p.id = split_part(o.name, '/', 1)
      )
  ) THEN
    RAISE EXCEPTION 'preflight: a wipp-business-cards object is outside a valid WIPP profile folder';
  END IF;
END $$;

-- Grants on wipp_me() are left as they are. CREATE OR REPLACE keeps them.
-- The new body is schema-qualified, so search_path stays pg_catalog.
CREATE OR REPLACE FUNCTION wipp_private.wipp_me()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT p.id
  FROM public.wipp_profiles p
  WHERE p.firebase_uid = NULLIF(pg_catalog.btrim(auth.jwt()->>'sub'), '')
  LIMIT 1
$$;

DROP POLICY wipp_private_update ON storage.objects;
CREATE POLICY wipp_private_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wipp-private-media'
    AND owner_id = auth.jwt()->>'sub'
    AND public.wipp_lot16_can_write_private(name)
  )
  WITH CHECK (
    bucket_id = 'wipp-private-media'
    AND public.wipp_lot16_can_write_private(name)
  );

DROP POLICY wipp_private_delete ON storage.objects;
CREATE POLICY wipp_private_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'wipp-private-media'
    AND owner_id = auth.jwt()->>'sub'
    AND public.wipp_lot16_can_write_private(name)
  );

DROP POLICY wipp_public_update ON storage.objects;
CREATE POLICY wipp_public_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wipp-public-media'
    AND owner_id = auth.jwt()->>'sub'
    AND split_part(name, '/', 2) = public.wipp_my_profile_id()
  )
  WITH CHECK (
    bucket_id = 'wipp-public-media'
    AND split_part(name, '/', 2) = public.wipp_my_profile_id()
  );

DROP POLICY wipp_public_delete ON storage.objects;
CREATE POLICY wipp_public_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'wipp-public-media'
    AND owner_id = auth.jwt()->>'sub'
    AND split_part(name, '/', 2) = public.wipp_my_profile_id()
  );

DROP POLICY wipp_cards_update ON storage.objects;
CREATE POLICY wipp_cards_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'wipp-business-cards'
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  )
  WITH CHECK (
    bucket_id = 'wipp-business-cards'
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  );

DROP POLICY wipp_cards_delete ON storage.objects;
CREATE POLICY wipp_cards_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'wipp-business-cards'
    AND split_part(name, '/', 1) = public.wipp_my_profile_id()
  );

COMMIT;
