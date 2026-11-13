-- 074: Welcome email at most once per account.
--
-- send-user-event-email (welcome_account_created) now claims an email_log row
-- with email_type = 'welcome' before sending, and skips accounts older than
-- 7 days. Mark the welcome as already sent for recent accounts that got it
-- before this change, so the dashboard does not send it a second time.
-- The 2026-11-13 Google sign-up (7d82a356-...) never received it and is left out.

INSERT INTO public.email_log (user_id, email_type, sent_at)
SELECT u.id, 'welcome', u.created_at
FROM auth.users u
WHERE u.created_at > now() - interval '8 days'
  AND u.created_at < '2026-11-13T18:00:00Z'
  AND u.id <> '7d82a356-d808-4633-97ac-0b7f60bd8e4f'
ON CONFLICT (user_id, email_type) DO NOTHING;
