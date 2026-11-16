-- 075: Last app activity per user for the admin stats page.
--
-- last_sign_in_at only changes on an actual sign-in, and sessions stay signed in
-- for weeks, so it does not show who still uses the app. auth.sessions.updated_at
-- moves every time the app refreshes its token (on open, then about hourly while
-- it stays open). Only the service role (admin-stats edge function) may call it.

CREATE OR REPLACE FUNCTION public.admin_last_activity()
RETURNS TABLE (user_id uuid, last_seen timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT s.user_id, max(coalesce(s.updated_at, s.created_at))
    FROM auth.sessions s
    GROUP BY s.user_id;
$$;

REVOKE ALL ON FUNCTION public.admin_last_activity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_last_activity() TO service_role;
