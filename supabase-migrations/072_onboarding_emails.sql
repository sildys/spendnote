-- 072: Scheduled onboarding emails (send-onboarding-emails edge function).
--
-- Who gets what (decided in the function, one email per user per day at most):
--   nudge_day1   day 1-3 after signup, still no transaction
--   nudge_day3   day 3-7 after signup, still no transaction (>= 2 days after nudge_day1)
--   trial_ending last 3 days of the 14-day trial, everyone on the trial
-- Only confirmed, non-banned trial accounts that are not invited members of
-- someone else's team, and that have not opted out.
--
-- Opt-out: people reply "unsubscribe"; set it by hand:
--   update public.profiles set email_opt_out = true where email = '...';
--
-- The schedule itself is in 073 (run that only after a dry run looks right).

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_opt_out boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type)
);

-- Service role only: RLS on, no policies.
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_log FROM anon, authenticated;

-- Shared secret for the cron call, generated here and never shown.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'onboarding_cron_secret') THEN
    PERFORM vault.create_secret(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'onboarding_cron_secret',
      'Authorizes the daily pg_cron call to send-onboarding-emails'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.spendnote_verify_cron_secret(p_secret text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'onboarding_cron_secret'
      AND decrypted_secret = p_secret
      AND coalesce(p_secret, '') <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.spendnote_verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spendnote_verify_cron_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.spendnote_onboarding_candidates()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  signup_at timestamptz,
  tx_count bigint,
  sent jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    u.id,
    lower(u.email),
    coalesce(p.full_name, ''),
    u.created_at,
    (SELECT count(*) FROM public.transactions t
      WHERE t.user_id = u.id AND coalesce(t.is_system, false) = false),
    coalesce((SELECT jsonb_object_agg(l.email_type, l.sent_at)
      FROM public.email_log l WHERE l.user_id = u.id), '{}'::jsonb)
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.email IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
    AND (u.banned_until IS NULL OR u.banned_until < now())
    AND u.created_at > now() - interval '15 days'
    AND p.email_opt_out = false
    AND lower(coalesce(nullif(trim(p.subscription_tier), ''), 'free')) IN ('free', 'preview')
    AND NOT EXISTS (
      SELECT 1
      FROM public.org_memberships m
      JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = u.id AND o.owner_user_id <> u.id
    );
$$;

REVOKE ALL ON FUNCTION public.spendnote_onboarding_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spendnote_onboarding_candidates() TO service_role;

COMMIT;
