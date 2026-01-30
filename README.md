# SpendNote (demo)

SpendNote is a cash receipt / cash box management web app.
The UI is implemented as **static HTML/CSS/JavaScript** and uses **Supabase** for authentication and database operations.

## What the app does (product)
- Manage **Cash Boxes** (registers) with balances
- Record **Transactions** (IN/OUT) into cash boxes
- Manage **Contacts** and optionally attach a transaction to a saved contact
- Browse/search/filter **Transaction History**

## Main user flows
### 1) Sign in
- Pages use Supabase Auth.
- App pages are protected by `assets/js/auth-guard.js`.

### 2) Create a transaction (Dashboard modal)
- Open Dashboard, create an IN/OUT transaction via modal.
- Optional: **Save to Contacts** toggle controls whether the contact should be saved as a Contact (implementation is intentionally minimal; no hidden/automatic contact creation).
- **Negative cash box balance is blocked** for expenses (UI-side check).

### 3) Manage Contacts
- Contacts list and contact detail are wired to Supabase.
- Contacts show a stable display ID: **`CONT-###`** derived from `sequence_number`.

### 4) Transaction History
- Search/filter across transactions.
- Contact ID display is intentionally minimal:
  - if there is no saved contact sequence, it shows **`—`** (no placeholder `CONT-*`).

## Pages (high level)
- `index.html` / `dashboard.html`: overview + new transaction modal
- `spendnote-cash-box-list.html`: cash boxes list
- `spendnote-cash-box-detail.html`: cash box detail
- `spendnote-transaction-history.html`: transaction history
- `spendnote-transaction-detail.html`: transaction detail
- `spendnote-contact-list.html`: contacts list
- `spendnote-contact-detail.html`: contact detail
- `spendnote-user-settings.html`: user settings

## Tech / code structure
### Frontend
- No framework (vanilla JS).
- Shared styles:
  - `assets/css/main.css`
  - `assets/css/app-layout.css`
- Shared JS:
  - `assets/js/main.js`
  - `assets/js/nav-loader.js`
  - `assets/js/auth-guard.js`

### Supabase integration
- Supabase client config: `assets/js/supabase-config.js`
- Most data access goes through `window.db.*` helpers defined there.

## Database invariants (important)
- **User scoping** is done via `public.profiles`.
  - App tables reference `public.profiles(id)` via `user_id`.
  - This is not the same as referencing `auth.users` directly.
- **RLS is enabled** and policies typically use `auth.uid() = user_id`.
- **Sequence numbers** are used for stable display IDs:
  - Contacts: `sequence_number` -> `CONT-###`
  - Transactions: may use sequence fields (depending on schema/migrations) for stable receipt-like IDs.

## Local development
### Run
- Use `start-server.bat` to serve the static files.

### Configure Supabase
- Set your Supabase URL + anon key in `assets/js/supabase-config.js` (or the referenced config file if split).
- Never use the service role key in the browser.

## “New chat starter” (to avoid re-explaining everything)
If a chat thread resets/freeze happens, start the new chat with:
- "Read `PROGRESS.md` and `README.md`, then continue from there."

## Progress tracking
- Canonical status: `PROGRESS.md`
- Session snapshot (2026-01-30): `SESSION-NOTES-2026-01-30.md`
