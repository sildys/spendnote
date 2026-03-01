BEGIN;

-- Compatibility fix:
-- During org deletion (ON DELETE CASCADE), AFTER DELETE trigger on org_memberships
-- may try to insert an audit_log row that references an org row already removed,
-- causing FK violation on audit_log.org_id.
CREATE OR REPLACE FUNCTION public.trg_audit_org_membership_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Only log if role actually changed and org still exists.
        IF lower(coalesce(OLD.role, '')) IS DISTINCT FROM lower(coalesce(NEW.role, ''))
           AND EXISTS (SELECT 1 FROM public.orgs o WHERE o.id = NEW.org_id) THEN
            PERFORM public.spendnote_write_audit_log(
                NEW.org_id, auth.uid(), 'member.role_change', 'user', NEW.user_id,
                jsonb_build_object(
                    'old_role', coalesce(OLD.role, ''),
                    'new_role', coalesce(NEW.role, '')
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Skip logging if parent org is already gone (cascade delete path).
        IF EXISTS (SELECT 1 FROM public.orgs o WHERE o.id = OLD.org_id) THEN
            PERFORM public.spendnote_write_audit_log(
                OLD.org_id, auth.uid(), 'member.remove', 'user', OLD.user_id,
                jsonb_build_object('role', coalesce(OLD.role, ''))
            );
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_org_membership_change ON public.org_memberships;
CREATE TRIGGER audit_org_membership_change
    AFTER UPDATE OR DELETE ON public.org_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_audit_org_membership_change();

COMMIT;
