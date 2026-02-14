BEGIN;

ALTER TABLE public.cash_boxes
ADD COLUMN IF NOT EXISTS receipt_title TEXT,
ADD COLUMN IF NOT EXISTS receipt_total_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_from_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_to_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_description_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_amount_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_issued_by_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_received_by_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_footer_note TEXT;

COMMIT;
