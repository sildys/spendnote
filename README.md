# SpendNote (demo)

SpendNote is a **cash box + transaction + contacts** web app.

- Frontend: **static HTML/CSS/JavaScript** (no framework)
- Backend: **Supabase** (Auth + Postgres + RLS)

This repository is meant to be deployable as a static site (e.g. Vercel).

## What the app does (product)

- Track multiple **Cash Boxes** (registers) with balances
- Record **Transactions** (IN/OUT) into cash boxes
- Maintain **Contacts** and optionally attach a transaction to a saved contact
- Browse/search/filter **Transaction History**

## Main flows

### Authentication

- Auth uses Supabase Auth.
- Most app pages include `assets/js/auth-guard.js` which redirects to `spendnote-login.html` when not authenticated.

### Create a transaction (Dashboard modal)

- Create IN/OUT transaction via the dashboard modal.
- Optional: **Save to Contacts** toggle exists. The intended UX is minimal (no “magic” auto-create unless explicitly requested by the toggle/flow).
- **Negative cash box balance is blocked** for expenses (currently UI-side check).

### Contacts

- Contacts list + detail are wired to Supabase.
- UI uses a stable display ID: **`CONT-###`** derived from `contacts.sequence_number`.

### Transaction History

- Search/filter across transactions.
- Contact ID display is intentionally minimal:
  - if there is no saved contact sequence, show **`—`** (no placeholder `CONT-*`).

## Pages / routes (high level)

- Public
  - `index.html` (landing)
  - `spendnote-login.html`, `spendnote-signup.html`, `spendnote-forgot-password.html`
- App
  - `dashboard.html` (overview + create transaction modal)
  - `spendnote-cash-box-list.html`
  - `spendnote-cash-box-detail.html`
  - `spendnote-transaction-history.html`
  - `spendnote-transaction-detail.html`
  - `spendnote-contact-list.html`
  - `spendnote-contact-detail.html`
  - `spendnote-user-settings.html`

## Local development

### Requirements

- Node.js (only needed to run the tiny local static server)

### Run the app locally

Run:

```bat
start-server.bat
```

Then open:

- `http://localhost:8000`

## Supabase configuration

### Where credentials live

Supabase is configured in:

- `assets/js/supabase-config.js`

It defines:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `window.supabaseClient`
- `window.auth` (auth wrapper)
- `window.db` (DB access wrappers)

### Session behavior

The Supabase client is configured to use **`sessionStorage`**, so closing the tab/browser drops the session.

### Important security note

- Browser code must only use the **anon/public key**.
- Never put a Supabase **service role key** into this repo.

## Code structure (important entry points)

### Shared CSS

- `assets/css/main.css`
- `assets/css/app-layout.css`

### Shared JS

- `assets/js/supabase-config.js`
  - Defines the data layer (`window.db.*`) and auth helpers.
- `assets/js/auth-guard.js`
  - Redirects unauthenticated users to login on app pages.
- `assets/js/nav-loader.js`
  - Injects the shared navigation (`loadNav()`), binds logout + “New Transaction”.
- `assets/js/main.js`
  - Global helpers (formatting, nav avatar, logout binding, theme color persistence).

### Page-specific JS

- Dashboard transaction UI: `assets/js/dashboard-form.js`
- Transaction History UI/data: `assets/js/transaction-history-data.js`

## Database invariants (critical)

### profiles vs auth.users

- App tables are scoped by `user_id` that references **`public.profiles(id)`**.
- This means a **profile row must exist** for a newly registered auth user, otherwise FK/RLS will break.

### RLS

- RLS is enabled.
- Policies typically enforce ownership via `auth.uid() = user_id`.

### Stable display IDs

- Contacts: `contacts.sequence_number` -> `CONT-###`
- Transactions: may use sequence fields (`cash_box_sequence`, `tx_sequence_in_box`) for stable receipt-like IDs.

### Cash box ordering

- Cash boxes try to use `sort_order` for stable ordering, with fallback to `created_at`.

## Migrations / schema

- Base schema + docs: `database/schema.sql`, `database/SCHEMA-DOCUMENTATION.md`
- Supabase migrations: `supabase-migrations/*.sql`

## Deployment

This repo is designed to work as a static deployment.

- Vercel config: `vercel.json`
  - Uses immutable caching for `/assets/*`.

## Troubleshooting

- **Redirect loop to login**
  - Check that `SUPABASE_URL` / `SUPABASE_ANON_KEY` are correct.
  - Check that your Supabase Auth settings allow the current site origin.
- **“No authenticated user” in console**
  - You are not logged in, or session expired (expected when tab/browser closed).
- **Foreign key / RLS errors on inserts**
  - Ensure a `public.profiles` row exists for the auth user.

## “New chat starter” (so you don’t need to re-explain)

If a chat thread resets/freezes, start the new chat with:

- "Read `PROGRESS.md` and `README.md`, then continue from there."

## Progress tracking

- Canonical status: `PROGRESS.md`
- Session snapshot (2026-01-30): `SESSION-NOTES-2026-01-30.md`
