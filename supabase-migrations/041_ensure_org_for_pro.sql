-- 041: Auto-create org + owner membership when Pro user has no org yet
-- Called from team page on first visit after upgrading to Pro.
-- Idempotent: if org already exists, returns existing org.

BEGIN;

CREATE OR REPLACE FUNCTION public.spendnote_ensure_org_for_pro(
  p_team_name text DEFAULT 'My Team'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_tier text;
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

  IF v_tier NOT IN ('pro', 'preview') THEN
    RAISE EXCEPTION 'PRO_REQUIRED';
  END IF;

  -- Check if user already has an org (as owner)
  SELECT om.org_id INTO v_org_id
  FROM public.org_memberships om
  WHERE om.user_id = v_actor AND lower(om.role) = 'owner'
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    -- Already has org, optionally update name if provided
    v_team_name := nullif(trim(p_team_name), '');
    IF v_team_name IS NOT NULL THEN
      UPDATE public.orgs SET name = v_team_name, updated_at = now()
      WHERE id = v_org_id AND owner_user_id = v_actor;
    END IF;

    RETURN jsonb_build_object(
      'org_id', v_org_id,
      'created', false
    );
  END IF;

  -- Also check if user is member (not owner) of any org
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

  -- No org exists — create one
  v_team_name := coalesce(nullif(trim(p_team_name), ''), 'My Team');

  INSERT INTO public.orgs (name, owner_user_id)
  VALUES (v_team_name, v_actor)
  RETURNING id INTO v_org_id;

  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES (v_org_id, v_actor, 'owner');

  RETURN jsonb_build_object(
    'org_id', v_org_id,
    'created', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spendnote_ensure_org_for_pro(text) TO authenticated;

COMMIT;
