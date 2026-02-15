-- Migration 018: Auto-create default USD Cash Box for new users
-- This updates the handle_new_user() trigger function to automatically create
-- a default "Main Cash Box" with USD currency when a new user signs up.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_is_invited boolean := COALESCE((NEW.raw_user_meta_data->>'invited')::boolean, false);
    v_has_invite boolean := false;
    v_email text := lower(trim(coalesce(NEW.email, '')));
    v_full_name text := nullif(trim(coalesce(NEW.raw_user_meta_data->>'full_name', '')), '');
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, v_email, COALESCE(v_full_name, v_email, 'User'))
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    IF to_regclass('public.invites') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.invites
            WHERE invited_email = NEW.email
              AND status IN ('pending', 'active')
            LIMIT 1
        ) INTO v_has_invite;
    END IF;

    IF v_is_invited OR v_has_invite THEN
        RETURN NEW;
    END IF;

    -- Create default USD Cash Box
    INSERT INTO public.cash_boxes (
        user_id,
        name,
        currency,
        color,
        icon,
        current_balance
    )
    VALUES (
        NEW.id,
        'Main Cash Box',
        'USD',
        '#059669',
        'building',
        0
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off;
