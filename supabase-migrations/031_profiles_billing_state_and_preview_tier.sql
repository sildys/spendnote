BEGIN;

-- Extend profiles subscription tier to include preview.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('preview', 'free', 'standard', 'pro'));

-- Billing state columns for Stripe prep (S2).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_status TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS preview_transaction_cap INTEGER DEFAULT 200;

-- Normalize defaults for preview-era rollout.
ALTER TABLE public.profiles
  ALTER COLUMN subscription_tier SET DEFAULT 'preview',
  ALTER COLUMN preview_transaction_cap SET DEFAULT 200,
  ALTER COLUMN stripe_cancel_at_period_end SET DEFAULT FALSE;

UPDATE public.profiles
SET subscription_tier = 'preview'
WHERE (
  stripe_subscription_id IS NULL
  AND COALESCE(NULLIF(lower(billing_status), ''), 'preview') = 'preview'
)
OR COALESCE(NULLIF(lower(subscription_tier), ''), 'free') NOT IN ('preview', 'free', 'standard', 'pro');

UPDATE public.profiles
SET preview_transaction_cap = 200
WHERE preview_transaction_cap IS NULL OR preview_transaction_cap <= 0;

-- Ensure billing_status is populated consistently.
UPDATE public.profiles
SET billing_status = CASE
  WHEN COALESCE(NULLIF(lower(subscription_tier), ''), 'preview') = 'preview' THEN 'preview'
  WHEN COALESCE(NULLIF(lower(subscription_tier), ''), 'free') = 'free' THEN 'free'
  ELSE 'active'
END
WHERE billing_status IS NULL OR NULLIF(trim(billing_status), '') IS NULL;

-- Billing constraints.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_billing_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_status_check
  CHECK (billing_status IN ('preview', 'free', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_billing_cycle_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_billing_cycle_check
  CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_billing_status ON public.profiles(billing_status);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);

COMMIT;
