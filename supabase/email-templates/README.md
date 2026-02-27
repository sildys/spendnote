# SpendNote Email Pack (L2)

This folder contains the 4 canonical HTML email templates:

1. `welcome-account-created.html`
2. `email-confirmation.html`
3. `youve-been-invited.html`
4. `invite-accepted-admin.html`

## Trigger + recipient mapping

- **Welcome / account created**
  - Trigger: first successful account creation (`SIGNED_UP` flow)
  - Recipient: newly created user

- **Email confirmation**
  - Trigger: Supabase Auth confirmation flow
  - Recipient: newly created user (unconfirmed)

- **You’ve been invited**
  - Trigger: admin/owner sends invite from Team UI
  - Recipient: invited email address
  - Current sender path: `supabase/functions/send-invite-email`

- **Invite accepted / user activated (admin notification)**
  - Trigger: invite token accepted successfully
  - Recipient: inviter admin/owner (or org admins per policy)

## Notes

- Keep legal footer line consistent:
  - `Cash handoff documentation only. Not a tax or accounting tool.`
  - `© SpendNote • spendnote.app`
- Keep button labels explicit and action-driven.
- Avoid marketing claims or fake social proof in transactional emails.
