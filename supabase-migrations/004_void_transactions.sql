BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_by_user_name text,
  ADD COLUMN IF NOT EXISTS void_tx_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_tx_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS void_reason text;

CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_is_system ON public.transactions(is_system);
CREATE INDEX IF NOT EXISTS idx_transactions_void_tx_id ON public.transactions(void_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_original_tx_id ON public.transactions(original_tx_id);

CREATE OR REPLACE FUNCTION public.spendnote_void_transaction(
  p_tx_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(void_transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_cb public.cash_boxes%ROWTYPE;
  v_reverse_type text;
  v_void_tx_id uuid;
  v_actor uuid;
  v_actor_name text;
  v_is_admin boolean;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_tx_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.user_id <> v_actor THEN
    SELECT EXISTS(
      SELECT 1
      FROM public.team_members tm
      WHERE tm.owner_id = v_tx.user_id
        AND tm.member_id = v_actor
        AND lower(tm.role) = 'admin'
        AND coalesce(tm.status, 'active') = 'active'
    ) INTO v_is_admin;

    IF NOT coalesce(v_is_admin, false) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  END IF;

  IF COALESCE(v_tx.is_system, false) THEN
    RAISE EXCEPTION 'Cannot void system transaction';
  END IF;

  IF COALESCE(v_tx.status, 'active') = 'voided' THEN
    RAISE EXCEPTION 'Already voided';
  END IF;

  SELECT * INTO v_cb
  FROM public.cash_boxes
  WHERE id = v_tx.cash_box_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash box not found';
  END IF;

  IF lower(v_tx.type) = 'income' THEN
    v_reverse_type := 'expense';
    IF (v_cb.current_balance - v_tx.amount) < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE_FOR_VOID';
    END IF;
  ELSE
    v_reverse_type := 'income';
  END IF;

  SELECT full_name INTO v_actor_name
  FROM public.profiles
  WHERE id = v_actor;

  INSERT INTO public.transactions(
    user_id,
    cash_box_id,
    contact_id,
    type,
    amount,
    description,
    notes,
    transaction_date,
    receipt_number,
    line_items,
    contact_name,
    contact_email,
    contact_phone,
    contact_address,
    contact_custom_field_1,
    contact_custom_field_2,
    created_by_user_id,
    created_by_user_name,
    status,
    is_system,
    original_tx_id
  ) VALUES (
    v_tx.user_id,
    v_tx.cash_box_id,
    v_tx.contact_id,
    v_reverse_type,
    v_tx.amount,
    v_tx.description,
    v_tx.notes,
    v_tx.transaction_date,
    NULL,
    v_tx.line_items,
    v_tx.contact_name,
    v_tx.contact_email,
    v_tx.contact_phone,
    v_tx.contact_address,
    v_tx.contact_custom_field_1,
    v_tx.contact_custom_field_2,
    v_actor,
    COALESCE(v_actor_name, v_tx.created_by_user_name),
    'active',
    true,
    v_tx.id
  )
  RETURNING id INTO v_void_tx_id;

  UPDATE public.transactions
  SET
    status = 'voided',
    voided_at = NOW(),
    voided_by_user_id = v_actor,
    voided_by_user_name = v_actor_name,
    void_tx_id = v_void_tx_id,
    void_reason = p_reason
  WHERE id = v_tx.id;

  RETURN QUERY SELECT v_void_tx_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.spendnote_void_transaction(uuid, text) TO authenticated;

COMMIT;
