-- Simplified RLS for user_profiles
-- For partnership apps, users need to be able to see each other's basic profile info

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view partner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can search profiles by email" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple Policy 1: All authenticated users can read all profiles
-- This is needed for:
-- - Finding partners by email
-- - Seeing partner names in transactions
-- - Viewing partner details in partnerships
CREATE POLICY "Authenticated users can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Simple Policy 2: Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Simple Policy 3: Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd AS operation,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Test query (should return count)
SELECT COUNT(*) as profile_count FROM user_profiles;

