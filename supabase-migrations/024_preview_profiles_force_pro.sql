BEGIN;

-- Preview environment policy: keep existing preview accounts on Pro tier.
-- This updates all current profiles in the preview database to Pro.
UPDATE public.profiles
SET subscription_tier = 'pro'
WHERE COALESCE(lower(subscription_tier), 'free') <> 'pro';

COMMIT;
