-- Check what columns exist in the loans table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;

