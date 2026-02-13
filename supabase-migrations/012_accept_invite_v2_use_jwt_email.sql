BEGIN;

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
  v_claims jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
    RAISE EXCEPTION 'Email missing';
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
  DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.invites
  SET status = 'active',
      accepted_by = v_uid
  WHERE id = v_invite.id;

  IF v_role = 'admin' THEN
    INSERT INTO public.cash_box_memberships (cash_box_id, user_id, role_in_box)
    SELECT cb.id, v_uid, 'admin'
    FROM public.cash_boxes cb
    WHERE cb.org_id = v_org_id
    ON CONFLICT (cash_box_id, user_id) DO NOTHING;
  ELSE
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

  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_org_id,
    'role', v_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spendnote_accept_invite_v2(text) TO authenticated;

COMMIT;
