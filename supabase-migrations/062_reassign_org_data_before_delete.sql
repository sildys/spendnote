-- 062: Atomic function to re-assign all org data from a departing user to the org owner.
-- Called by delete-account Edge Function BEFORE profile deletion.
-- Disables the balance trigger on transactions to avoid spurious recalculations
-- (changing user_id does not affect amounts, so the trigger is unnecessary here).

BEGIN;

CREATE OR REPLACE FUNCTION public.spendnote_reassign_org_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- For each org where this user has data, find the org owner and re-assign.
  FOR rec IN
    SELECT DISTINCT o.id AS org_id, o.owner_user_id
    FROM public.orgs o
    WHERE o.owner_user_id IS NOT NULL
      AND o.owner_user_id <> p_user_id
      AND (
        EXISTS (SELECT 1 FROM public.transactions t WHERE t.user_id = p_user_id AND t.org_id = o.id)
        OR EXISTS (SELECT 1 FROM public.contacts c WHERE c.user_id = p_user_id AND c.org_id = o.id)
        OR EXISTS (SELECT 1 FROM public.cash_boxes cb WHERE cb.user_id = p_user_id AND cb.org_id = o.id)
      )
  LOOP
    -- Disable the balance trigger to avoid spurious recalculations
    ALTER TABLE public.transactions DISABLE TRIGGER update_cash_box_balance_trigger;

    UPDATE public.transactions
    SET user_id = rec.owner_user_id
    WHERE user_id = p_user_id
      AND org_id = rec.org_id;

    ALTER TABLE public.transactions ENABLE TRIGGER update_cash_box_balance_trigger;

    UPDATE public.contacts
    SET user_id = rec.owner_user_id
    WHERE user_id = p_user_id
      AND org_id = rec.org_id;

    UPDATE public.cash_boxes
    SET user_id = rec.owner_user_id
    WHERE user_id = p_user_id
      AND org_id = rec.org_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.spendnote_reassign_org_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spendnote_reassign_org_data(uuid) TO service_role;

COMMIT;
