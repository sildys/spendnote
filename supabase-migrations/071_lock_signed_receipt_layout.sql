-- 071: A signed receipt keeps the layout it was signed with.
--
-- Once a transaction has a signature, its receipt display columns
-- (receipt_show_* toggles and receipt_* labels) can no longer change. Both
-- parties signed what they saw; the print, PDF and email must keep showing it.
-- The transaction detail page disables these controls too; this trigger also
-- covers stale pages and direct API calls.
--
-- Voiding (status) and every other column stay editable as before.
-- Calls without a user (service_role: support, maintenance) are not blocked.

BEGIN;

DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(c.col, ', ')
  INTO v_missing
  FROM (VALUES
    ('receipt_show_logo'), ('receipt_show_addresses'), ('receipt_show_tracking'),
    ('receipt_show_additional'), ('receipt_show_note'), ('receipt_show_signatures'),
    ('receipt_title'), ('receipt_total_label'), ('receipt_from_label'), ('receipt_to_label'),
    ('receipt_description_label'), ('receipt_amount_label'), ('receipt_notes_label'),
    ('receipt_issued_by_label'), ('receipt_received_by_label'), ('receipt_footer_note')
  ) AS c(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = 'transactions' AND ic.column_name = c.col
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '071 aborted, missing transactions columns: %', v_missing;
  END IF;

  IF to_regclass('public.transaction_signatures') IS NULL THEN
    RAISE EXCEPTION '071 aborted, run 070 first (transaction_signatures missing)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.spendnote_lock_signed_receipt_layout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.receipt_show_logo, NEW.receipt_show_addresses, NEW.receipt_show_tracking,
      NEW.receipt_show_additional, NEW.receipt_show_note, NEW.receipt_show_signatures,
      NEW.receipt_title, NEW.receipt_total_label, NEW.receipt_from_label, NEW.receipt_to_label,
      NEW.receipt_description_label, NEW.receipt_amount_label, NEW.receipt_notes_label,
      NEW.receipt_issued_by_label, NEW.receipt_received_by_label, NEW.receipt_footer_note)
     IS NOT DISTINCT FROM
     (OLD.receipt_show_logo, OLD.receipt_show_addresses, OLD.receipt_show_tracking,
      OLD.receipt_show_additional, OLD.receipt_show_note, OLD.receipt_show_signatures,
      OLD.receipt_title, OLD.receipt_total_label, OLD.receipt_from_label, OLD.receipt_to_label,
      OLD.receipt_description_label, OLD.receipt_amount_label, OLD.receipt_notes_label,
      OLD.receipt_issued_by_label, OLD.receipt_received_by_label, OLD.receipt_footer_note)
  THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.transaction_signatures s WHERE s.transaction_id = OLD.id) THEN
    RAISE EXCEPTION 'RECEIPT_LAYOUT_LOCKED_SIGNED'
      USING HINT = 'This receipt is signed, so its layout can no longer change.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.spendnote_lock_signed_receipt_layout() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_transactions_lock_signed_receipt_layout ON public.transactions;
CREATE TRIGGER trg_transactions_lock_signed_receipt_layout
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.spendnote_lock_signed_receipt_layout();

COMMIT;

-- ── Check after running (optional) ───────────────────────────────────────
-- SELECT tgname FROM pg_trigger
--   WHERE tgrelid = 'public.transactions'::regclass AND tgname = 'trg_transactions_lock_signed_receipt_layout';
--   (expected: 1 row)
