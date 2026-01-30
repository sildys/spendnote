# Session Notes — 2026-01-30

## Context
This file captures the relevant conversation/history from the previous (frozen) chat thread so the current repo state and decisions stay recoverable from Git.

## Decisions
- **Transaction History Contact ID minimalism**: if a transaction has no saved contact (no `sequence_number`), the UI shows **`—`** (no extra `CONT-*` placeholder marker).
  - **Pros**
    - Doesn’t look like an error state.
    - Doesn’t introduce a “half ID” (like `CONT-`).
    - Consistent: Contact ID column only has value if a saved contact + sequence exists.
  - **Tradeoffs**
    - “Unsaved contact” set is not easily searchable/filterable.
    - Later QA/support question (“why no contact ID?”) answer is: contact wasn’t saved as a Contact (inferred via “Save to Contacts” behavior).
  - Optional idea (not implemented): tooltip on `—` (no visual change) to hint the reason.

## Work Done (as recorded)
### Dashboard: Save to Contacts toggle
- Added a **“Save to Contacts”** checkbox in the dashboard transaction modal.
- It was intentionally implemented as **toggle only (no auto-save)** at that point.

### Fix: Save to Contacts layout
- The checkbox UI initially broke the modal grid layout.
- Fixed by moving it to an inline row under the name field and removing the layout-breaking block.

### Fix: Transaction insert “does nothing”
- Issue: dashboard JS failed during load due to duplicate modal state declaration:
  - `Uncaught SyntaxError: Identifier 'lastModalFocusEl' has already been declared`
- Cause: modal script effectively ran twice (inline modal code + `assets/js/dashboard-modal.js`).
- Fix: removed duplicate modal script include and re-bound submit/init code reliably.

### Fix: prevent negative cash box balance + checkbox accent
- Prevent “expense” that would drive a cash box balance negative:
  - before insert, load `cash_boxes.current_balance` and block if insufficient.
- Checkbox accent was red; fixed to use theme active/neutral via `accent-color: var(--active)`.

### Contacts: CONT-### + Supabase wiring
- Contacts list/detail were wired to Supabase.
- Contact UI shows **`CONT-###`** using `sequence_number`.
- Search supports `CONT-###`.
- Detail supports loading by UUID (and resolving `CONT-###` if implemented).

### Contacts list: match Transaction History UI
- Request: make Contacts list **View column + bottom paginator** match Transaction History.
- This work was continued in the new thread; the latest state is represented by subsequent commits.

## Relevant Commits (from git log)
- `35728eb` Dashboard: add Save to Contacts toggle (no auto-save)
- `8be9b55` Fix Save to Contacts checkbox layout
- `d3e9ee0` Fix dashboard modal JS load (remove duplicate modal script) and bind submit handler
- `e266fc6` Prevent negative cash box balance; fix Save to Contacts checkbox color
- `12f6f9f` Contacts: show/search CONT-### and wire list/detail to Supabase
- `060be6e` Contacts: align View action + paginator with transaction history

## Next Focus (open)
- Stabilize core ID handling across flows (cash_box_id + contact_id selection/validation in create tx + filters).
