-- 065: cash_boxes must expose receipt toggles + notes label for spendnote_create_transaction (064)
-- and for the app UI. Schema.sql had these; older DBs may only have 017 text labels without toggles.

BEGIN;

ALTER TABLE public.cash_boxes
  ADD COLUMN IF NOT EXISTS receipt_show_logo boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_show_addresses boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_show_tracking boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_show_additional boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_show_note boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_show_signatures boolean DEFAULT true;

ALTER TABLE public.cash_boxes
  ADD COLUMN IF NOT EXISTS receipt_notes_label text;

COMMIT;
