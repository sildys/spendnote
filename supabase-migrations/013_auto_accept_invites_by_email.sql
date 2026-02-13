-- Migration 013: Auto-accept pending invites by authenticated user's email
-- This is a fallback mechanism that doesn't require a token.
-- If a user is authenticated with the same email that was invited,
-- they own the email address, so they can accept the invite.

CREATE OR REPLACE FUNCTION public.spendnote_auto_accept_my_invites()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_claims jsonb;
  v_invite RECORD;
  v_accepted int := 0;
  v_role text;
  v_first_box_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get email from JWT claims first, then profile
  v_claims := (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}'))::jsonb;

  SELECT lower(trim(coalesce(p.email, v_claims ->> 'email')))
    INTO v_email
  FROM public.profiles p
  WHERE p.id = v_uid
  LIMIT 1;

  IF v_email IS NULL OR v_email = '' THEN
    v_email := lower(trim(coalesce(v_claims ->> 'email', '')));
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_missing', 'accepted', 0);
  END IF;

  -- Find and accept all pending invites for this email
  FOR v_invite IN
    SELECT *
    FROM public.invites
    WHERE lower(invited_email) = v_email
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
  LOOP
    v_role := CASE
      WHEN lower(coalesce(v_invite.role, '')) = 'admin' THEN 'admin'
      ELSE 'user'
    END;

    -- Create org membership
    INSERT INTO public.org_memberships (org_id, user_id, role)
    VALUES (v_invite.org_id, v_uid, v_role)
    ON CONFLICT (org_id, user_id)
    DO UPDATE SET role = EXCLUDED.role;

    -- Update invite status
    UPDATE public.invites
    SET status = 'active',
        accepted_by = v_uid
    WHERE id = v_invite.id;

    -- Create cash_box_memberships
    IF v_role = 'admin' THEN
      INSERT INTO public.cash_box_memberships (cash_box_id, user_id, role_in_box)
      SELECT cb.id, v_uid, 'admin'
      FROM public.cash_boxes cb
      WHERE cb.org_id = v_invite.org_id
      ON CONFLICT (cash_box_id, user_id) DO NOTHING;
    ELSE
      SELECT cb.id
        INTO v_first_box_id
      FROM public.cash_boxes cb
      WHERE cb.org_id = v_invite.org_id
      ORDER BY cb.sort_order NULLS LAST, cb.created_at ASC
      LIMIT 1;

      IF v_first_box_id IS NOT NULL THEN
        INSERT INTO public.cash_box_memberships (cash_box_id, user_id, role_in_box)
        VALUES (v_first_box_id, v_uid, 'user')
        ON CONFLICT (cash_box_id, user_id) DO NOTHING;
      END IF;
    END IF;

    v_accepted := v_accepted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_email,
    'accepted', v_accepted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spendnote_auto_accept_my_invites() TO authenticated;
