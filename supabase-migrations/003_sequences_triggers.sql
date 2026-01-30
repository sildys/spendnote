BEGIN;

CREATE OR REPLACE FUNCTION public.spendnote_set_cash_box_sequence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := public.get_next_cash_box_sequence(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_boxes_set_sequence ON public.cash_boxes;
CREATE TRIGGER trg_cash_boxes_set_sequence
BEFORE INSERT ON public.cash_boxes
FOR EACH ROW
EXECUTE FUNCTION public.spendnote_set_cash_box_sequence();

CREATE OR REPLACE FUNCTION public.spendnote_set_contact_sequence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := public.get_next_contact_sequence(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_set_sequence ON public.contacts;
CREATE TRIGGER trg_contacts_set_sequence
BEFORE INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.spendnote_set_contact_sequence();

CREATE OR REPLACE FUNCTION public.spendnote_set_transaction_sequences()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cb_seq INTEGER;
BEGIN
  IF NEW.cash_box_sequence IS NULL THEN
    SELECT sequence_number INTO cb_seq
    FROM public.cash_boxes
    WHERE id = NEW.cash_box_id;

    NEW.cash_box_sequence := cb_seq;
  END IF;

  IF NEW.tx_sequence_in_box IS NULL THEN
    NEW.tx_sequence_in_box := public.get_next_tx_sequence(NEW.cash_box_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_set_sequences ON public.transactions;
CREATE TRIGGER trg_transactions_set_sequences
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.spendnote_set_transaction_sequences();

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as seq
  FROM public.cash_boxes
)
UPDATE public.cash_boxes
SET sequence_number = numbered.seq
FROM numbered
WHERE public.cash_boxes.id = numbered.id
  AND public.cash_boxes.sequence_number IS NULL;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as seq
  FROM public.contacts
)
UPDATE public.contacts
SET sequence_number = numbered.seq
FROM numbered
WHERE public.contacts.id = numbered.id
  AND public.contacts.sequence_number IS NULL;

UPDATE public.transactions t
SET cash_box_sequence = cb.sequence_number
FROM public.cash_boxes cb
WHERE t.cash_box_id = cb.id
  AND t.cash_box_sequence IS NULL;

WITH maxes AS (
  SELECT cash_box_id, COALESCE(MAX(tx_sequence_in_box), 0) AS max_seq
  FROM public.transactions
  GROUP BY cash_box_id
),
nulls AS (
  SELECT id, cash_box_id, ROW_NUMBER() OVER (PARTITION BY cash_box_id ORDER BY created_at ASC) AS rn
  FROM public.transactions
  WHERE tx_sequence_in_box IS NULL
)
UPDATE public.transactions t
SET tx_sequence_in_box = maxes.max_seq + nulls.rn
FROM nulls
JOIN maxes USING (cash_box_id)
WHERE t.id = nulls.id;

COMMIT;
