-- Contact delete: org members with role "user" may not delete shared (org) contacts.
-- Allow: personal rows (org_id null, own user_id), org rows for owner/admin, legacy owner rows for owner/admin.

BEGIN;

DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Contacts org-aware delete" ON public.contacts;
-- Idempotent re-run (e.g. after a partial paste or failed attempt):
DROP POLICY IF EXISTS "Contacts delete owner admin or personal" ON public.contacts;

CREATE POLICY "Contacts delete owner admin or personal"
ON public.contacts
FOR DELETE
USING (
  (contacts.org_id IS NULL AND auth.uid() = contacts.user_id)
  OR (
    contacts.org_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_memberships m
      WHERE m.org_id = contacts.org_id
        AND m.user_id = auth.uid()
        AND lower(m.role) IN ('owner', 'admin')
    )
  )
  OR (
    contacts.org_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_memberships m
      INNER JOIN public.orgs o ON o.id = m.org_id
      WHERE m.user_id = auth.uid()
        AND lower(m.role) IN ('owner', 'admin')
        AND o.owner_user_id = contacts.user_id
    )
  )
);

COMMIT;
