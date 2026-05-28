-- Migration 067: invites.cash_box_ids pre-grant + accept_invite_v2 auto-grant
--
-- Problem solved (V1 #7 bug):
--   When an owner/admin invites a User-role team member, they cannot pre-assign
--   which cash boxes the invitee will see. Until now `accept_invite_v2` grants
--   access to the ORG's FIRST cash box only. Owner/admin must wait for the user
--   to accept, then manually grant access to other cash boxes — race-prone +
--   bad UX for multi-CB Pro orgs.
--
-- Fix:
--   1. Add `cash_box_ids JSONB DEFAULT NULL` column to invites.
--   2. `spendnote_create_invite` accepts new `p_cash_box_ids jsonb DEFAULT NULL`
--      parameter (backward-compatible; old callers continue to work).
--   3. `spendnote_accept_invite_v2` honors `invites.cash_box_ids`:
--      - If non-null + non-empty array → grant membership to those CBs only.
--      - If null / empty array → fall back to old behavior (first CB only).
--      Admin role still gets ALL org CBs (unchanged).
--
-- Backward-compat:
--   • Existing invites have cash_box_ids = NULL → old "first CB" behavior.
--   • Old `invite(email, role)` callers continue to work (4th arg defaulted).

BEGIN;

-- ============================================================
-- 1) Schema change: invites.cash_box_ids JSONB
-- ============================================================
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS cash_box_ids JSONB DEFAULT NULL;

-- ============================================================
-- 2) spendnote_create_invite: new p_cash_box_ids parameter
-- ============================================================
-- Drop old signature first so we can change parameter list cleanly.
DROP FUNCTION IF EXISTS public.spendnote_create_invite(uuid, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.spendnote_create_invite(
  p_org_id        uuid,
  p_invited_email text,
  p_role          text,
  p_expires_at    timestamptz,
  p_cash_box_ids  jsonb DEFAULT NULL
)
RETURNS public.invites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid;
  v_member_role text;
  v_email       text;
  v_role        text;
  v_token       text;
  v_invite      public.invites;
  v_owner_id    uuid;
  v_seat_count  int;
  v_used_seats  int;
  v_cb_ids      jsonb;
  v_valid_ids   jsonb;
  i             int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_email := lower(trim(coalesce(p_invited_email, '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Missing invited email';
  END IF;

  v_role := CASE WHEN lower(coalesce(p_role, '')) = 'admin' THEN 'admin' ELSE 'user' END;

  SELECT role INTO v_member_role
  FROM public.org_memberships
  WHERE org_id = p_org_id AND user_id = v_uid
  LIMIT 1;

  IF v_member_role IS NULL OR lower(v_member_role) NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Validate cash_box_ids: only keep IDs that actually belong to this org.
  -- Admin invites ignore cash_box_ids (they get all CBs at accept).
  v_cb_ids := NULL;
  IF v_role = 'user' AND p_cash_box_ids IS NOT NULL AND jsonb_typeof(p_cash_box_ids) = 'array' THEN
    SELECT COALESCE(jsonb_agg(DISTINCT (cb_id)::text), '[]'::jsonb)
      INTO v_valid_ids
    FROM (
      SELECT (jsonb_array_elements_text(p_cash_box_ids))::uuid AS cb_id
    ) ids
    WHERE EXISTS (
      SELECT 1 FROM public.cash_boxes cb
      WHERE cb.id = ids.cb_id AND cb.org_id = p_org_id
    );
    IF v_valid_ids IS NOT NULL AND jsonb_array_length(v_valid_ids) > 0 THEN
      v_cb_ids := v_valid_ids;
    END IF;
  END IF;

  -- Seat limit enforcement (unchanged)
  SELECT om.user_id INTO v_owner_id
  FROM public.org_memberships om
  WHERE om.org_id = p_org_id AND lower(om.role) = 'owner'
  LIMIT 1;

  IF v_owner_id IS NOT NULL THEN
    SELECT COALESCE(p.seat_count, 3) INTO v_seat_count
    FROM public.profiles p
    WHERE p.id = v_owner_id;

    IF v_seat_count IS NULL OR v_seat_count < 1 THEN
      v_seat_count := 3;
    END IF;

    SELECT COUNT(*)::int INTO v_used_seats
    FROM (
      SELECT user_id AS uid FROM public.org_memberships WHERE org_id = p_org_id
      UNION
      SELECT NULL FROM public.invites
        WHERE org_id = p_org_id AND status = 'pending' AND invited_email <> v_email
    ) seats;

    IF v_used_seats >= v_seat_count THEN
      RAISE EXCEPTION 'SEAT_LIMIT_REACHED';
    END IF;
  END IF;

  -- Reuse existing pending invite for this org+email
  SELECT * INTO v_invite
  FROM public.invites
  WHERE org_id = p_org_id
    AND invited_email = v_email
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invite.id IS NOT NULL THEN
    UPDATE public.invites
      SET role         = v_role,
          expires_at   = p_expires_at,
          cash_box_ids = v_cb_ids,
          token_hash   = CASE
            WHEN v_invite.token IS NOT NULL AND btrim(v_invite.token) <> '' THEN
              encode(public.digest(v_invite.token, 'sha256'), 'hex')
            ELSE token_hash
          END
      WHERE id = v_invite.id
      RETURNING * INTO v_invite;
    RETURN v_invite;
  END IF;

  FOR i IN 1..5 LOOP
    v_token := encode(public.gen_random_bytes(24), 'hex');
    BEGIN
      INSERT INTO public.invites (org_id, invited_email, role, status, token, token_hash, expires_at, cash_box_ids)
      VALUES (
        p_org_id,
        v_email,
        v_role,
        'pending',
        v_token,
        encode(public.digest(v_token, 'sha256'), 'hex'),
        p_expires_at,
        v_cb_ids
      )
      RETURNING * INTO v_invite;
      RETURN v_invite;
    EXCEPTION WHEN unique_violation THEN
      -- collision, try again
    END;
  END LOOP;

  RAISE EXCEPTION 'Could not generate unique invite token';
END;
$$;

GRANT EXECUTE ON FUNCTION public.spendnote_create_invite(uuid, text, text, timestamptz, jsonb) TO authenticated;

-- ============================================================
-- 3) spendnote_accept_invite_v2: honor cash_box_ids on accept
-- ============================================================
CREATE OR REPLACE FUNCTION public.spendnote_accept_invite_v2(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_hash text;
  v_invite public.invites;
  v_role text;
  v_org_id uuid;
  v_first_box_id uuid;
  v_now timestamptz := now();
  v_granted_cb_count int := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(trim(email))
    INTO v_email
  FROM public.profiles
  WHERE id = v_uid
  LIMIT 1;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Profile missing';
  END IF;

  v_hash := encode(public.digest(coalesce(p_token, ''), 'sha256'), 'hex');

  SELECT *
    INTO v_invite
  FROM public.invites
  WHERE token_hash = v_hash
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > v_now)
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found or not pending';
  END IF;

  IF lower(coalesce(v_invite.invited_email, '')) <> v_email THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;

  v_role := CASE
    WHEN lower(coalesce(v_invite.role, '')) = 'admin' THEN 'admin'
    ELSE 'user'
  END;

  v_org_id := v_invite.org_id;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (v_org_id, v_uid, v_role)
  ON CONFLICT (org_id, user_id)
  DO UPDATE SET role = excluded.role;

  UPDATE public.invites
  SET status = 'active',
      accepted_by = v_uid
  WHERE id = v_invite.id;

  IF v_role = 'admin' THEN
    -- Admin: grant access to ALL org cash boxes (cash_box_ids ignored)
    INSERT INTO public.cash_box_memberships (cash_box_id, user_id, role_in_box)
    SELECT cb.id, v_uid, 'admin'
    FROM public.cash_boxes cb
    WHERE cb.org_id = v_org_id
    ON CONFLICT (cash_box_id, user_id) DO NOTHING;
  ELSE
    -- User role: honor pre-granted cash_box_ids if present.
    IF v_invite.cash_box_ids IS NOT NULL
       AND jsonb_typeof(v_invite.cash_box_ids) = 'array'
       AND jsonb_array_length(v_invite.cash_box_ids) > 0 THEN

      INSERT INTO public.cash_box_memberships (cash_box_id, user_id, role_in_box)
      SELECT cb.id, v_uid, 'user'
      FROM public.cash_boxes cb
      WHERE cb.org_id = v_org_id
        AND cb.id IN (
          SELECT (jsonb_array_elements_text(v_invite.cash_box_ids))::uuid
        )
      ON CONFLICT (cash_box_id, user_id) DO NOTHING;

      GET DIAGNOSTICS v_granted_cb_count = ROW_COUNT;
    END IF;

    -- Fallback: if no pre-granted CBs were applied, grant first CB (legacy behavior)
    IF v_granted_cb_count = 0 THEN
      SELECT cb.id
        INTO v_first_box_id
      FROM public.cash_boxes cb
      WHERE cb.org_id = v_org_id
      ORDER BY cb.sort_order NULLS LAST, cb.created_at ASC
      LIMIT 1;

      IF v_first_box_id IS NOT NULL THEN
        INSERT INTO public.cash_box_memberships (cash_box_id, user_id, role_in_box)
        VALUES (v_first_box_id, v_uid, 'user')
        ON CONFLICT (cash_box_id, user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org_id,
    'role', v_role,
    'granted_cb_count', v_granted_cb_count
  );
END;
$$;

COMMIT;
