-- Fix RLS Policies for partnerships table
-- Allow users to manage their own partnerships

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can create partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can update their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can delete their partnerships" ON partnerships;

-- Enable RLS
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view partnerships they're part of
CREATE POLICY "Users can view their partnerships"
ON partnerships
FOR SELECT
TO authenticated
USING (
  auth.uid() = user1_id 
  OR 
  auth.uid() = user2_id
);

-- Policy 2: Users can create partnerships where they are user1
CREATE POLICY "Users can create partnerships"
ON partnerships
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user1_id);

-- Policy 3: Users can update their own partnerships (change status)
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

-- Policy 4: Users can delete their own partnerships
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

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename = 'partnerships'
ORDER BY policyname;

