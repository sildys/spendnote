-- 076: Creating a team must keep the owner's existing cash boxes visible.
--
-- The sign-up trigger creates "Main Cash Box" with org_id NULL (no team yet).
-- spendnote_ensure_org_for_pro then created the team without moving those rows
-- into it. Once a user has a team, the app filters cash boxes, transactions and
-- contacts by org_id, so the owner's own boxes vanished and the new-transaction
-- page said "You need to create a Cash Box first".
--
-- Fix: whenever the owner's team is created or looked up, move the owner's
-- personal rows (org_id NULL) into it, and repair the owners already affected.
-- Signatures copy org_id from their transaction; the content hash does not
-- include org_id, and the balance trigger nets to zero on an org_id-only update.

BEGIN;

CREATE OR REPLACE FUNCTION public.spendnote_attach_personal_rows_to_org(p_user_id uuid, p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_org_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.cash_boxes
  SET org_id = p_org_id
  WHERE user_id = p_user_id AND org_id IS NULL;

  UPDATE public.transactions t
  SET org_id = p_org_id
  FROM public.cash_boxes cb
  WHERE t.cash_box_id = cb.id
    AND cb.org_id = p_org_id
    AND cb.user_id = p_user_id
    AND t.org_id IS NULL;

  UPDATE public.contacts
  SET org_id = p_org_id
  WHERE user_id = p_user_id AND org_id IS NULL;

  UPDATE public.transaction_signatures s
  SET org_id = t.org_id
  FROM public.transactions t
  WHERE s.transaction_id = t.id
    AND t.org_id = p_org_id
    AND s.org_id IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.spendnote_attach_personal_rows_to_org(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.spendnote_ensure_org_for_pro(p_team_name text DEFAULT 'My Team'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_tier text;
  v_created_at timestamptz;
  v_org_id uuid;
  v_team_name text;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lower(coalesce(nullif(trim(subscription_tier), ''), 'free'))
  INTO v_tier
  FROM public.profiles
  WHERE id = v_actor;

  IF v_tier = 'free' THEN
    SELECT created_at INTO v_created_at FROM auth.users WHERE id = v_actor;
    IF v_created_at IS NOT NULL AND (now() - v_created_at) > interval '14 days' THEN
      RAISE EXCEPTION 'PRO_REQUIRED';
    END IF;
  ELSIF v_tier NOT IN ('pro', 'preview') THEN
    RAISE EXCEPTION 'PRO_REQUIRED';
  END IF;

  SELECT om.org_id INTO v_org_id
  FROM public.org_memberships om
  WHERE om.user_id = v_actor AND lower(om.role) = 'owner'
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    v_team_name := nullif(trim(p_team_name), '');
    IF v_team_name IS NOT NULL THEN
      UPDATE public.orgs SET name = v_team_name, updated_at = now()
      WHERE id = v_org_id AND owner_user_id = v_actor;
    END IF;

    PERFORM public.spendnote_attach_personal_rows_to_org(v_actor, v_org_id);

    RETURN jsonb_build_object(
      'org_id', v_org_id,
      'created', false
    );
  END IF;

  SELECT om.org_id INTO v_org_id
  FROM public.org_memberships om
  WHERE om.user_id = v_actor
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'org_id', v_org_id,
      'created', false
    );
  END IF;

  v_team_name := coalesce(nullif(trim(p_team_name), ''), 'My Team');

  INSERT INTO public.orgs (name, owner_user_id)
  VALUES (v_team_name, v_actor)
  RETURNING id INTO v_org_id;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (v_org_id, v_actor, 'owner');

  PERFORM public.spendnote_attach_personal_rows_to_org(v_actor, v_org_id);

  RETURN jsonb_build_object(
    'org_id', v_org_id,
    'created', true
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.spendnote_ensure_org_for_pro(text) TO authenticated;

-- Repair owners who already have a team but still have personal rows outside it.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (om.user_id) om.user_id, om.org_id
    FROM public.org_memberships om
    JOIN public.orgs o ON o.id = om.org_id AND o.owner_user_id = om.user_id
    WHERE lower(om.role) = 'owner'
    ORDER BY om.user_id, o.is_default DESC, om.created_at ASC
  LOOP
    PERFORM public.spendnote_attach_personal_rows_to_org(r.user_id, r.org_id);
  END LOOP;
END $$;

COMMIT;

-- Check: expect 0 rows.
SELECT left(om.user_id::text, 8) AS owner,
       (SELECT count(*) FROM public.cash_boxes b WHERE b.user_id = om.user_id AND b.org_id IS NULL) AS boxes_outside_team
FROM public.org_memberships om
WHERE lower(om.role) = 'owner'
  AND EXISTS (SELECT 1 FROM public.cash_boxes b WHERE b.user_id = om.user_id AND b.org_id IS NULL);
