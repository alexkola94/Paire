-- Check column types for all relevant tables

SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name IN ('transactions', 'loans', 'user_profiles', 'partnerships', 'budgets')
  AND column_name IN ('id', 'user_id', 'user1_id', 'user2_id')
ORDER BY table_name, column_name;

