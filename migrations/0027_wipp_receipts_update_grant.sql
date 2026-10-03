-- Read receipts: let a member mark their own receipt as read.
-- authenticated could INSERT a receipt (delivered) but not UPDATE it, so the
-- delivered -> read transition failed with 42501 and no message ever showed "Lu".
-- Only the two timestamps are updatable; the policy receipts_update_own already
-- limits the update to the caller's own rows (profile_id = wipp_private.wipp_me()).
GRANT UPDATE (delivered_at, read_at) ON public.wipp_receipts TO authenticated;
