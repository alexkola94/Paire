-- ============================================
-- FINAL RLS FIX - GUARANTEED TO WORK
-- ============================================
-- Casts EVERYTHING to text to avoid any type mismatches
-- ============================================

-- ============================================
-- 1. TRANSACTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view partner transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their transactions" ON transactions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON transactions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON transactions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON transactions;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their transactions"
ON transactions FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view partner transactions"
ON transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id::text = auth.uid()::text AND partnerships.user2_id::text = transactions.user_id::text)
      OR
      (partnerships.user2_id::text = auth.uid()::text AND partnerships.user1_id::text = transactions.user_id::text)
    )
  )
);

CREATE POLICY "Users can insert their transactions"
ON transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their transactions"
ON transactions FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their transactions"
ON transactions FOR DELETE TO authenticated
USING (auth.uid()::text = user_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO authenticated;

-- ============================================
-- 2. LOANS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their loans" ON loans;
DROP POLICY IF EXISTS "Users can view partner loans" ON loans;
DROP POLICY IF EXISTS "Users can insert their loans" ON loans;
DROP POLICY IF EXISTS "Users can update their loans" ON loans;
DROP POLICY IF EXISTS "Users can delete their loans" ON loans;

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their loans"
ON loans FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view partner loans"
ON loans FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id::text = auth.uid()::text AND partnerships.user2_id::text = loans.user_id::text)
      OR
      (partnerships.user2_id::text = auth.uid()::text AND partnerships.user1_id::text = loans.user_id::text)
    )
  )
);

CREATE POLICY "Users can insert their loans"
ON loans FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their loans"
ON loans FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their loans"
ON loans FOR DELETE TO authenticated
USING (auth.uid()::text = user_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON loans TO authenticated;

-- ============================================
-- 3. USER_PROFILES TABLE
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

CREATE POLICY "Authenticated users can view all profiles"
ON user_profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- ============================================
-- 4. PARTNERSHIPS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can create partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can update their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can delete their partnerships" ON partnerships;

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their partnerships"
ON partnerships FOR SELECT TO authenticated
USING (
  auth.uid()::text = user1_id::text 
  OR 
  auth.uid()::text = user2_id::text
);

CREATE POLICY "Users can create partnerships"
ON partnerships FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user1_id::text);

CREATE POLICY "Users can update their partnerships"
ON partnerships FOR UPDATE TO authenticated
USING (
  auth.uid()::text = user1_id::text 
  OR 
  auth.uid()::text = user2_id::text
)
WITH CHECK (
  auth.uid()::text = user1_id::text 
  OR 
  auth.uid()::text = user2_id::text
);

CREATE POLICY "Users can delete their partnerships"
ON partnerships FOR DELETE TO authenticated
USING (
  auth.uid()::text = user1_id::text 
  OR 
  auth.uid()::text = user2_id::text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON partnerships TO authenticated;

-- ============================================
-- 5. BUDGETS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view partner budgets" ON budgets;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their budgets"
ON budgets FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view partner budgets"
ON budgets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id::text = auth.uid()::text AND partnerships.user2_id::text = budgets.user_id::text)
      OR
      (partnerships.user2_id::text = auth.uid()::text AND partnerships.user1_id::text = budgets.user_id::text)
    )
  )
);

CREATE POLICY "Users can create budgets"
ON budgets FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their budgets"
ON budgets FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their budgets"
ON budgets FOR DELETE TO authenticated
USING (auth.uid()::text = user_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ SUCCESS!' as status;
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('transactions', 'loans', 'user_profiles', 'partnerships', 'budgets')
GROUP BY tablename
ORDER BY tablename;

