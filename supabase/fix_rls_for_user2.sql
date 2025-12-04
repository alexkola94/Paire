-- ============================================
-- FIX: Enable User 2 to See Their Transactions
-- ============================================
-- User ID: c609b5ea-1d2b-4574-928e-bcaf4e0b20db
-- Email: alexisdaywalker1994@gmail.com
-- ============================================

-- Step 1: Verify transactions exist
SELECT 
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
FROM transactions
WHERE user_id = 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db';

-- Step 2: Check December 2024 transactions specifically
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total
FROM transactions
WHERE user_id = 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db'
  AND date >= '2024-12-01'
  AND date < '2025-01-01'
GROUP BY type;

-- Step 3: List all transactions for debugging
SELECT id, type, amount, category, description, date, created_at
FROM transactions
WHERE user_id = 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db'
ORDER BY date DESC;

-- ============================================
-- OPTION 1: Temporary Fix - Disable RLS (NOT RECOMMENDED FOR PRODUCTION)
-- ============================================
-- Uncomment the line below ONLY for testing
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTION 2: Update RLS Policies (RECOMMENDED)
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view partner transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Create new, more permissive policies
-- 1. View own transactions
CREATE POLICY "Users can view own transactions"
ON transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- 2. View partner's transactions (if partnership exists)
CREATE POLICY "Users can view partner transactions"
ON transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE status = 'active'
    AND (
      (user1_id = auth.uid()::text AND user2_id = transactions.user_id)
      OR
      (user2_id = auth.uid()::text AND user1_id = transactions.user_id)
    )
  )
);

-- 3. Insert own transactions
CREATE POLICY "Users can insert own transactions"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- 4. Update own transactions
CREATE POLICY "Users can update own transactions"
ON transactions FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- 5. Delete own transactions
CREATE POLICY "Users can delete own transactions"
ON transactions FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);

-- ============================================
-- Verify the fix worked
-- ============================================
SELECT 
  'SUCCESS! Your transactions:' as message,
  COUNT(*) as total_count,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as balance
FROM transactions
WHERE user_id = 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db'
  AND date >= '2024-12-01'
  AND date < '2025-01-01';

