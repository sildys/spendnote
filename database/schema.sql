-- SpendNote Database Schema for Supabase
-- This file contains all table definitions and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (extends Supabase Auth)
-- =====================================================
-- Note: Supabase Auth already provides auth.users table
-- We create a public.profiles table for additional user data

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- CASH BOXES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cash_boxes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    initial_balance DECIMAL(12, 2) DEFAULT 0.00,
    current_balance DECIMAL(12, 2) DEFAULT 0.00,
    color TEXT DEFAULT '#10b981', -- green by default
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.cash_boxes ENABLE ROW LEVEL SECURITY;

-- Cash boxes policies
CREATE POLICY "Users can view their own cash boxes" 
    ON public.cash_boxes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash boxes" 
    ON public.cash_boxes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash boxes" 
    ON public.cash_boxes FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash boxes" 
    ON public.cash_boxes FOR DELETE 
    USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_cash_boxes_user_id ON public.cash_boxes(user_id);

-- =====================================================
-- CONTACTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view their own contacts" 
    ON public.contacts FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts" 
    ON public.contacts FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts" 
    ON public.contacts FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts" 
    ON public.contacts FOR DELETE 
    USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON public.contacts(name);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    cash_box_id UUID REFERENCES public.cash_boxes(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
    ON public.transactions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
    ON public.transactions FOR DELETE 
    USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cash_box_id ON public.transactions(cash_box_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contact_id ON public.transactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- =====================================================
-- CASH BOX CONTACTS (Many-to-Many Junction Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cash_box_contacts (
    cash_box_id UUID REFERENCES public.cash_boxes(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (cash_box_id, contact_id)
);

-- Enable Row Level Security
ALTER TABLE public.cash_box_contacts ENABLE ROW LEVEL SECURITY;

-- Cash box contacts policies
CREATE POLICY "Users can view their own cash box contacts" 
    ON public.cash_box_contacts FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.cash_boxes 
            WHERE id = cash_box_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own cash box contacts" 
    ON public.cash_box_contacts FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cash_boxes 
            WHERE id = cash_box_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own cash box contacts" 
    ON public.cash_box_contacts FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.cash_boxes 
            WHERE id = cash_box_id AND user_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_boxes_updated_at BEFORE UPDATE ON public.cash_boxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update cash box balance when transaction is inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_cash_box_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        -- Revert the old transaction
        IF OLD.type = 'income' THEN
            UPDATE public.cash_boxes 
            SET current_balance = current_balance - OLD.amount 
            WHERE id = OLD.cash_box_id;
        ELSE
            UPDATE public.cash_boxes 
            SET current_balance = current_balance + OLD.amount 
            WHERE id = OLD.cash_box_id;
        END IF;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revert the old transaction
        IF OLD.type = 'income' THEN
            UPDATE public.cash_boxes 
            SET current_balance = current_balance - OLD.amount 
            WHERE id = OLD.cash_box_id;
        ELSE
            UPDATE public.cash_boxes 
            SET current_balance = current_balance + OLD.amount 
            WHERE id = OLD.cash_box_id;
        END IF;
        -- Apply the new transaction
        IF NEW.type = 'income' THEN
            UPDATE public.cash_boxes 
            SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.cash_box_id;
        ELSE
            UPDATE public.cash_boxes 
            SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.cash_box_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        -- Apply the new transaction
        IF NEW.type = 'income' THEN
            UPDATE public.cash_boxes 
            SET current_balance = current_balance + NEW.amount 
            WHERE id = NEW.cash_box_id;
        ELSE
            UPDATE public.cash_boxes 
            SET current_balance = current_balance - NEW.amount 
            WHERE id = NEW.cash_box_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cash box balance
CREATE TRIGGER update_cash_box_balance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_cash_box_balance();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
