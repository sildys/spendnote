-- Greenfield Studio demo reset for support@spendnote.app ONLY.
--
-- Replaces whatever is on that test account (including the babysitter setup)
-- with a Pro yearly plan, one team, three cash boxes, and recent transactions.
-- Does not set Stripe ids and does not upload the logo.
--
-- HOW TO RUN (Supabase SQL Editor):
--   1. Leave v_apply = false and run. It prints counts and writes nothing.
--   2. Read the error text (a red "error" here is expected). The member list must
--      contain only test logins, never a paying customer.
--   3. Create emma.collins@spendnote.app in Authentication → Add user
--      (email confirmed) if she should appear as a teammate.
--   4. Set v_apply = true and run again.
--
-- Re-running with v_apply = true wipes this account's demo data and rebuilds it.
-- Other customers are out of scope: a row is deleted only when its org is owned
-- by support@spendnote.app, or it is a personal row of that same user.

DO $$
DECLARE
    -- SAFETY SWITCH. false = preview only. true = write.
    v_apply constant boolean := false;

    v_owner_id uuid;
    v_emma_id uuid;
    v_org_id uuid;

    v_org_count integer;
    v_box_count integer;
    v_tx_count integer;
    v_contact_count integer;
    v_other_members text;
    v_box_ids uuid[];

    v_office_cash_box_id constant uuid := '4f8c1df6-6b8f-4fdb-97ef-78bd2f38f301';
    v_event_cash_box_id  constant uuid := 'd8e6bb85-d9ac-4b5c-9271-371866a18f02';
    v_coffee_cash_box_id constant uuid := '601f8f4e-424d-4201-a182-8cadf4de5b03';

    v_contact_staples_id        constant uuid := '3336f2b5-ebed-4a03-8251-753f47afec01';
    v_contact_parking_id        constant uuid := 'fdb4be89-b8bb-4d90-b7fd-e4fd474d8602';
    v_contact_snacks_id         constant uuid := '2f6f6cc5-c5bb-4c0f-b7d8-0af2e2ac6403';
    v_contact_alex_id           constant uuid := 'cd01f0c2-8190-43ff-a8e4-c2e1e4e5ec04';
    v_contact_owner_id          constant uuid := '2b9d285e-c5f2-4c50-a856-c8fa4bc28005';
    v_contact_cleaning_id       constant uuid := 'e1152a89-2f4a-4e7f-a4a5-3d589516f406';
    v_contact_taxi_id           constant uuid := '2f777892-b972-48fd-a7dd-966ef0015607';
    v_contact_client_refund_id  constant uuid := '8b38b412-aed8-4845-9ae2-4d8fcb498408';
    v_contact_event_booth_id    constant uuid := '3af23011-6d4a-4fd7-bf05-7fa80f8f7809';
    v_contact_temp_staff_id     constant uuid := 'f2ba8169-bd5d-48eb-bdb3-486503264e10';
    v_contact_event_sales_id    constant uuid := 'f6642c77-dd07-420b-a69f-06f35f472211';
    v_contact_event_catering_id constant uuid := '82687d9c-e03a-4f4f-b344-d51347e22512';
    v_contact_event_return_id   constant uuid := 'ff855adc-036d-4f6e-a504-dff8bd44f013';
    v_contact_beans_id          constant uuid := '7c5e267e-95d8-4cd6-9cd4-a8c5b0ff8f14';
    v_contact_milk_id           constant uuid := '1060bcb2-cf0f-49f7-b35b-adf5b77da215';
    v_contact_coffee_team_id    constant uuid := '5d6cc1f8-c8b6-4f3f-baf0-c1baec3bc016';
    v_contact_coffee_repair_id  constant uuid := '9588efd8-7d00-4f5f-b000-79fe68f6d317';

    v_wrong_tx_id uuid;
    v_void_tx_id uuid;
    v_emma_actor uuid;

    v_has_status boolean;
    v_has_is_system boolean;
    v_has_voided_at boolean;
    v_has_voided_by_user_id boolean;
    v_has_voided_by_user_name boolean;
    v_has_void_tx_id boolean;
    v_has_void_reason boolean;
    v_has_original_tx_id boolean;
    v_has_original_transaction_id boolean;
    v_has_pending_tier boolean;
    v_has_pending_date boolean;
    v_has_tier_pending boolean;
BEGIN
    SELECT p.id
    INTO v_owner_id
    FROM public.profiles p
    WHERE lower(p.email) = 'support@spendnote.app';

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Stopped. No profile with email support@spendnote.app.';
    END IF;

    SELECT COALESCE(array_agg(cb.id), ARRAY[]::uuid[])
    INTO v_box_ids
    FROM public.cash_boxes cb
    WHERE cb.org_id IN (
            SELECT o.id FROM public.orgs o WHERE o.owner_user_id = v_owner_id
          )
       OR (cb.user_id = v_owner_id AND cb.org_id IS NULL);

    SELECT count(*) INTO v_org_count
    FROM public.orgs o
    WHERE o.owner_user_id = v_owner_id;

    v_box_count := COALESCE(array_length(v_box_ids, 1), 0);

    SELECT count(*) INTO v_tx_count
    FROM public.transactions t
    WHERE t.cash_box_id = ANY (v_box_ids);

    SELECT count(*) INTO v_contact_count
    FROM public.contacts c
    WHERE c.org_id IN (SELECT o.id FROM public.orgs o WHERE o.owner_user_id = v_owner_id)
       OR (c.user_id = v_owner_id AND c.org_id IS NULL);

    -- Removing these members fires cleanup_after_org_member_remove, which also
    -- deletes each removed member's own empty, transaction-less personal cash boxes.
    SELECT COALESCE(string_agg(DISTINCT p.email, ', '), 'none')
    INTO v_other_members
    FROM public.org_memberships m
    JOIN public.profiles p ON p.id = m.user_id
    WHERE m.org_id IN (SELECT o.id FROM public.orgs o WHERE o.owner_user_id = v_owner_id)
      AND m.user_id <> v_owner_id;

    IF NOT v_apply THEN
        RAISE EXCEPTION
            'PREVIEW ONLY. Nothing was written. Account support@spendnote.app would lose % org(s), % cash box(es), % transaction(s), % contact(s). Members removed from its team: %. Each removed member also loses their own empty personal cash boxes. If every email above is a test login, set v_apply := true and run again.',
            v_org_count, v_box_count, v_tx_count, v_contact_count, v_other_members;
    END IF;

    RAISE NOTICE 'Applying Greenfield reset for support@spendnote.app. Replacing % org(s), % cash box(es), % transaction(s), % contact(s).',
        v_org_count, v_box_count, v_tx_count, v_contact_count;

    UPDATE public.profiles
    SET
        full_name = 'Daniel Reed',
        company_name = 'Greenfield Studio',
        address = '214 West 5th Street, Austin, TX 78701',
        phone = '+1 512-555-0184',
        subscription_tier = 'pro',
        billing_status = 'active',
        billing_cycle = 'yearly',
        subscription_current_period_end = now() + interval '1 year',
        seat_count = 3,
        stripe_cancel_at_period_end = false,
        trial_started_at = NULL,
        trial_ends_at = NULL
    WHERE id = v_owner_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pending_subscription_tier'
    ) INTO v_has_pending_tier;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pending_tier_effective_date'
    ) INTO v_has_pending_date;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tier_cash_boxes_pending'
    ) INTO v_has_tier_pending;

    IF v_has_pending_tier THEN
        UPDATE public.profiles SET pending_subscription_tier = NULL WHERE id = v_owner_id;
    END IF;
    IF v_has_pending_date THEN
        EXECUTE 'UPDATE public.profiles SET pending_tier_effective_date = NULL WHERE id = $1'
        USING v_owner_id;
    END IF;
    IF v_has_tier_pending THEN
        UPDATE public.profiles SET tier_cash_boxes_pending = false WHERE id = v_owner_id;
    END IF;

    SELECT o.id
    INTO v_org_id
    FROM public.orgs o
    WHERE o.owner_user_id = v_owner_id
    ORDER BY (o.name = 'Greenfield Studio') DESC,
             (SELECT count(*) FROM public.cash_boxes cb WHERE cb.org_id = o.id) DESC,
             o.created_at ASC
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO public.orgs (name, owner_user_id)
        VALUES ('Greenfield Studio', v_owner_id)
        RETURNING id INTO v_org_id;
    ELSE
        UPDATE public.orgs
        SET name = 'Greenfield Studio'
        WHERE id = v_org_id;
    END IF;

    INSERT INTO public.org_memberships (org_id, user_id, role)
    VALUES (v_org_id, v_owner_id, 'owner')
    ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = 'owner';

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'void_tx_id'
    ) INTO v_has_void_tx_id;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'original_tx_id'
    ) INTO v_has_original_tx_id;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'original_transaction_id'
    ) INTO v_has_original_transaction_id;

    IF v_has_void_tx_id THEN
        UPDATE public.transactions SET void_tx_id = NULL WHERE cash_box_id = ANY (v_box_ids);
    END IF;
    IF v_has_original_tx_id THEN
        UPDATE public.transactions SET original_tx_id = NULL WHERE cash_box_id = ANY (v_box_ids);
    END IF;
    IF v_has_original_transaction_id THEN
        EXECUTE 'UPDATE public.transactions SET original_transaction_id = NULL WHERE cash_box_id = ANY ($1)'
        USING v_box_ids;
    END IF;

    DELETE FROM public.transactions WHERE cash_box_id = ANY (v_box_ids);
    DELETE FROM public.cash_boxes WHERE id = ANY (v_box_ids);
    DELETE FROM public.contacts
    WHERE org_id IN (SELECT o.id FROM public.orgs o WHERE o.owner_user_id = v_owner_id)
       OR (user_id = v_owner_id AND org_id IS NULL);

    DELETE FROM public.invites
    WHERE org_id IN (SELECT o.id FROM public.orgs o WHERE o.owner_user_id = v_owner_id);

    DELETE FROM public.audit_log
    WHERE org_id IN (SELECT o.id FROM public.orgs o WHERE o.owner_user_id = v_owner_id);

    DELETE FROM public.orgs
    WHERE owner_user_id = v_owner_id
      AND id <> v_org_id;

    DELETE FROM public.org_memberships
    WHERE org_id = v_org_id
      AND user_id <> v_owner_id;

    SELECT p.id
    INTO v_emma_id
    FROM public.profiles p
    WHERE lower(p.email) = 'emma.collins@spendnote.app';

    v_emma_actor := COALESCE(v_emma_id, v_owner_id);

    IF v_emma_id IS NOT NULL THEN
        UPDATE public.profiles
        SET full_name = 'Emma Collins'
        WHERE id = v_emma_id;

        INSERT INTO public.org_memberships (org_id, user_id, role)
        VALUES (v_org_id, v_emma_id, 'admin')
        ON CONFLICT (org_id, user_id) DO UPDATE
        SET role = 'admin';
    END IF;

    -- Opening balances. The balance trigger adds each transaction on insert.
    -- Expected after load: Office 586.45, Event 1110.00, Coffee 152.00.
    INSERT INTO public.cash_boxes (
        id, user_id, org_id, name, currency, color, icon, id_prefix, sequence_number, current_balance
    )
    VALUES
        (v_office_cash_box_id, v_owner_id, v_org_id, 'Office Petty Cash', 'USD', '#10b981', 'briefcase', 'SN', 1, 500.00),
        (v_event_cash_box_id,  v_owner_id, v_org_id, 'Event Float',       'USD', '#f59e0b', 'calendar',  'SN', 2, 1000.00),
        (v_coffee_cash_box_id, v_owner_id, v_org_id, 'Coffee Fund',       'USD', '#3b82f6', 'coffee',    'SN', 3, 200.00);

    INSERT INTO public.cash_box_memberships (cash_box_id, user_id)
    VALUES
        (v_office_cash_box_id, v_owner_id),
        (v_event_cash_box_id, v_owner_id),
        (v_coffee_cash_box_id, v_owner_id)
    ON CONFLICT (cash_box_id, user_id) DO NOTHING;

    IF v_emma_id IS NOT NULL THEN
        INSERT INTO public.cash_box_memberships (cash_box_id, user_id)
        VALUES
            (v_office_cash_box_id, v_emma_id),
            (v_event_cash_box_id, v_emma_id),
            (v_coffee_cash_box_id, v_emma_id)
        ON CONFLICT (cash_box_id, user_id) DO NOTHING;
    END IF;

    INSERT INTO public.contacts (id, user_id, org_id, name, email, address, notes)
    VALUES
        (v_contact_staples_id,        v_owner_id, v_org_id, 'Staples (Austin)', NULL, 'Austin, TX', 'Office supplies'),
        (v_contact_parking_id,        v_owner_id, v_org_id, 'Downtown Parking', NULL, 'Austin, TX', 'Client parking'),
        (v_contact_snacks_id,         v_owner_id, v_org_id, 'Office Snack Shop', NULL, 'Austin, TX', 'Weekly snacks'),
        (v_contact_alex_id,           v_owner_id, v_org_id, 'Alex Turner', NULL, 'Austin, TX', 'Team member, contact only'),
        (v_contact_owner_id,          v_owner_id, v_org_id, 'Daniel Reed', 'support@spendnote.app', '214 West 5th Street, Austin, TX 78701', 'Owner deposit'),
        (v_contact_cleaning_id,       v_owner_id, v_org_id, 'BrightClean Supplies', NULL, 'Austin, TX', 'Cleaning products'),
        (v_contact_taxi_id,           v_owner_id, v_org_id, 'ATX Client Taxi', NULL, 'Austin, TX', 'Client meeting taxi'),
        (v_contact_client_refund_id,  v_owner_id, v_org_id, 'Client Refund Desk', NULL, 'Austin, TX', 'Unused client cash returned'),
        (v_contact_event_booth_id,    v_owner_id, v_org_id, 'Booth Setup Supplies', NULL, 'Austin, TX', 'Event setup'),
        (v_contact_temp_staff_id,     v_owner_id, v_org_id, 'Event Staff Pool', NULL, 'Austin, TX', 'Event staff payout'),
        (v_contact_event_sales_id,    v_owner_id, v_org_id, 'Event Cash Sales', NULL, 'Austin, TX', 'Cash collected at event'),
        (v_contact_event_catering_id, v_owner_id, v_org_id, 'Event Catering Co', NULL, 'Austin, TX', 'Catering deposit'),
        (v_contact_event_return_id,   v_owner_id, v_org_id, 'Event Float Return', NULL, 'Austin, TX', 'Unused float returned'),
        (v_contact_beans_id,          v_owner_id, v_org_id, 'Roastery Beans', NULL, 'Austin, TX', 'Coffee beans'),
        (v_contact_milk_id,           v_owner_id, v_org_id, 'Milk & Supplies Store', NULL, 'Austin, TX', 'Coffee supplies'),
        (v_contact_coffee_team_id,    v_owner_id, v_org_id, 'Greenfield Team', NULL, 'Austin, TX', 'Monthly coffee contribution'),
        (v_contact_coffee_repair_id,  v_owner_id, v_org_id, 'CoffeeFix Repair', NULL, 'Austin, TX', 'Coffee machine repair');

    INSERT INTO public.transactions (
        user_id, org_id, cash_box_id, contact_id, type, amount, description, notes,
        transaction_date, contact_name, created_by_user_id, created_by_user_name,
        cash_box_sequence, tx_sequence_in_box, receipt_number,
        cash_box_name_snapshot, cash_box_currency_snapshot, cash_box_id_prefix_snapshot,
        sender_company_name_snapshot, sender_address_snapshot, sender_phone_snapshot
    )
    VALUES
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_staples_id, 'expense', 42.80,
            'Printer Ink (Staples)', NULL, current_date - 14, 'Staples (Austin)', v_owner_id, 'Daniel Reed',
            1, 1, 'SN1-001', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_parking_id, 'expense', 18.00,
            'Client Parking', NULL, current_date - 13, 'Downtown Parking', v_emma_actor, 'Emma Collins',
            1, 2, 'SN1-002', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_snacks_id, 'expense', 36.40,
            'Office Snacks', NULL, current_date - 12, 'Office Snack Shop', v_owner_id, 'Alex Turner',
            1, 3, 'SN1-003', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_alex_id, 'expense', 68.50,
            'Team Lunch', 'Lunch receipt reimbursed', current_date - 11, 'Alex Turner', v_emma_actor, 'Emma Collins',
            1, 4, 'SN1-004', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_owner_id, 'income', 200.00,
            'Cash Top-Up (Owner Deposit)', 'Refill petty cash', current_date - 10, 'Daniel Reed', v_owner_id, 'Daniel Reed',
            1, 5, 'SN1-005', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_alex_id, 'income', 45.20,
            'Returned Unused Cash', 'Unused amount returned', current_date - 9, 'Alex Turner', v_owner_id, 'Alex Turner',
            1, 6, 'SN1-006', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_client_refund_id, 'income', 83.75,
            'Client Cash Returned', 'Unused client cash returned', current_date - 8, 'Client Refund Desk', v_emma_actor, 'Emma Collins',
            1, 7, 'SN1-007', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_cleaning_id, 'expense', 27.60,
            'Cleaning Supplies', NULL, current_date - 7, 'BrightClean Supplies', v_owner_id, 'Alex Turner',
            1, 8, 'SN1-008', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_taxi_id, 'expense', 34.20,
            'Taxi to Client Meeting', NULL, current_date - 6, 'ATX Client Taxi', v_emma_actor, 'Emma Collins',
            1, 9, 'SN1-009', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184');

    INSERT INTO public.transactions (
        user_id, org_id, cash_box_id, contact_id, type, amount, description, notes,
        transaction_date, contact_name, created_by_user_id, created_by_user_name,
        cash_box_sequence, tx_sequence_in_box, receipt_number,
        cash_box_name_snapshot, cash_box_currency_snapshot, cash_box_id_prefix_snapshot,
        sender_company_name_snapshot, sender_address_snapshot, sender_phone_snapshot
    )
    VALUES (
        v_owner_id, v_org_id, v_office_cash_box_id, v_contact_snacks_id, 'expense', 15.00,
        'Office Supplies (Wrong Entry)', 'Will be voided and corrected', current_date - 5, 'Office Snack Shop', v_emma_actor, 'Emma Collins',
        1, 10, 'SN1-010', 'Office Petty Cash', 'USD', 'SN',
        'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'
    )
    RETURNING id INTO v_wrong_tx_id;

    INSERT INTO public.transactions (
        user_id, org_id, cash_box_id, contact_id, type, amount, description, notes,
        transaction_date, contact_name, created_by_user_id, created_by_user_name,
        cash_box_sequence, tx_sequence_in_box, receipt_number,
        cash_box_name_snapshot, cash_box_currency_snapshot, cash_box_id_prefix_snapshot,
        sender_company_name_snapshot, sender_address_snapshot, sender_phone_snapshot
    )
    VALUES (
        v_owner_id, v_org_id, v_office_cash_box_id, v_contact_snacks_id, 'income', 15.00,
        'VOID AUTO REVERSAL', 'System reversal for wrong entry', current_date - 5, 'Office Snack Shop', v_owner_id, 'Emma Collins',
        1, 11, 'SN1-011', 'Office Petty Cash', 'USD', 'SN',
        'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'
    )
    RETURNING id INTO v_void_tx_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'status'
    ) INTO v_has_status;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'is_system'
    ) INTO v_has_is_system;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'voided_at'
    ) INTO v_has_voided_at;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'voided_by_user_id'
    ) INTO v_has_voided_by_user_id;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'voided_by_user_name'
    ) INTO v_has_voided_by_user_name;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'void_reason'
    ) INTO v_has_void_reason;

    IF v_has_is_system THEN
        UPDATE public.transactions SET is_system = true WHERE id = v_void_tx_id;
    END IF;
    IF v_has_original_tx_id THEN
        UPDATE public.transactions SET original_tx_id = v_wrong_tx_id WHERE id = v_void_tx_id;
    END IF;
    IF v_has_original_transaction_id THEN
        EXECUTE 'UPDATE public.transactions SET original_transaction_id = $1 WHERE id = $2'
        USING v_wrong_tx_id, v_void_tx_id;
    END IF;
    IF v_has_status THEN
        UPDATE public.transactions SET status = 'voided' WHERE id = v_wrong_tx_id;
    END IF;
    IF v_has_voided_at THEN
        UPDATE public.transactions SET voided_at = now() WHERE id = v_wrong_tx_id;
    END IF;
    IF v_has_voided_by_user_id THEN
        UPDATE public.transactions SET voided_by_user_id = v_owner_id WHERE id = v_wrong_tx_id;
    END IF;
    IF v_has_voided_by_user_name THEN
        UPDATE public.transactions SET voided_by_user_name = 'Emma Collins' WHERE id = v_wrong_tx_id;
    END IF;
    IF v_has_void_tx_id THEN
        UPDATE public.transactions SET void_tx_id = v_void_tx_id WHERE id = v_wrong_tx_id;
    END IF;
    IF v_has_void_reason THEN
        UPDATE public.transactions SET void_reason = 'Entered under the wrong category' WHERE id = v_wrong_tx_id;
    END IF;

    INSERT INTO public.transactions (
        user_id, org_id, cash_box_id, contact_id, type, amount, description, notes,
        transaction_date, contact_name, created_by_user_id, created_by_user_name,
        cash_box_sequence, tx_sequence_in_box, receipt_number,
        cash_box_name_snapshot, cash_box_currency_snapshot, cash_box_id_prefix_snapshot,
        sender_company_name_snapshot, sender_address_snapshot, sender_phone_snapshot
    )
    VALUES
        (v_owner_id, v_org_id, v_office_cash_box_id, v_contact_staples_id, 'expense', 15.00,
            'Corrected Entry – Office Supplies', NULL, current_date - 5, 'Staples (Austin)', v_emma_actor, 'Emma Collins',
            1, 12, 'SN1-012', 'Office Petty Cash', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_event_cash_box_id, v_contact_event_booth_id, 'expense', 120.00,
            'Booth Setup Supplies', NULL, current_date - 8, 'Booth Setup Supplies', v_emma_actor, 'Emma Collins',
            2, 1, 'SN2-001', 'Event Float', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_event_cash_box_id, v_contact_temp_staff_id, 'expense', 150.00,
            'Event Staff Payout', NULL, current_date - 7, 'Event Staff Pool', v_emma_actor, 'Emma Collins',
            2, 2, 'SN2-002', 'Event Float', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_event_cash_box_id, v_contact_event_sales_id, 'income', 480.00,
            'Cash Sales Collected', 'Cash taken in at the event', current_date - 6, 'Event Cash Sales', v_owner_id, 'Daniel Reed',
            2, 3, 'SN2-003', 'Event Float', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_event_cash_box_id, v_contact_event_catering_id, 'expense', 200.00,
            'Catering Deposit', NULL, current_date - 6, 'Event Catering Co', v_owner_id, 'Daniel Reed',
            2, 4, 'SN2-004', 'Event Float', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_event_cash_box_id, v_contact_event_return_id, 'income', 100.00,
            'Returned Unused Cash', 'Float left after the event', current_date - 5, 'Event Float Return', v_emma_actor, 'Emma Collins',
            2, 5, 'SN2-005', 'Event Float', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_coffee_cash_box_id, v_contact_beans_id, 'expense', 45.00,
            'Weekly Coffee Beans', NULL, current_date - 6, 'Roastery Beans', v_owner_id, 'Alex Turner',
            3, 1, 'SN3-001', 'Coffee Fund', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_coffee_cash_box_id, v_contact_milk_id, 'expense', 28.00,
            'Milk & Supplies', NULL, current_date - 5, 'Milk & Supplies Store', v_owner_id, 'Alex Turner',
            3, 2, 'SN3-002', 'Coffee Fund', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_coffee_cash_box_id, v_contact_coffee_team_id, 'income', 60.00,
            'Team Contribution', 'Monthly coffee contribution', current_date - 4, 'Greenfield Team', v_owner_id, 'Daniel Reed',
            3, 3, 'SN3-003', 'Coffee Fund', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184'),
        (v_owner_id, v_org_id, v_coffee_cash_box_id, v_contact_coffee_repair_id, 'expense', 35.00,
            'Coffee Machine Repair', NULL, current_date - 3, 'CoffeeFix Repair', v_emma_actor, 'Emma Collins',
            3, 4, 'SN3-004', 'Coffee Fund', 'USD', 'SN',
            'Greenfield Studio', '214 West 5th Street, Austin, TX 78701', '+1 512-555-0184');

    IF v_emma_id IS NULL THEN
        RAISE NOTICE 'Emma was NOT attached. Create emma.collins@spendnote.app in Authentication, then run this script again with v_apply = true.';
    ELSE
        RAISE NOTICE 'Emma Collins is an admin on all three cash boxes.';
    END IF;

    RAISE NOTICE 'Done. Expected balances -> Office Petty Cash 586.45, Event Float 1110.00, Coffee Fund 152.00. Upload the GreenField logo in Settings. Stripe ids were left untouched.';
END;
$$;
