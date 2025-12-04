-- ============================================
-- Quick Setup: Create a Partnership
-- ============================================
-- This script shows how to set up two users as partners
-- Run this AFTER both users have signed up via Supabase Auth

-- ============================================
-- STEP 1: Create User Profiles
-- ============================================
-- Replace UUIDs with actual user IDs from auth.users table

-- User 1 Profile (e.g., Alex)
INSERT INTO user_profiles (id, display_name, email)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Replace with actual user_id
  'Alex',                                    -- Display name to show in app
  'alex@example.com'                         -- Email (optional)
)
ON CONFLICT (id) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email;

-- User 2 Profile (e.g., Partner)
INSERT INTO user_profiles (id, display_name, email)
VALUES (
  '987fcdeb-51a2-43f7-8d9e-9876543210fe',  -- Replace with actual user_id
  'Partner',                                 -- Display name to show in app
  'partner@example.com'                      -- Email (optional)
)
ON CONFLICT (id) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    email = EXCLUDED.email;

-- ============================================
-- STEP 2: Create Partnership
-- ============================================
-- Link the two users together

INSERT INTO partnerships (user1_id, user2_id, status)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- User 1 ID
  '987fcdeb-51a2-43f7-8d9e-9876543210fe',  -- User 2 ID
  'active'                                   -- Status: active (sharing enabled)
)
ON CONFLICT (user1_id, user2_id) DO UPDATE
SET status = 'active',
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- STEP 3: Verify Partnership
-- ============================================

-- Check if partnership was created
SELECT 
  p.id,
  p.status,
  up1.display_name AS user1_name,
  up2.display_name AS user2_name,
  p.created_at
FROM partnerships p
LEFT JOIN user_profiles up1 ON p.user1_id = up1.id
LEFT JOIN user_profiles up2 ON p.user2_id = up2.id
WHERE p.user1_id = '123e4567-e89b-12d3-a456-426614174000'
   OR p.user2_id = '123e4567-e89b-12d3-a456-426614174000';

-- ============================================
-- STEP 4: Test Data Sharing
-- ============================================

-- Insert a test transaction as User 1
-- (When logged in as User 1, auth.uid() returns their ID)
-- Both partners should be able to see this transaction

-- Example insert (would be done through your app):
-- INSERT INTO transactions (user_id, type, amount, category, description, date)
-- VALUES (
--   '123e4567-e89b-12d3-a456-426614174000',
--   'expense',
--   50.00,
--   'Groceries',
--   'Weekly shopping',
--   CURRENT_DATE
-- );

-- Query to see shared transactions (as User 1)
-- This query simulates what User 1 would see when they query transactions
SELECT 
  t.id,
  t.type,
  t.amount,
  t.category,
  t.description,
  t.date,
  up.display_name AS added_by,
  CASE 
    WHEN t.user_id = '123e4567-e89b-12d3-a456-426614174000' THEN 'You'
    ELSE up.display_name
  END AS display_label
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
ORDER BY t.date DESC, t.created_at DESC
LIMIT 20;

-- ============================================
-- HELPFUL QUERIES
-- ============================================

-- Get all users (to find user IDs for setup)
SELECT 
  au.id,
  au.email,
  up.display_name,
  au.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
ORDER BY au.created_at DESC;

-- Get partner's info
SELECT 
  up.*
FROM user_profiles up
INNER JOIN partnerships p ON (
  (p.user1_id = '123e4567-e89b-12d3-a456-426614174000' AND p.user2_id = up.id)
  OR
  (p.user2_id = '123e4567-e89b-12d3-a456-426614174000' AND p.user1_id = up.id)
)
WHERE p.status = 'active';

-- Count transactions by person (current month)
SELECT 
  up.display_name,
  COUNT(*) as transaction_count,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as total_income
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
WHERE DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY up.display_name;

-- ============================================
-- DEACTIVATE PARTNERSHIP (if needed)
-- ============================================

-- To temporarily disable sharing without deleting the partnership:
-- UPDATE partnerships
-- SET status = 'inactive'
-- WHERE (user1_id = '123e4567-e89b-12d3-a456-426614174000'
--     OR user2_id = '123e4567-e89b-12d3-a456-426614174000')
--   AND status = 'active';

-- ============================================
-- DELETE PARTNERSHIP (if needed)
-- ============================================

-- To completely remove the partnership link:
-- DELETE FROM partnerships
-- WHERE user1_id = '123e4567-e89b-12d3-a456-426614174000'
--    OR user2_id = '123e4567-e89b-12d3-a456-426614174000';

