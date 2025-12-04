-- ============================================
-- SEED TEST DATA FOR PARTNER SHARING
-- ============================================
-- Creates profiles, partnership, and sample data for testing
-- Users:
--   User 1: 10f690b8-b8e9-423d-814e-ef6758d5104a (kola.alexios@gmail.com)
--   User 2: c609b5ea-1d2b-4574-928e-bcaf4e0b20db (alexisdaywalker1994@gmail.com)
-- ============================================

-- ============================================
-- STEP 1: CREATE USER PROFILES
-- ============================================

-- User 1 Profile
INSERT INTO user_profiles (id, display_name, email)
VALUES (
  '10f690b8-b8e9-423d-814e-ef6758d5104a',
  'Alex',  -- Display name (name tag)
  'kola.alexios@gmail.com'
)
ON CONFLICT (id) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- User 2 Profile
INSERT INTO user_profiles (id, display_name, email)
VALUES (
  'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',
  'Partner',  -- Display name (name tag)
  'alexisdaywalker1994@gmail.com'
)
ON CONFLICT (id) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- STEP 2: CREATE PARTNERSHIP
-- ============================================

INSERT INTO partnerships (user1_id, user2_id, status)
VALUES (
  '10f690b8-b8e9-423d-814e-ef6758d5104a',  -- Alex
  'c609b5ea-1d2b-4574-928e-bcaf4e0b20db',  -- Partner
  'active'
)
ON CONFLICT (user1_id, user2_id) DO UPDATE
SET status = 'active',
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- STEP 3: SEED TRANSACTIONS (EXPENSES)
-- ============================================

-- Alex's Expenses (December 2024)
INSERT INTO transactions (user_id, type, amount, category, description, date)
VALUES 
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 85.50, 'Groceries', 'Weekly shopping at supermarket', '2024-12-01'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 45.00, 'Transport', 'Gas station fill-up', '2024-12-01'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 120.00, 'Entertainment', 'Cinema tickets and dinner', '2024-12-02'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 35.20, 'Utilities', 'Electric bill payment', '2024-12-02'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 65.00, 'Groceries', 'Fresh vegetables and fruits', '2024-12-03'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 25.00, 'Transport', 'Public transport card', '2024-12-03'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'expense', 150.00, 'Shopping', 'New shoes', '2024-12-04');

-- Partner's Expenses (December 2024)
INSERT INTO transactions (user_id, type, amount, category, description, date)
VALUES 
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 95.75, 'Groceries', 'Weekly groceries and snacks', '2024-12-01'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 40.00, 'Healthcare', 'Pharmacy - medications', '2024-12-01'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 55.00, 'Entertainment', 'Netflix and Spotify subscriptions', '2024-12-02'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 75.00, 'Dining', 'Restaurant with friends', '2024-12-02'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 30.50, 'Groceries', 'Coffee and breakfast items', '2024-12-03'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 200.00, 'Shopping', 'New winter jacket', '2024-12-03'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'expense', 50.00, 'Transport', 'Uber rides', '2024-12-04');

-- ============================================
-- STEP 4: SEED TRANSACTIONS (INCOME)
-- ============================================

-- Alex's Income (December 2024)
INSERT INTO transactions (user_id, type, amount, category, description, date)
VALUES 
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'income', 3500.00, 'Salary', 'Monthly salary payment', '2024-12-01'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'income', 150.00, 'Freelance', 'Website design project', '2024-12-02'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'income', 50.00, 'Other', 'Sold old books online', '2024-12-03');

-- Partner's Income (December 2024)
INSERT INTO transactions (user_id, type, amount, category, description, date)
VALUES 
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'income', 3200.00, 'Salary', 'Monthly salary payment', '2024-12-01'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'income', 200.00, 'Bonus', 'Performance bonus', '2024-12-02'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'income', 75.00, 'Investment', 'Dividend payment', '2024-12-03');

-- ============================================
-- STEP 5: SEED LOANS
-- ============================================

-- Alex's Loans
INSERT INTO loans (user_id, type, party_name, total_amount, remaining_amount, due_date, description, status)
VALUES 
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'given', 'John Smith', 500.00, 500.00, '2025-01-15', 'Lent money for emergency', 'active'),
  ('10f690b8-b8e9-423d-814e-ef6758d5104a', 'received', 'Mike Johnson', 1000.00, 400.00, '2025-02-28', 'Borrowed for car repair', 'active');

-- Partner's Loans
INSERT INTO loans (user_id, type, party_name, total_amount, remaining_amount, due_date, description, status)
VALUES 
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'given', 'Sarah Williams', 300.00, 150.00, '2025-01-30', 'Lent for rent payment', 'active'),
  ('c609b5ea-1d2b-4574-928e-bcaf4e0b20db', 'received', 'David Brown', 750.00, 750.00, '2025-03-15', 'Borrowed for laptop purchase', 'active');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check User Profiles
SELECT 
  id,
  display_name,
  email,
  created_at
FROM user_profiles
ORDER BY display_name;

-- Check Partnership
SELECT 
  p.id,
  p.status,
  up1.display_name AS user1_name,
  up2.display_name AS user2_name,
  p.created_at
FROM partnerships p
LEFT JOIN user_profiles up1 ON p.user1_id = up1.id
LEFT JOIN user_profiles up2 ON p.user2_id = up2.id;

-- Check All Transactions with Name Tags
SELECT 
  t.id,
  t.type,
  t.amount,
  t.category,
  t.description,
  t.date,
  up.display_name AS added_by
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
ORDER BY t.date DESC, t.created_at DESC;

-- Check Summary by Person
SELECT 
  up.display_name,
  COUNT(*) FILTER (WHERE t.type = 'expense') AS expense_count,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS total_expenses,
  COUNT(*) FILTER (WHERE t.type = 'income') AS income_count,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) AS total_income,
  COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'income'), 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'expense'), 0) AS net_balance
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
GROUP BY up.display_name;

-- Check All Loans with Name Tags
SELECT 
  l.id,
  l.type,
  l.party_name,
  l.total_amount,
  l.remaining_amount,
  l.due_date,
  l.status,
  up.display_name AS added_by
FROM loans l
LEFT JOIN user_profiles up ON l.user_id = up.id
ORDER BY l.due_date;

-- ============================================
-- SUMMARY OUTPUT
-- ============================================

-- Display Summary
SELECT 
  '✅ Seed Data Complete!' AS status,
  (SELECT COUNT(*) FROM user_profiles) AS profiles_created,
  (SELECT COUNT(*) FROM partnerships) AS partnerships_created,
  (SELECT COUNT(*) FROM transactions) AS transactions_created,
  (SELECT COUNT(*) FROM loans) AS loans_created;

-- Display What Each User Can See
SELECT 
  '🔍 Data Sharing Test' AS test,
  'Both users should see ALL ' || (SELECT COUNT(*) FROM transactions) || ' transactions' AS transaction_sharing,
  'Both users should see ALL ' || (SELECT COUNT(*) FROM loans) || ' loans' AS loan_sharing,
  'Name tags show who added each item' AS tracking_method;

