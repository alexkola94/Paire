-- ============================================
-- Migration: Add Partner Sharing System
-- Created: 2024-12-04
-- Description: Enables data sharing between partners while tracking who added what
-- ============================================

-- ============================================
-- USER PROFILES TABLE
-- ============================================
-- Store user profile information including display names
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL, -- Name tag to show who added what (e.g., "Alex", "Partner")
  email VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- ============================================
-- PARTNERSHIPS TABLE
-- ============================================
-- Link two users together as partners to share data
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id != user2_id) -- Prevent self-partnerships
);

-- Index for faster partnership lookups
CREATE INDEX IF NOT EXISTS idx_partnerships_user1 ON partnerships(user1_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_user2 ON partnerships(user2_id);
CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships(status);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
-- Note: RLS policies are created AFTER both tables exist
-- because user_profiles policies reference partnerships table

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and their partner's profile
CREATE POLICY "Users can view own and partner profiles"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM partnerships
      WHERE (user1_id = auth.uid() AND user2_id = id)
         OR (user2_id = auth.uid() AND user1_id = id)
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Enable RLS on partnerships
ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Partners can view their partnership
CREATE POLICY "Users can view own partnerships"
  ON partnerships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Partners can update their partnership (e.g., to deactivate)
CREATE POLICY "Users can update own partnerships"
  ON partnerships FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- UPDATE RLS POLICIES FOR SHARED DATA
-- ============================================

-- DROP OLD RESTRICTIVE POLICIES FOR TRANSACTIONS
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- NEW SHARED POLICIES FOR TRANSACTIONS
-- Partners can view ALL transactions from both users
CREATE POLICY "Partners can view shared transactions"
  ON transactions FOR SELECT
  USING (
    auth.uid() = user_id OR  -- Own transactions
    EXISTS (  -- Partner's transactions
      SELECT 1 FROM partnerships
      WHERE status = 'active'
        AND ((user1_id = auth.uid() AND user2_id = transactions.user_id)
          OR (user2_id = auth.uid() AND user1_id = transactions.user_id))
    )
  );

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- DROP OLD RESTRICTIVE POLICIES FOR LOANS
DROP POLICY IF EXISTS "Users can view own loans" ON loans;
DROP POLICY IF EXISTS "Users can insert own loans" ON loans;
DROP POLICY IF EXISTS "Users can update own loans" ON loans;
DROP POLICY IF EXISTS "Users can delete own loans" ON loans;

-- NEW SHARED POLICIES FOR LOANS
-- Partners can view ALL loans from both users
CREATE POLICY "Partners can view shared loans"
  ON loans FOR SELECT
  USING (
    auth.uid() = user_id OR  -- Own loans
    EXISTS (  -- Partner's loans
      SELECT 1 FROM partnerships
      WHERE status = 'active'
        AND ((user1_id = auth.uid() AND user2_id = loans.user_id)
          OR (user2_id = auth.uid() AND user1_id = loans.user_id))
    )
  );

-- Users can insert their own loans
CREATE POLICY "Users can insert own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own loans
CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own loans
CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get partner's user_id
CREATE OR REPLACE FUNCTION get_partner_id(input_user_id UUID)
RETURNS UUID AS $$
DECLARE
  partner_id UUID;
BEGIN
  SELECT CASE
    WHEN user1_id = input_user_id THEN user2_id
    WHEN user2_id = input_user_id THEN user1_id
  END INTO partner_id
  FROM partnerships
  WHERE (user1_id = input_user_id OR user2_id = input_user_id)
    AND status = 'active'
  LIMIT 1;
  
  RETURN partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users are partners
CREATE OR REPLACE FUNCTION are_partners(uid1 UUID, uid2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM partnerships
    WHERE status = 'active'
      AND ((user1_id = uid1 AND user2_id = uid2)
        OR (user1_id = uid2 AND user2_id = uid1))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATED VIEWS FOR SHARED DATA
-- ============================================

-- Drop old views
DROP VIEW IF EXISTS monthly_expenses;
DROP VIEW IF EXISTS monthly_income;

-- View for combined monthly expenses (both partners)
CREATE OR REPLACE VIEW monthly_expenses_combined AS
SELECT 
  t.user_id,
  up.display_name AS added_by, -- Name tag showing who added it
  DATE_TRUNC('month', t.date) AS month,
  t.category,
  SUM(t.amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
WHERE t.type = 'expense'
  AND (
    t.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.status = 'active'
        AND ((p.user1_id = auth.uid() AND p.user2_id = t.user_id)
          OR (p.user2_id = auth.uid() AND p.user1_id = t.user_id))
    )
  )
GROUP BY t.user_id, up.display_name, DATE_TRUNC('month', t.date), t.category;

-- View for combined monthly income (both partners)
CREATE OR REPLACE VIEW monthly_income_combined AS
SELECT 
  t.user_id,
  up.display_name AS added_by, -- Name tag showing who added it
  DATE_TRUNC('month', t.date) AS month,
  t.category,
  SUM(t.amount) AS total_amount,
  COUNT(*) AS transaction_count
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
WHERE t.type = 'income'
  AND (
    t.user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.status = 'active'
        AND ((p.user1_id = auth.uid() AND p.user2_id = t.user_id)
          OR (p.user2_id = auth.uid() AND p.user1_id = t.user_id))
    )
  )
GROUP BY t.user_id, up.display_name, DATE_TRUNC('month', t.date), t.category;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for partnerships
DROP TRIGGER IF EXISTS update_partnerships_updated_at ON partnerships;
CREATE TRIGGER update_partnerships_updated_at
  BEFORE UPDATE ON partnerships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE user_profiles IS 'User profile information including display names for tracking';
COMMENT ON TABLE partnerships IS 'Links two users together as partners to share all financial data';
COMMENT ON COLUMN user_profiles.display_name IS 'Name shown in the app to identify who added what (e.g., "Alex", "Partner Name")';
COMMENT ON COLUMN partnerships.status IS 'Partnership status: active (sharing enabled) or inactive (sharing disabled)';

