BEGIN;

-- Add seat_count to profiles for Pro plan seat tracking.
-- Default 0 means "use plan default" (Free/Standard = 1, Pro = 3).
-- When a Pro subscription with extra seats is active, webhook sets this
-- to the actual purchased seat count (e.g. 5 = 3 included + 2 extra).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seat_count INTEGER DEFAULT 0;

COMMIT;
