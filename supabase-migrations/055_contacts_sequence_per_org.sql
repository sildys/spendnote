-- Contact display sequence: use one counter per org (shared workspace), not per inserting user.
-- Previously get_next_contact_sequence(user_id) caused each org member's first contact to be #1 again.

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
    -- Include legacy rows: org owner's contacts before org_id was stored (same idea as RLS 048).
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

CREATE OR REPLACE FUNCTION public.get_next_contact_sequence(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
BEGIN
  RETURN public.get_next_contact_sequence(p_user_id, NULL::uuid);
END;
$$;

CREATE OR REPLACE FUNCTION public.spendnote_set_contact_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    NEW.sequence_number := public.get_next_contact_sequence(NEW.user_id, NEW.org_id);
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
