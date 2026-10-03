-- Forward fix only. Does not rerun 0018–0024.
-- Profile updates follow the Firebase identity already used by wipp_me().
-- Published business-card files stay in the private bucket, but any
-- signed-in member can read the objects a published card actually displays.

BEGIN;

DROP POLICY IF EXISTS profiles_update_own ON public.wipp_profiles;
CREATE POLICY profiles_update_own ON public.wipp_profiles
  FOR UPDATE TO authenticated
  USING (id = wipp_private.wipp_me())
  WITH CHECK (id = wipp_private.wipp_me());

DROP POLICY IF EXISTS wipp_cards_read_published ON storage.objects;
CREATE POLICY wipp_cards_read_published ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'wipp-business-cards'
    AND EXISTS (
      SELECT 1
      FROM public.wipp_business_cards c
      WHERE c.is_published = true
        AND split_part(name, '/', 1) = c.owner_profile_id
        AND (
          name = c.cover_url
          OR name = c.logo_url
          OR name = ANY (c.photo_urls)
        )
    )
  );

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
  AND (p.avatar_url IS NULL OR p.avatar_url = '');

COMMIT;
