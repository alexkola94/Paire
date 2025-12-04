-- ============================================
-- FIX LOANS RLS POLICIES
-- ============================================
-- Allow users to manage their own loans and view partner's loans

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their loans" ON loans;
DROP POLICY IF EXISTS "Users can view partner loans" ON loans;
DROP POLICY IF EXISTS "Users can insert their loans" ON loans;
DROP POLICY IF EXISTS "Users can update their loans" ON loans;
DROP POLICY IF EXISTS "Users can delete their loans" ON loans;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON loans;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON loans;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON loans;

-- Enable RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SELECT POLICIES (Read)
-- ============================================

-- Policy 1: Users can view their own loans
CREATE POLICY "Users can view their loans"
ON loans
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Policy 2: Users can view their partner's loans
CREATE POLICY "Users can view partner loans"
ON loans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id::text = auth.uid()::text AND partnerships.user2_id::text = loans.user_id)
      OR
      (partnerships.user2_id::text = auth.uid()::text AND partnerships.user1_id::text = loans.user_id)
    )
  )
);

-- ============================================
-- INSERT POLICY (Create)
-- ============================================

-- Users can insert their own loans
CREATE POLICY "Users can insert their loans"
ON loans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- UPDATE POLICY (Edit)
-- ============================================

-- Users can only update their own loans
CREATE POLICY "Users can update their loans"
ON loans
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- ============================================
-- DELETE POLICY (Remove)
-- ============================================

-- Users can only delete their own loans
CREATE POLICY "Users can delete their loans"
ON loans
FOR DELETE
TO authenticated
USING (auth.uid()::text = user_id);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON loans TO authenticated;
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
WHERE tablename = 'loans'
ORDER BY policyname;

-- Success message
SELECT 'RLS policies updated successfully for loans table!' as message;

