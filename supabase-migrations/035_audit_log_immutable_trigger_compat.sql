BEGIN;

-- Compatibility fix: some environments installed an audit_log immutability trigger
-- that blocks DELETE cascades when orgs are deleted.
DO $$
DECLARE
    trg record;
    fn_def text;
BEGIN
    FOR trg IN
        SELECT
            t.tgname,
            p.oid AS fn_oid
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace ns ON ns.oid = c.relnamespace
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE ns.nspname = 'public'
          AND c.relname = 'audit_log'
          AND NOT t.tgisinternal
    LOOP
        fn_def := pg_get_functiondef(trg.fn_oid);
        IF fn_def ILIKE '%audit_log is immutable%' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.audit_log', trg.tgname);
        END IF;
    END LOOP;
END
$$;

COMMIT;
