-- ============================================
-- UPDATE TRANSACTION DATES TO 2025
-- ============================================
-- This updates all December 2024 transactions to December 2025

UPDATE transactions
SET date = date + INTERVAL '1 year'
WHERE date >= '2024-12-01' AND date < '2025-01-01';

-- Verify the update
SELECT 
  'Updated transactions to 2025!' as message,
  COUNT(*) as count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM transactions
WHERE date >= '2025-12-01' AND date < '2026-01-01';

-- Show summary
SELECT 
  type,
  SUM(amount) as total_amount,
  COUNT(*) as transaction_count
FROM transactions
WHERE date >= '2025-12-01' AND date < '2026-01-01'
GROUP BY type;

