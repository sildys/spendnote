-- Allow org admins to update the workspace owner's receipt-identity columns on profiles
-- (company_name, phone, address, logo). SECURITY DEFINER; membership + role checked inside.

BEGIN;

CREATE OR REPLACE FUNCTION public.spendnote_patch_org_owner_profile(p_org_id uuid, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_role text;
BEGIN
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'p_org_id required';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'p_patch must be a JSON object';
  END IF;

  SELECT o.owner_user_id, lower(coalesce(m.role, ''))
  INTO v_owner_id, v_role
  FROM public.orgs o
  INNER JOIN public.org_memberships m ON m.org_id = o.id AND m.user_id = auth.uid()
  WHERE o.id = p_org_id
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'only organization admins can update the owner receipt profile';
  END IF;

  UPDATE public.profiles AS pr SET
    company_name = CASE WHEN p_patch ? 'company_name' THEN (p_patch->>'company_name')::text ELSE pr.company_name END,
    phone = CASE WHEN p_patch ? 'phone' THEN (p_patch->>'phone')::text ELSE pr.phone END,
    address = CASE WHEN p_patch ? 'address' THEN (p_patch->>'address')::text ELSE pr.address END,
    account_logo_url = CASE WHEN p_patch ? 'account_logo_url' THEN (p_patch->>'account_logo_url')::text ELSE pr.account_logo_url END,
    logo_settings = CASE WHEN p_patch ? 'logo_settings' THEN p_patch->'logo_settings' ELSE pr.logo_settings END,
    updated_at = NOW()
  WHERE pr.id = v_owner_id;

  RETURN (SELECT to_jsonb(sub.*) FROM public.profiles sub WHERE sub.id = v_owner_id);
END;
$$;

REVOKE ALL ON FUNCTION public.spendnote_patch_org_owner_profile(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spendnote_patch_org_owner_profile(uuid, jsonb) TO authenticated;

COMMIT;
