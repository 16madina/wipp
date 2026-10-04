-- The published-card read policy compared the card's own "name" column instead of the
-- storage object's name, so only owners could see card images. Qualify the column.
DROP POLICY IF EXISTS wipp_cards_read_published ON storage.objects;
CREATE POLICY wipp_cards_read_published ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'wipp-business-cards' AND EXISTS (
    SELECT 1 FROM public.wipp_business_cards c
    WHERE c.is_published = true
      AND split_part(storage.objects.name, '/', 1) = c.owner_profile_id
      AND (storage.objects.name = c.cover_url OR storage.objects.name = c.logo_url OR storage.objects.name = ANY (c.photo_urls))
  )
);
