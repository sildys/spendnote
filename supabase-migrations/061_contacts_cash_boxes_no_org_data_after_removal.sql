-- 061: Tighten contacts and cash_boxes SELECT RLS.
-- Same pattern as transactions (migration 059): if a row has org_id,
-- the user_id match alone is NOT enough. The user must also pass the
-- org+role check. After team removal, former members see ZERO org data.

BEGIN;

-- ── contacts SELECT ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Contacts org-aware select" ON public.contacts;

CREATE POLICY "Contacts org-aware select" ON public.contacts FOR SELECT USING (
  -- Personal contacts (no org): user_id match is sufficient
  (org_id IS NULL AND auth.uid() = user_id)
  OR
  -- Org contacts: must be org member + role-based check
  (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_memberships m
      WHERE m.org_id = contacts.org_id
        AND m.user_id = auth.uid()
    )
    AND (
      public.spendnote_is_org_owner_or_admin(contacts.org_id)
      OR
      EXISTS (
        SELECT 1
        FROM public.cash_box_memberships cbm
        JOIN public.cash_boxes cb ON cb.id = cbm.cash_box_id
        WHERE cbm.user_id = auth.uid()
          AND cb.org_id = contacts.org_id
      )
    )
  )
);

-- ── cash_boxes SELECT ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cash boxes org-aware select" ON public.cash_boxes;

CREATE POLICY "Cash boxes org-aware select" ON public.cash_boxes FOR SELECT USING (
  -- Personal cash boxes (no org): user_id match is sufficient
  (org_id IS NULL AND auth.uid() = user_id)
  OR
  -- Org cash boxes: must be org member + role-based check
  (
    org_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.org_memberships m
      WHERE m.org_id = cash_boxes.org_id
        AND m.user_id = auth.uid()
    )
    AND (
      public.spendnote_is_org_owner_or_admin(cash_boxes.org_id)
      OR
      cash_boxes.id IN (SELECT public.spendnote_my_assigned_cash_box_ids())
    )
  )
);

COMMIT;
