-- If 055 was already applied: org-scoped MAX missed legacy contacts (org_id NULL, user_id = org owner).
-- That made the next sequence too low (e.g. 2 instead of continuing after the shared list).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_next_contact_sequence(p_user_id UUID, p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(c.sequence_number), 0) + 1 INTO next_seq
    FROM public.contacts c
    WHERE c.org_id = p_org_id
       OR (
         c.org_id IS NULL
         AND EXISTS (
           SELECT 1
           FROM public.orgs o
           WHERE o.id = p_org_id
             AND o.owner_user_id = c.user_id
         )
       );
    RETURN next_seq;
  END IF;

  SELECT COALESCE(MAX(c.sequence_number), 0) + 1 INTO next_seq
  FROM public.contacts c
  WHERE c.user_id = p_user_id
    AND c.org_id IS NULL;
  RETURN next_seq;
END;
$$;

COMMIT;
