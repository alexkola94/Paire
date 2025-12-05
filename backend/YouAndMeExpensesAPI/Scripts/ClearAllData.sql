-- =====================================================
-- Clear All Data Script
-- This will delete all data from all tables while keeping the structure
-- =====================================================

-- Disable triggers temporarily (if any)
SET session_replication_role = 'replica';

-- Clear all tables in correct order (respecting foreign key constraints)
TRUNCATE TABLE shopping_list_items CASCADE;
TRUNCATE TABLE shopping_lists CASCADE;
TRUNCATE TABLE loan_payments CASCADE;
TRUNCATE TABLE loans CASCADE;
TRUNCATE TABLE recurring_bills CASCADE;
TRUNCATE TABLE savings_goals CASCADE;
TRUNCATE TABLE budgets CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE reminder_preferences CASCADE;
TRUNCATE TABLE partnerships CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- Reset sequences (auto-increment IDs) to start from 1
ALTER SEQUENCE IF EXISTS shopping_list_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS shopping_lists_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS loan_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS loans_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS recurring_bills_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS savings_goals_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS budgets_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS reminder_preferences_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS partnerships_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Display completion message
SELECT 'All data has been cleared successfully!' AS status;

