BEGIN;

CREATE OR REPLACE FUNCTION spendnote_transactions_stats(
  p_user_id uuid,
  p_cash_box_ids uuid[] DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_created_by_user_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_amount_min numeric DEFAULT NULL,
  p_amount_max numeric DEFAULT NULL,
  p_tx_id_query text DEFAULT NULL,
  p_contact_query text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE(count bigint, total_in numeric, total_out numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tx_id_query text := btrim(coalesce(p_tx_id_query, ''));
  v_contact_query text := btrim(coalesce(p_contact_query, ''));
  v_cash_box_seq int := NULL;
  v_tx_seq int := NULL;
  v_cb_only int := NULL;
  v_uuid uuid := NULL;
  v_status text := NULL;
BEGIN
  v_status := NULLIF(lower(btrim(coalesce(p_status, ''))), '');

  IF v_tx_id_query ~* '^sn[0-9]+-[0-9]+$' THEN
    v_cash_box_seq := (regexp_match(v_tx_id_query, '^sn([0-9]+)-([0-9]+)$', 'i'))[1]::int;
    v_tx_seq := (regexp_match(v_tx_id_query, '^sn([0-9]+)-([0-9]+)$', 'i'))[2]::int;
  ELSIF v_tx_id_query ~* '^sn[0-9]+-' THEN
    v_cb_only := (regexp_match(v_tx_id_query, '^sn([0-9]+)-', 'i'))[1]::int;
  ELSIF v_tx_id_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := v_tx_id_query::uuid;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS count,
    COALESCE(SUM(CASE WHEN lower(t.type) = 'income' AND coalesce(t.status, 'active') = 'active' THEN t.amount ELSE 0 END), 0)::numeric AS total_in,
    COALESCE(SUM(CASE WHEN lower(t.type) = 'expense' AND coalesce(t.status, 'active') = 'active' THEN t.amount ELSE 0 END), 0)::numeric AS total_out
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND coalesce(t.is_system, false) = false
    AND (v_status IS NULL OR coalesce(t.status, 'active') = v_status)
    AND (p_cash_box_ids IS NULL OR t.cash_box_id = ANY(p_cash_box_ids))
    AND (p_type IS NULL OR t.type = p_type)
    AND (p_created_by_user_id IS NULL OR t.created_by_user_id = p_created_by_user_id)
    AND (p_start_date IS NULL OR t.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR t.transaction_date <= p_end_date)
    AND (p_amount_min IS NULL OR t.amount >= p_amount_min)
    AND (p_amount_max IS NULL OR t.amount <= p_amount_max)
    AND (
      v_tx_id_query = ''
      OR (v_cash_box_seq IS NOT NULL AND v_tx_seq IS NOT NULL AND t.cash_box_sequence = v_cash_box_seq AND t.tx_sequence_in_box = v_tx_seq)
      OR (v_cb_only IS NOT NULL AND t.cash_box_sequence = v_cb_only)
      OR (v_uuid IS NOT NULL AND t.id = v_uuid)
      OR (v_uuid IS NULL AND v_cash_box_seq IS NULL AND v_cb_only IS NULL AND t.receipt_number ILIKE '%' || v_tx_id_query || '%')
    )
    AND (
      v_contact_query = ''
      OR (
        v_contact_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND t.contact_id = v_contact_query::uuid
      )
      OR (
        NOT (v_contact_query ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        AND coalesce(t.contact_name, '') ILIKE '%' || v_contact_query || '%'
      )
    );
END;
$$;

COMMIT;
