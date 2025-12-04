-- Add Foreign Key Constraints to Budgets Table
-- This ensures data integrity with user_profiles

-- Drop existing constraint if it exists
ALTER TABLE budgets 
  DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;

-- Add foreign key constraint for user_id
ALTER TABLE budgets
  ADD CONSTRAINT budgets_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- Verify the constraint
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE conrelid = 'budgets'::regclass
  AND contype = 'f'
ORDER BY conname;

