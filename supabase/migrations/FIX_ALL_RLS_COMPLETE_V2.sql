-- ============================================
-- COMPLETE RLS FIX FOR ALL TABLES (V2)
-- ============================================
-- Fixed type casting issues (UUID vs TEXT)
-- Run this ONCE to fix all RLS policy issues
-- ============================================

-- ============================================
-- 1. FIX TRANSACTIONS TABLE (CRITICAL!)
-- ============================================

-- Drop all existing policies
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

-- Allow users to view their own transactions
CREATE POLICY "Users can view their transactions"
ON transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id::uuid);

-- Allow users to view partner's transactions
CREATE POLICY "Users can view partner transactions"
ON transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id = auth.uid() AND partnerships.user2_id = transactions.user_id::uuid)
      OR
      (partnerships.user2_id = auth.uid() AND partnerships.user1_id = transactions.user_id::uuid)
    )
  )
);

-- Allow users to insert their own transactions (CRITICAL FIX!)
CREATE POLICY "Users can insert their transactions"
ON transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to update their own transactions
CREATE POLICY "Users can update their transactions"
ON transactions FOR UPDATE TO authenticated
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

-- Allow users to delete their own transactions
CREATE POLICY "Users can delete their transactions"
ON transactions FOR DELETE TO authenticated
USING (auth.uid() = user_id::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- ============================================
-- 2. FIX LOANS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their loans" ON loans;
DROP POLICY IF EXISTS "Users can view partner loans" ON loans;
DROP POLICY IF EXISTS "Users can insert their loans" ON loans;
DROP POLICY IF EXISTS "Users can update their loans" ON loans;
DROP POLICY IF EXISTS "Users can delete their loans" ON loans;

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their loans"
ON loans FOR SELECT TO authenticated
USING (auth.uid() = user_id::uuid);

CREATE POLICY "Users can view partner loans"
ON loans FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id = auth.uid() AND partnerships.user2_id = loans.user_id::uuid)
      OR
      (partnerships.user2_id = auth.uid() AND partnerships.user1_id = loans.user_id::uuid)
    )
  )
);

CREATE POLICY "Users can insert their loans"
ON loans FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can update their loans"
ON loans FOR UPDATE TO authenticated
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

CREATE POLICY "Users can delete their loans"
ON loans FOR DELETE TO authenticated
USING (auth.uid() = user_id::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON loans TO authenticated;

-- ============================================
-- 3. FIX USER_PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view partner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can search profiles by email" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all profiles (needed for partnerships)
CREATE POLICY "Authenticated users can view all profiles"
ON user_profiles FOR SELECT TO authenticated
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- ============================================
-- 4. FIX PARTNERSHIPS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can create partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can update their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can delete their partnerships" ON partnerships;

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their partnerships"
ON partnerships FOR SELECT TO authenticated
USING (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
);

CREATE POLICY "Users can create partnerships"
ON partnerships FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their partnerships"
ON partnerships FOR UPDATE TO authenticated
USING (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
)
WITH CHECK (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
);

CREATE POLICY "Users can delete their partnerships"
ON partnerships FOR DELETE TO authenticated
USING (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
);

GRANT SELECT, INSERT, UPDATE, DELETE ON partnerships TO authenticated;

-- ============================================
-- 5. FIX BUDGETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view partner budgets" ON budgets;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their budgets"
ON budgets FOR SELECT TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view partner budgets"
ON budgets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id = auth.uid() AND partnerships.user2_id::text = budgets.user_id)
      OR
      (partnerships.user2_id = auth.uid() AND partnerships.user1_id::text = budgets.user_id)
    )
  )
);

CREATE POLICY "Users can create budgets"
ON budgets FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their budgets"
ON budgets FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their budgets"
ON budgets FOR DELETE TO authenticated
USING (auth.uid()::text = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- ============================================
-- 6. GRANT SCHEMA PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename IN ('transactions', 'loans', 'user_profiles', 'partnerships', 'budgets')
ORDER BY tablename, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ RLS POLICIES FIXED SUCCESSFULLY!      ║';
  RAISE NOTICE '╚════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ transactions - Can now create expenses/income';
  RAISE NOTICE '✅ loans - Can now create/manage loans';
  RAISE NOTICE '✅ user_profiles - Can now update profile';
  RAISE NOTICE '✅ partnerships - Can now create partnerships';
  RAISE NOTICE '✅ budgets - Can now create/track budgets';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Go refresh your app and try adding expenses!';
END $$;

