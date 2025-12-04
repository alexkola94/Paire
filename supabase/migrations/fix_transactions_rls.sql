-- ============================================
-- FIX TRANSACTIONS RLS POLICIES
-- ============================================
-- Allow users to manage their own transactions and view partner's transactions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view partner transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their transactions" ON transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON transactions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON transactions;

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELECT POLICIES (Read)
-- ============================================

-- Policy 1: Users can view their own transactions
CREATE POLICY "Users can view their transactions"
ON transactions
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Policy 2: Users can view their partner's transactions
CREATE POLICY "Users can view partner transactions"
ON transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id::text = auth.uid()::text AND partnerships.user2_id::text = transactions.user_id)
      OR
      (partnerships.user2_id::text = auth.uid()::text AND partnerships.user1_id::text = transactions.user_id)
    )
  )
);

-- ============================================
-- INSERT POLICY (Create)
-- ============================================

-- Users can insert their own transactions
CREATE POLICY "Users can insert their transactions"
ON transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- UPDATE POLICY (Edit)
-- ============================================

-- Users can only update their own transactions
CREATE POLICY "Users can update their transactions"
ON transactions
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- DELETE POLICY (Remove)
-- ============================================

-- Users can only delete their own transactions
CREATE POLICY "Users can delete their transactions"
ON transactions
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

-- Show all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename = 'transactions'
ORDER BY policyname;

-- Test INSERT (this should work after running the migration)
SELECT 'RLS policies updated successfully!' as message;
SELECT 'Users can now create, view, update, and delete their own transactions' as info;
SELECT 'Users can view (but not modify) their partner''s transactions' as partnership_info;

