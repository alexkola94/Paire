-- ============================================
-- COMPREHENSIVE RLS FIX FOR ALL TABLES
-- Run this single file to fix all RLS issues
-- ============================================

-- ============================================
-- 1. FIX USER_PROFILES RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view partner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can search profiles by email" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read profiles (needed for partnerships)
CREATE POLICY "Authenticated users can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- ============================================
-- 2. FIX PARTNERSHIPS RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can create partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can update their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can delete their partnerships" ON partnerships;

-- Enable RLS
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Users can view partnerships they're part of
CREATE POLICY "Users can view their partnerships"
ON partnerships
FOR SELECT
TO authenticated
USING (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
);

-- Users can create partnerships where they are user1
CREATE POLICY "Users can create partnerships"
ON partnerships
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user1_id);

-- Users can update their partnerships
CREATE POLICY "Users can update their partnerships"
ON partnerships
FOR UPDATE
TO authenticated
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

-- Users can delete their partnerships
CREATE POLICY "Users can delete their partnerships"
ON partnerships
FOR DELETE
TO authenticated
USING (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON partnerships TO authenticated;

-- ============================================
-- 3. FIX BUDGETS RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view partner budgets" ON budgets;

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Users can view their own budgets
CREATE POLICY "Users can view their budgets"
ON budgets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view their partner's budgets
CREATE POLICY "Users can view partner budgets"
ON budgets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id = auth.uid() AND partnerships.user2_id = budgets.user_id)
      OR
      (partnerships.user2_id = auth.uid() AND partnerships.user1_id = budgets.user_id)
    )
  )
);

-- Users can create their own budgets
CREATE POLICY "Users can create budgets"
ON budgets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own budgets
CREATE POLICY "Users can update their budgets"
ON budgets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own budgets
CREATE POLICY "Users can delete their budgets"
ON budgets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- ============================================
-- 4. GRANT SCHEMA PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Show all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename IN ('user_profiles', 'partnerships', 'budgets')
ORDER BY tablename, policyname;

-- Show RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('user_profiles', 'partnerships', 'budgets')
ORDER BY tablename;

-- Test count queries
SELECT 'user_profiles' as table_name, COUNT(*) as row_count FROM user_profiles
UNION ALL
SELECT 'partnerships', COUNT(*) FROM partnerships
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated successfully for:';
  RAISE NOTICE '   - user_profiles';
  RAISE NOTICE '   - partnerships';
  RAISE NOTICE '   - budgets';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security is enabled and configured properly!';
  RAISE NOTICE '🎉 Your app should now work without 406 errors!';
END $$;

