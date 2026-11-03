-- 070: On-screen receipt signatures (phase 1 + 1/b of e-alairas-terv.md).
--
-- transaction_signatures: insert-only. Users can read/insert signatures on
-- transactions they can see; nobody can update or delete via the API
-- (no policy + privileges revoked). service_role (support, account deletion)
-- and FK cascades still can.
--
-- Server-side fields (client values are ignored): org_id, side, signed_at,
-- captured_by_user_id, content_hash. For method 'saved' / 'auto' the image
-- and the signer name come from the caller's own saved signature, so nobody
-- can apply another user's saved signature.
--
-- user_saved_signatures: one saved signature per user, own row only.
--
-- signature_count(transactions): PostgREST computed field for the history
-- list badge + filter (select=*,signature_count / signature_count=eq.2),
-- so the transactions table itself is not touched.

BEGIN;

-- ── Pre-flight: fail fast if the live schema differs from what we expect ──
DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(c.col, ', ')
  INTO v_missing
  FROM (VALUES
    ('transactions', 'id'), ('transactions', 'org_id'), ('transactions', 'type'),
    ('transactions', 'status'), ('transactions', 'is_system'), ('transactions', 'amount'),
    ('transactions', 'transaction_date'), ('transactions', 'receipt_number'),
    ('transactions', 'cash_box_sequence'), ('transactions', 'tx_sequence_in_box'),
    ('transactions', 'cash_box_id_prefix_snapshot'), ('transactions', 'cash_box_currency_snapshot'),
    ('transactions', 'contact_name'), ('transactions', 'description'), ('transactions', 'line_items'),
    ('transactions', 'sender_company_name_snapshot'),
    ('profiles', 'id'), ('profiles', 'full_name'),
    ('orgs', 'id')
  ) AS c(tbl, col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public' AND ic.table_name = c.tbl AND ic.column_name = c.col
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION '070 aborted, missing columns (table.column by name): %', v_missing;
  END IF;
END $$;

-- ── Saved own signature (1/b) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_saved_signatures (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  signature_png text NOT NULL
    CHECK (octet_length(signature_png) <= 70000
           AND signature_png ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'),
  auto_sign boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_saved_signatures IS 'A user''s own saved signature; only ever applied to that user''s side of a receipt.';
COMMENT ON COLUMN public.user_saved_signatures.auto_sign IS 'Add my signature automatically to receipts I issue.';

ALTER TABLE public.user_saved_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saved signature own select" ON public.user_saved_signatures;
DROP POLICY IF EXISTS "Saved signature own insert" ON public.user_saved_signatures;
DROP POLICY IF EXISTS "Saved signature own update" ON public.user_saved_signatures;
DROP POLICY IF EXISTS "Saved signature own delete" ON public.user_saved_signatures;

CREATE POLICY "Saved signature own select" ON public.user_saved_signatures
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Saved signature own insert" ON public.user_saved_signatures
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Saved signature own update" ON public.user_saved_signatures
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Saved signature own delete" ON public.user_saved_signatures
  FOR DELETE USING (user_id = auth.uid());

REVOKE ALL ON public.user_saved_signatures FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_signatures TO authenticated;

CREATE OR REPLACE FUNCTION public.spendnote_saved_signature_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_saved_signatures_touch ON public.user_saved_signatures;
CREATE TRIGGER trg_user_saved_signatures_touch
  BEFORE UPDATE ON public.user_saved_signatures
  FOR EACH ROW EXECUTE FUNCTION public.spendnote_saved_signature_touch();

-- ── Receipt signatures ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transaction_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('from', 'to')),
  party text NOT NULL CHECK (party IN ('workspace', 'contact')),
  method text NOT NULL DEFAULT 'drawn' CHECK (method IN ('drawn', 'saved', 'auto')),
  signer_name text NOT NULL CHECK (char_length(signer_name) BETWEEN 1 AND 120),
  signature_png text NOT NULL
    CHECK (octet_length(signature_png) <= 70000
           AND signature_png ~ '^data:image/png;base64,[A-Za-z0-9+/=]+$'),
  content_hash text NOT NULL,
  content_hash_version smallint NOT NULL DEFAULT 1,
  signed_at timestamptz NOT NULL DEFAULT now(),
  captured_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  CONSTRAINT transaction_signatures_one_per_side UNIQUE (transaction_id, side),
  CONSTRAINT transaction_signatures_saved_is_workspace CHECK (method = 'drawn' OR party = 'workspace')
);

COMMENT ON TABLE public.transaction_signatures IS 'On-screen receipt signatures. Insert-only for users; side from = Issued by (gives the cash), to = Received by.';
COMMENT ON COLUMN public.transaction_signatures.content_hash IS 'SHA-256 of the receipt content at signing time, computed in the database (see spendnote_receipt_content_hash).';
COMMENT ON COLUMN public.transaction_signatures.method IS 'drawn = drawn now; saved = own saved signature applied by tap; auto = own saved signature applied automatically.';

CREATE INDEX IF NOT EXISTS idx_transaction_signatures_org_id ON public.transaction_signatures(org_id);

-- Canonical receipt content (v1). jsonb text output has a stable key order.
-- Only fields that never change after saving; status / void fields are excluded.
CREATE OR REPLACE FUNCTION public.spendnote_receipt_content_hash(p_tx public.transactions)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT encode(sha256(convert_to(jsonb_build_object(
    'v', 1,
    'id', p_tx.id,
    'type', p_tx.type,
    'amount', p_tx.amount::text,
    'currency', p_tx.cash_box_currency_snapshot,
    'date', to_char(p_tx.transaction_date, 'YYYY-MM-DD'),
    'receipt_number', p_tx.receipt_number,
    'prefix', p_tx.cash_box_id_prefix_snapshot,
    'cash_box_sequence', p_tx.cash_box_sequence,
    'tx_sequence_in_box', p_tx.tx_sequence_in_box,
    'contact_name', p_tx.contact_name,
    'sender_company_name', p_tx.sender_company_name_snapshot,
    'description', p_tx.description,
    'line_items', coalesce(p_tx.line_items, '[]'::jsonb)
  )::text, 'UTF8')), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.spendnote_transaction_signature_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tx public.transactions%ROWTYPE;
  v_saved public.user_saved_signatures%ROWTYPE;
  v_full_name text;
  v_workspace_side text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'SIGNATURE_NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = NEW.transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SIGNATURE_TX_NOT_FOUND';
  END IF;

  IF coalesce(v_tx.is_system, false) OR coalesce(v_tx.status, 'active') <> 'active' THEN
    RAISE EXCEPTION 'SIGNATURE_TX_NOT_SIGNABLE';
  END IF;

  -- OUT (expense): the workspace gives the cash -> Issued by (from).
  -- IN (income): the contact gives the cash -> workspace is Received by (to).
  v_workspace_side := CASE WHEN lower(v_tx.type) = 'expense' THEN 'from' ELSE 'to' END;
  NEW.side := CASE
    WHEN NEW.party = 'workspace' THEN v_workspace_side
    WHEN v_workspace_side = 'from' THEN 'to'
    ELSE 'from'
  END;

  IF NEW.method IN ('saved', 'auto') THEN
    IF NEW.party <> 'workspace' THEN
      RAISE EXCEPTION 'SIGNATURE_SAVED_ONLY_OWN_SIDE';
    END IF;

    SELECT * INTO v_saved FROM public.user_saved_signatures WHERE user_id = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'SIGNATURE_NO_SAVED_SIGNATURE';
    END IF;

    SELECT full_name INTO v_full_name FROM public.profiles WHERE id = v_uid;

    NEW.signature_png := v_saved.signature_png;
    NEW.signer_name := coalesce(nullif(btrim(v_full_name), ''), NEW.signer_name);
  END IF;

  NEW.signer_name := btrim(coalesce(NEW.signer_name, ''));
  NEW.user_agent := left(NEW.user_agent, 512);
  NEW.org_id := v_tx.org_id;
  NEW.captured_by_user_id := v_uid;
  NEW.signed_at := now();
  NEW.content_hash := public.spendnote_receipt_content_hash(v_tx);
  NEW.content_hash_version := 1;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.spendnote_transaction_signature_before_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_transaction_signatures_before_insert ON public.transaction_signatures;
CREATE TRIGGER trg_transaction_signatures_before_insert
  BEFORE INSERT ON public.transaction_signatures
  FOR EACH ROW EXECUTE FUNCTION public.spendnote_transaction_signature_before_insert();

ALTER TABLE public.transaction_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Signatures visible with transaction" ON public.transaction_signatures;
DROP POLICY IF EXISTS "Signatures insert on visible transaction" ON public.transaction_signatures;

-- The subquery runs under the caller's transactions RLS (owner/admin: whole
-- org; user role: assigned cash boxes only; solo: own), so this follows any
-- future change to transaction visibility automatically.
CREATE POLICY "Signatures visible with transaction" ON public.transaction_signatures
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_signatures.transaction_id)
  );

CREATE POLICY "Signatures insert on visible transaction" ON public.transaction_signatures
  FOR INSERT WITH CHECK (
    captured_by_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_signatures.transaction_id)
  );

REVOKE ALL ON public.transaction_signatures FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.transaction_signatures TO authenticated;

-- ── Computed field for the history list ──────────────────────────────────
-- Runs as the caller, so it only counts signatures the caller may see.
CREATE OR REPLACE FUNCTION public.signature_count(public.transactions)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::integer
  FROM public.transaction_signatures s
  WHERE s.transaction_id = $1.id;
$$;

REVOKE ALL ON FUNCTION public.signature_count(public.transactions) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.signature_count(public.transactions) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ── Check after running (optional) ───────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN ('transaction_signatures', 'user_saved_signatures');
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename IN ('transaction_signatures', 'user_saved_signatures') ORDER BY 1;
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants
--   WHERE table_name = 'transaction_signatures' AND grantee IN ('anon', 'authenticated') ORDER BY 1, 2;
--   (expected: authenticated INSERT, authenticated SELECT; nothing for anon)
