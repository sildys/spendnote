BEGIN;

-- Compatibility fix: ensure audit_log has full expected columns used by triggers/functions.
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

ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_id uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS target_id uuid;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill safe defaults for rows created before these columns existed.
UPDATE public.audit_log
SET action = coalesce(nullif(action, ''), 'legacy.event')
WHERE action IS NULL;

ALTER TABLE public.audit_log
    ALTER COLUMN action SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'audit_log_org_id_fkey'
          AND conrelid = 'public.audit_log'::regclass
    ) THEN
        ALTER TABLE public.audit_log
            ADD CONSTRAINT audit_log_org_id_fkey
            FOREIGN KEY (org_id)
            REFERENCES public.orgs(id)
            ON DELETE CASCADE;
    END IF;

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

CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON public.audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created ON public.audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log(actor_id);

COMMIT;
