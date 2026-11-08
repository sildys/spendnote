-- 073: Run send-onboarding-emails once a day at 15:00 UTC (morning in the US).
-- Requires 072. Safe to re-run: the old job is replaced.
--
-- Pause:  SELECT cron.unschedule('spendnote-onboarding-emails');
-- Runs:   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'spendnote-onboarding-emails';

SELECT cron.schedule(
  'spendnote-onboarding-emails',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zrnnharudlgxuvewqryj.supabase.co/functions/v1/send-onboarding-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'onboarding_cron_secret')
    ),
    body := '{"mode":"run"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
