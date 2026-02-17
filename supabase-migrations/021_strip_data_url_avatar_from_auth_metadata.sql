-- Remove legacy oversized avatar data URLs from auth metadata.
-- Storing base64 image data in auth.users.raw_user_meta_data can inflate JWT/session
-- payloads and cause request failures on authenticated API calls.

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'avatar_url'
WHERE raw_user_meta_data ? 'avatar_url'
  AND COALESCE(raw_user_meta_data->>'avatar_url', '') ILIKE 'data:%';
