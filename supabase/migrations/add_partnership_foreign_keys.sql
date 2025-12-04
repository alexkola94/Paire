-- Add Foreign Key Constraints to Partnerships Table
-- This enables automatic joins in Supabase queries

-- Drop existing constraints if they exist (in case of re-run)
ALTER TABLE partnerships 
  DROP CONSTRAINT IF EXISTS partnerships_user1_id_fkey,
  DROP CONSTRAINT IF EXISTS partnerships_user2_id_fkey;

-- Add foreign key constraint for user1_id
ALTER TABLE partnerships
  ADD CONSTRAINT partnerships_user1_id_fkey 
  FOREIGN KEY (user1_id) 
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Add foreign key constraint for user2_id
ALTER TABLE partnerships
  ADD CONSTRAINT partnerships_user2_id_fkey 
  FOREIGN KEY (user2_id) 
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

-- Verify the constraints
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  a.attname AS column_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE conrelid = 'partnerships'::regclass
  AND contype = 'f'
ORDER BY conname;

