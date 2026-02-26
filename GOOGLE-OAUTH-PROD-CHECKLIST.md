# Google OAuth Production Checklist

Status: code-side flow wired and runtime-validated in app. This checklist covers final dashboard-side production validation.

## 1) Supabase Auth Provider: Google

1. Open Supabase Dashboard -> Authentication -> Providers -> Google.
2. Confirm Google provider is **enabled**.
3. Confirm production Google OAuth Client ID / Secret are set (not test placeholders).
4. Save and verify no provider error toast appears.

## 2) Supabase URL Configuration

Open Supabase Dashboard -> Authentication -> URL Configuration.

### Required Site URL
- `https://spendnote.app`

### Required Additional Redirect URLs
Use exact host(s) that are live in production:
- `https://spendnote.app/spendnote-login.html`
- `https://spendnote.app/spendnote-welcome.html`
- `https://spendnote.app/spendnote-reset-password.html`

If `www` is still reachable in production, add these too:
- `https://www.spendnote.app/spendnote-login.html`
- `https://www.spendnote.app/spendnote-welcome.html`
- `https://www.spendnote.app/spendnote-reset-password.html`

## 3) Google Cloud Console OAuth Client

1. Open Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client.
2. Add Authorized JavaScript origins:
   - `https://spendnote.app`
   - `https://www.spendnote.app` (only if used)
3. Add Authorized redirect URIs:
   - `https://zrnnharudlgxuvewqryj.supabase.co/auth/v1/callback`
4. Publish consent screen status to **In production**.
5. Ensure `spendnote.app` is in Authorized domains.

## 4) App flow checks (must pass)

## 4.1 Login flow
- Start from `spendnote-login.html`.
- Click "Continue with Google".
- Confirm Google account chooser appears (prompt=select_account).
- After callback, confirm redirect lands on requested app page (returnTo handling).

## 4.2 Signup flow
- Start from `spendnote-signup.html`.
- Click "Continue with Google".
- Confirm redirect ends on `spendnote-welcome.html`.

## 4.3 Invite-token handoff
- Open login/signup page with `?inviteToken=...`.
- Complete Google auth.
- Confirm invite gets accepted after session bootstrap.
- Confirm user lands in org context with expected role.

## 5) Account-linking policy decision (manual)

Selected production policy:

1. **Auto-link to the same account when email matches and is verified**
   - Goal: avoid duplicate accounts and reduce login friction.
   - Guardrail: keep clear error messaging for conflicts or unverified email edge cases.

Policy decision status: **chosen (2026-02-26)**.

## 6) Code references (for audit)

- Login Google OAuth trigger: `spendnote-login.html`
- Signup Google OAuth trigger: `spendnote-signup.html`
- Invite token persistence + callback handling: `assets/js/supabase-config.js`
- Password reset redirect target: `assets/js/supabase-config.js`

## 7) Completion criteria

Mark Google OAuth production checks complete when:
- Provider config verified
- URL whitelist verified (Supabase + Google)
- Login + signup + invite flows pass in production
- Account-linking policy explicitly chosen and documented
