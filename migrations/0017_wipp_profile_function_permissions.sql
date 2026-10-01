-- Ensure authenticated clients can resolve their own profile inside
-- SECURITY DEFINER story/media functions and storage policies.
DO $$
BEGIN
  IF to_regprocedure('public.wipp_my_profile_id()') IS NOT NULL THEN
    ALTER FUNCTION public.wipp_my_profile_id() SECURITY DEFINER SET search_path = public;
    GRANT EXECUTE ON FUNCTION public.wipp_my_profile_id() TO authenticated;
  END IF;

  IF to_regprocedure('public.wipp_lot7_me()') IS NOT NULL THEN
    ALTER FUNCTION public.wipp_lot7_me() SECURITY DEFINER SET search_path = public;
    GRANT EXECUTE ON FUNCTION public.wipp_lot7_me() TO authenticated;
  END IF;
END $$;
