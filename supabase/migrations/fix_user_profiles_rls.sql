-- Fix RLS Policies for user_profiles table
-- Allow users to read their own and their partner's profiles

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view partner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_profiles;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own profile
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Users can read profiles of users they have partnerships with
CREATE POLICY "Users can view partner profiles"
ON user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id = auth.uid() AND partnerships.user2_id = user_profiles.id)
      OR
      (partnerships.user2_id = auth.uid() AND partnerships.user1_id = user_profiles.id)
    )
  )
);

-- Policy 3: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy 4: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 5: Allow reading profiles by email for partnership invitations
-- This allows users to search for partners by email
CREATE POLICY "Users can search profiles by email"
ON user_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;

