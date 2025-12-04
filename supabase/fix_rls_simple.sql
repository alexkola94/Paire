-- ============================================
-- FIX: Simple RLS Policy Fix
-- ============================================

-- First, let's check the column types
SELECT 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'transactions' AND column_name = 'user_id';

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view partner transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Create new policies with proper casting
-- 1. View own transactions (handle both text and uuid types)
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  (user_id::text = (auth.uid())::text)
);

-- 2. View partner's transactions
CREATE POLICY "Users can view partner transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE status = 'active'
    AND (
      (user1_id::text = (auth.uid())::text AND user2_id::text = transactions.user_id::text)
      OR
      (user2_id::text = (auth.uid())::text AND user1_id::text = transactions.user_id::text)
    )
  )
);

-- 3. Insert own transactions
CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (user_id::text = (auth.uid())::text);

-- 4. Update own transactions
CREATE POLICY "Users can update own transactions"
ON transactions FOR UPDATE
TO authenticated
USING (user_id::text = (auth.uid())::text)
WITH CHECK (user_id::text = (auth.uid())::text);

-- 5. Delete own transactions
CREATE POLICY "Users can delete own transactions"
ON transactions FOR DELETE
TO authenticated
USING (user_id::text = (auth.uid())::text);

-- Verify: Check your transactions
SELECT 
  'Your transactions count:' as info,
  COUNT(*) as total_count
FROM transactions
WHERE user_id::text = 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db';

-- Verify: Check December 2024 summary
SELECT 
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
WHERE user_id::text = 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db'
  AND date >= '2024-12-01'
  AND date < '2025-01-01'
GROUP BY type;

