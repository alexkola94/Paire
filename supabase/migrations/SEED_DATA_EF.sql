-- ============================================
-- SEED DATA FOR ENTITY FRAMEWORK DATABASE
-- ============================================
-- Run this AFTER Entity Framework migrations
-- Creates test data for two users with partnership
-- ============================================

-- User IDs (use your actual Supabase auth user IDs)
-- User 1: 10f690b8-b8e9-423d-814e-ef6758d5104a (kola.alexios@gmail.com)
-- User 2: c609b5ea-1d2b-4574-928e-bcaf4e0b20db (alexisdaywalker1994@gmail.com)

-- ============================================
-- 1. USER PROFILES
-- ============================================

INSERT INTO user_profiles (id, display_name, email, created_at, updated_at)
VALUES 
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'Alex', 'kola.alexios@gmail.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'Diana', 'alexisdaywalker1994@gmail.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
SET 
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2. PARTNERSHIP
-- ============================================

INSERT INTO partnerships (id, user1_id, user2_id, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '10f690b8-b8e9-423d-814e-ef6758d5104a',
  'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (user1_id, user2_id) DO UPDATE
SET status = 'active', updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 3. TRANSACTIONS (December 2025)
-- ============================================

-- Alex's Expenses
INSERT INTO transactions (id, user_id, amount, category, description, date, type, paid_by, created_at, updated_at)
VALUES
  (gen_random_uuid(), '10f690b8-b8e9-423d-814e-ef6758d5104a', 45.50, 'Food', 'Grocery shopping', '2025-12-01', 'expense', 'Alex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '10f690b8-b8e9-423d-814e-ef6758d5104a', 120.00, 'Transport', 'Gas station', '2025-12-02', 'expense', 'Alex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '10f690b8-b8e9-423d-814e-ef6758d5104a', 85.75, 'Entertainment', 'Cinema tickets', '2025-12-03', 'expense', 'Alex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '10f690b8-b8e9-423d-814e-ef6758d5104a', 200.00, 'Shopping', 'Clothes', '2025-12-04', 'expense', 'Alex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), '10f690b8-b8e9-423d-814e-ef6758d5104a', 3000.00, 'Salary', 'Monthly salary', '2025-12-01', 'income', 'Alex', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Maria's Expenses
INSERT INTO transactions (id, user_id, amount, category, description, date, type, paid_by, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 65.30, 'Food', 'Restaurant dinner', '2025-12-01', 'expense', 'Maria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 95.00, 'Health', 'Pharmacy', '2025-12-02', 'expense', 'Maria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 150.00, 'Shopping', 'Home supplies', '2025-12-03', 'expense', 'Maria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 2500.00, 'Salary', 'Monthly salary', '2025-12-01', 'income', 'Maria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================
-- 4. LOANS
-- ============================================

INSERT INTO loans (id, user_id, lent_by, borrowed_by, amount, description, date, total_paid, remaining_amount, is_settled, due_date, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    '10f690b8-b8e9-423d-814e-ef6758d5104a',
    'Alex',
    'Maria',
    500.00,
    'Loan for car repair',
    '2025-12-01',
    0.00,
    500.00,
    false,
    '2026-01-01',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',
    'Maria',
    'Alex',
    300.00,
    'Loan for vacation',
    '2025-12-05',
    100.00,
    200.00,
    false,
    '2026-02-01',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- ============================================
-- 5. BUDGETS
-- ============================================

INSERT INTO budgets (id, user_id, category, amount, spent_amount, period, start_date, end_date, is_active, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    '10f690b8-b8e9-423d-814e-ef6758d5104a',
    'Food',
    500.00,
    45.50,
    'monthly',
    '2025-12-01',
    '2025-12-31',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    '10f690b8-b8e9-423d-814e-ef6758d5104a',
    'Transport',
    300.00,
    120.00,
    'monthly',
    '2025-12-01',
    '2025-12-31',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',
    'Shopping',
    400.00,
    150.00,
    'monthly',
    '2025-12-01',
    '2025-12-31',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- ============================================
-- 6. SAVINGS GOALS
-- ============================================

INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, target_date, priority, category, is_achieved, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    '10f690b8-b8e9-423d-814e-ef6758d5104a',
    'Vacation Fund',
    2000.00,
    750.00,
    '2025-06-01',
    'high',
    'vacation',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',
    'New Laptop',
    1500.00,
    500.00,
    '2025-03-01',
    'medium',
    'electronics',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- ============================================
-- 7. RECURRING BILLS
-- ============================================

INSERT INTO recurring_bills (id, user_id, name, amount, category, frequency, due_day, next_due_date, auto_pay, reminder_days, is_active, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    '10f690b8-b8e9-423d-814e-ef6758d5104a',
    'Rent',
    800.00,
    'Housing',
    'monthly',
    1,
    '2026-01-01',
    false,
    3,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    '10f690b8-b8e9-423d-814e-ef6758d5104a',
    'Internet',
    50.00,
    'Utilities',
    'monthly',
    15,
    '2026-01-15',
    true,
    5,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(),
    'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',
    'Phone Bill',
    30.00,
    'Utilities',
    'monthly',
    20,
    '2026-01-20',
    true,
    3,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ SEED DATA INSERTED SUCCESSFULLY!' as status;

-- Show summary
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count
FROM user_profiles
UNION ALL
SELECT 'partnerships', COUNT(*) FROM partnerships
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'loans', COUNT(*) FROM loans
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL
SELECT 'savings_goals', COUNT(*) FROM savings_goals
UNION ALL
SELECT 'recurring_bills', COUNT(*) FROM recurring_bills
ORDER BY table_name;

-- Show transaction summary
SELECT 
  u.display_name as user,
  t.type,
  COUNT(*) as count,
  SUM(t.amount) as total
FROM transactions t
JOIN user_profiles u ON t.user_id::uuid = u.id
GROUP BY u.display_name, t.type
ORDER BY u.display_name, t.type;

