-- ============================================
-- You & Me Expenses - Database Schema
-- PostgreSQL / Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TRANSACTIONS TABLE (Expenses & Income)
-- ============================================

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  attachment_url TEXT,
  attachment_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category);

-- ============================================
-- LOANS TABLE
-- ============================================

CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('given', 'received')),
  party_name VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
  remaining_amount DECIMAL(10, 2) NOT NULL CHECK (remaining_amount >= 0),
  due_date DATE,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_type ON loans(type);
CREATE INDEX idx_loans_status ON loans(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transactions
CREATE POLICY "Users can view own transactions" 
  ON transactions FOR SELECT 
  USING (auth.uid() = user_id);

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

-- Enable RLS on loans table
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Users can only see their own loans
CREATE POLICY "Users can view own loans" 
  ON loans FOR SELECT 
  USING (auth.uid() = user_id);

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
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for transactions table
CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for loans table
CREATE TRIGGER update_loans_updated_at 
  BEFORE UPDATE ON loans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR RECEIPTS
-- ============================================

-- Create storage bucket (run in Supabase dashboard or via supabase CLI)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('receipts', 'receipts', true);

-- Storage policies (allow authenticated users to upload and manage their files)
-- CREATE POLICY "Authenticated users can upload receipts"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'receipts');

-- CREATE POLICY "Users can view their own receipts"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'receipts');

-- CREATE POLICY "Users can delete their own receipts"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'receipts');

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE transactions IS 'Stores both expenses and income transactions';
COMMENT ON TABLE loans IS 'Stores loans given to or received from others';
COMMENT ON COLUMN transactions.type IS 'Type of transaction: expense or income';
COMMENT ON COLUMN transactions.attachment_url IS 'Public URL for receipt/document';
COMMENT ON COLUMN transactions.attachment_path IS 'Storage path for deletion';
COMMENT ON COLUMN loans.type IS 'Type of loan: given (money lent) or received (money borrowed)';
COMMENT ON COLUMN loans.party_name IS 'Name of the person who borrowed or lent money';
COMMENT ON COLUMN loans.status IS 'Loan status: active or completed';

