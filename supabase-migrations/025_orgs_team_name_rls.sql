-- Ensure Team Name (orgs.name) is database-backed and writable by owner/admin members.
DO $$
BEGIN
  IF to_regclass('public.orgs') IS NULL THEN
    RETURN;
  END IF;

  -- Enable RLS on orgs to ensure access is membership-scoped.
  EXECUTE 'ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY';

  -- Idempotent policy recreation.
  EXECUTE 'DROP POLICY IF EXISTS "Org members can view org" ON public.orgs';
  EXECUTE 'CREATE POLICY "Org members can view org" ON public.orgs FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships m
      WHERE m.org_id = orgs.id
        AND m.user_id = auth.uid()
    )
  )';

  EXECUTE 'DROP POLICY IF EXISTS "Org owner admin can update name" ON public.orgs';
  EXECUTE 'CREATE POLICY "Org owner admin can update name" ON public.orgs FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.org_memberships m
      WHERE m.org_id = orgs.id
        AND m.user_id = auth.uid()
        AND lower(coalesce(m.role, '''')) IN (''owner'', ''admin'')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.org_memberships m
      WHERE m.org_id = orgs.id
        AND m.user_id = auth.uid()
        AND lower(coalesce(m.role, '''')) IN (''owner'', ''admin'')
    )
  )';
END
$$;
