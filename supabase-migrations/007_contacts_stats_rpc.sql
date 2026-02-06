BEGIN;

CREATE OR REPLACE FUNCTION public.spendnote_contacts_stats()
RETURNS TABLE(
  contact_id uuid,
  tx_count bigint,
  cash_box_ids uuid[],
  last_tx_id uuid,
  last_tx_cash_box_id uuid,
  last_tx_transaction_date date,
  last_tx_created_at timestamptz,
  last_tx_receipt_number text,
  last_tx_cash_box_sequence integer,
  last_tx_tx_sequence_in_box integer,
  last_tx_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH actor AS (
    SELECT auth.uid() AS uid
  ),
  tx_mapped AS (
    SELECT
      COALESCE(t.contact_id, cmatch.id) AS resolved_contact_id,
      t.cash_box_id,
      t.id,
      t.transaction_date,
      t.created_at,
      t.receipt_number,
      t.cash_box_sequence,
      t.tx_sequence_in_box,
      t.status,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(t.contact_id, cmatch.id)
        ORDER BY COALESCE(t.transaction_date::timestamptz, t.created_at) DESC, t.created_at DESC
      ) AS rn
    FROM public.transactions t
    JOIN actor a ON TRUE
    LEFT JOIN LATERAL (
      SELECT c.id
      FROM public.contacts c
      WHERE c.user_id = a.uid
        AND t.contact_id IS NULL
        AND t.contact_name IS NOT NULL
        AND lower(c.name) = lower(t.contact_name)
      ORDER BY c.sequence_number NULLS LAST, c.id
      LIMIT 1
    ) cmatch ON TRUE
    WHERE t.user_id = a.uid
      AND (t.is_system IS NULL OR t.is_system = FALSE)
      AND lower(COALESCE(t.status, 'active')) = 'active'
      AND COALESCE(t.contact_id, cmatch.id) IS NOT NULL
  ),
  agg AS (
    SELECT
      resolved_contact_id AS contact_id,
      COUNT(*) AS tx_count,
      ARRAY_AGG(DISTINCT cash_box_id) FILTER (WHERE cash_box_id IS NOT NULL) AS cash_box_ids
    FROM tx_mapped
    GROUP BY resolved_contact_id
  ),
  last_tx AS (
    SELECT
      resolved_contact_id AS contact_id,
      id AS last_tx_id,
      cash_box_id AS last_tx_cash_box_id,
      transaction_date AS last_tx_transaction_date,
      created_at AS last_tx_created_at,
      receipt_number AS last_tx_receipt_number,
      cash_box_sequence AS last_tx_cash_box_sequence,
      tx_sequence_in_box AS last_tx_tx_sequence_in_box,
      status AS last_tx_status
    FROM tx_mapped
    WHERE rn = 1
  )
  SELECT
    a.contact_id,
    a.tx_count,
    COALESCE(a.cash_box_ids, '{}'::uuid[]) AS cash_box_ids,
    l.last_tx_id,
    l.last_tx_cash_box_id,
    l.last_tx_transaction_date,
    l.last_tx_created_at,
    l.last_tx_receipt_number,
    l.last_tx_cash_box_sequence,
    l.last_tx_tx_sequence_in_box,
    l.last_tx_status
  FROM agg a
  LEFT JOIN last_tx l USING (contact_id);
$$;

GRANT EXECUTE ON FUNCTION public.spendnote_contacts_stats() TO authenticated;

COMMIT;
