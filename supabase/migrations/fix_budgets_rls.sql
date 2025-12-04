-- Fix RLS Policies for budgets table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view partner budgets" ON budgets;

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own budgets
CREATE POLICY "Users can view their budgets"
ON budgets
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Users can view their partner's budgets (optional)
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

-- Policy 3: Users can create their own budgets
CREATE POLICY "Users can create budgets"
ON budgets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own budgets
CREATE POLICY "Users can update their budgets"
ON budgets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can delete their own budgets
CREATE POLICY "Users can delete their budgets"
ON budgets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;

-- Verify policies
SELECT 
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename = 'budgets'
ORDER BY policyname;

