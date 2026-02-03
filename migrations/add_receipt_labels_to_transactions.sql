-- Add receipt label override columns to transactions table
-- These allow per-transaction customization of receipt labels (overriding cash box defaults)

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS receipt_title TEXT,
ADD COLUMN IF NOT EXISTS receipt_total_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_from_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_to_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_description_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_amount_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_issued_by_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_received_by_label TEXT,
ADD COLUMN IF NOT EXISTS receipt_footer_note TEXT;

-- Add comment for documentation
COMMENT ON COLUMN transactions.receipt_title IS 'Override receipt title for this transaction';
COMMENT ON COLUMN transactions.receipt_total_label IS 'Override total label for this transaction';
COMMENT ON COLUMN transactions.receipt_from_label IS 'Override FROM label for this transaction';
COMMENT ON COLUMN transactions.receipt_to_label IS 'Override TO label for this transaction';
COMMENT ON COLUMN transactions.receipt_description_label IS 'Override description label for this transaction';
COMMENT ON COLUMN transactions.receipt_amount_label IS 'Override amount label for this transaction';
COMMENT ON COLUMN transactions.receipt_issued_by_label IS 'Override issued by label for this transaction';
COMMENT ON COLUMN transactions.receipt_received_by_label IS 'Override received by label for this transaction';
COMMENT ON COLUMN transactions.receipt_footer_note IS 'Override footer note for this transaction';
