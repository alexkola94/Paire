-- ============================================
-- DROP ALL EXISTING TABLES (CLEAN SLATE)
-- ============================================
-- WARNING: This will delete ALL data!
-- Run this BEFORE running Entity Framework migrations
-- ============================================

-- Disable RLS on all tables first
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loan_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partnerships DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_bills DISABLE ROW LEVEL SECURITY;

-- Drop all existing tables
DROP TABLE IF EXISTS loan_payments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS savings_goals CASCADE;
DROP TABLE IF EXISTS recurring_bills CASCADE;
DROP TABLE IF EXISTS partnerships CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop any leftover functions/triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify all tables are dropped
SELECT 
  'All tables dropped successfully!' as status,
  COUNT(*) as remaining_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('transactions', 'loans', 'loan_payments', 'user_profiles', 'partnerships', 'budgets', 'savings_goals', 'recurring_bills');

-- Show remaining tables (should be empty or system tables only)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

