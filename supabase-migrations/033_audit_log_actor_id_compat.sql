BEGIN;

-- Compatibility fix: some environments have public.audit_log without actor_id.
-- Deletion and audit triggers expect this column to exist.
CREATE TABLE IF NOT EXISTS public.audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log
    ADD COLUMN IF NOT EXISTS actor_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'audit_log_actor_id_fkey'
          AND conrelid = 'public.audit_log'::regclass
    ) THEN
        ALTER TABLE public.audit_log
            ADD CONSTRAINT audit_log_actor_id_fkey
            FOREIGN KEY (actor_id)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);

-- If legacy schema had user_id instead of actor_id, backfill actor_id.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
          AND column_name = 'user_id'
    ) THEN
        EXECUTE 'UPDATE public.audit_log
                 SET actor_id = user_id
                 WHERE actor_id IS NULL AND user_id IS NOT NULL';
    END IF;
END
$$;

COMMIT;
