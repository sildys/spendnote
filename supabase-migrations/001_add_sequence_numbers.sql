-- SpendNote Sequence Numbers Migration
-- Run this in Supabase Dashboard > SQL Editor

-- =====================================================
-- 1. CASH BOXES: Add sequence_number
-- =====================================================
ALTER TABLE cash_boxes 
ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Populate existing cash boxes with sequence numbers based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as seq
  FROM cash_boxes
)
UPDATE cash_boxes 
SET sequence_number = numbered.seq
FROM numbered 
WHERE cash_boxes.id = numbered.id;

-- =====================================================
-- 2. TRANSACTIONS: Add sequence numbers
-- =====================================================
-- cash_box_sequence: which cash box (copies from cash_box's sequence_number)
-- tx_sequence_in_box: sequence within that cash box
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS cash_box_sequence INTEGER;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_sequence_in_box INTEGER;

-- Populate existing transactions with sequence numbers
WITH tx_numbered AS (
  SELECT 
    t.id,
    cb.sequence_number as cb_seq,
    ROW_NUMBER() OVER (PARTITION BY t.cash_box_id ORDER BY t.created_at ASC) as tx_seq
  FROM transactions t
  JOIN cash_boxes cb ON t.cash_box_id = cb.id
)
UPDATE transactions 
SET 
  cash_box_sequence = tx_numbered.cb_seq,
  tx_sequence_in_box = tx_numbered.tx_seq
FROM tx_numbered 
WHERE transactions.id = tx_numbered.id;

-- =====================================================
-- 3. CONTACTS: Add sequence_number
-- =====================================================
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Populate existing contacts with sequence numbers based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as seq
  FROM contacts
)
UPDATE contacts 
SET sequence_number = numbered.seq
FROM numbered 
WHERE contacts.id = numbered.id;

-- =====================================================
-- 4. HELPER FUNCTIONS for auto-incrementing
-- =====================================================

-- Function to get next cash box sequence for a user
CREATE OR REPLACE FUNCTION get_next_cash_box_sequence(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM cash_boxes
  WHERE user_id = p_user_id;
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to get next transaction sequence for a cash box
CREATE OR REPLACE FUNCTION get_next_tx_sequence(p_cash_box_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(tx_sequence_in_box), 0) + 1 INTO next_seq
  FROM transactions
  WHERE cash_box_id = p_cash_box_id;
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- Function to get next contact sequence for a user
CREATE OR REPLACE FUNCTION get_next_contact_sequence(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM contacts
  WHERE user_id = p_user_id;
  RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION: Check the results
-- =====================================================
-- SELECT id, name, sequence_number FROM cash_boxes ORDER BY sequence_number;
-- SELECT id, cash_box_sequence, tx_sequence_in_box FROM transactions ORDER BY cash_box_sequence, tx_sequence_in_box;
-- SELECT id, name, sequence_number FROM contacts ORDER BY sequence_number;
