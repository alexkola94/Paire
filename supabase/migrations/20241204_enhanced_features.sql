-- =====================================================
-- Migration: Enhanced Features for You & Me Expenses
-- Date: December 4, 2024
-- Description: Adds budgets, savings goals, recurring bills,
--              shopping lists, loan payments, and reminder preferences
-- =====================================================

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BUDGETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID,
    category TEXT NOT NULL,
    budgeted_amount DECIMAL(12, 2) NOT NULL CHECK (budgeted_amount >= 0),
    spent_amount DECIMAL(12, 2) DEFAULT 0 CHECK (spent_amount >= 0),
    period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    alert_threshold DECIMAL(5, 2) DEFAULT 90 CHECK (alert_threshold BETWEEN 0 AND 100),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active);

-- RLS Policies for budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budgets" ON budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own budgets" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 2. SAVINGS GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
    target_date TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category TEXT,
    icon TEXT,
    color TEXT,
    is_achieved BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for savings_goals
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_household_id ON savings_goals(household_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_achieved ON savings_goals(is_achieved);
CREATE INDEX IF NOT EXISTS idx_savings_goals_priority ON savings_goals(priority);

-- RLS Policies for savings_goals
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own savings goals" ON savings_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings goals" ON savings_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON savings_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. RECURRING BILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS recurring_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID,
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    last_paid_date TIMESTAMP WITH TIME ZONE,
    auto_pay BOOLEAN DEFAULT false,
    reminder_days INTEGER DEFAULT 3 CHECK (reminder_days >= 0),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for recurring_bills
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_id ON recurring_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_household_id ON recurring_bills(household_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_next_due ON recurring_bills(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_active ON recurring_bills(is_active);

-- RLS Policies for recurring_bills
ALTER TABLE recurring_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring bills" ON recurring_bills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring bills" ON recurring_bills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring bills" ON recurring_bills
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring bills" ON recurring_bills
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. SHOPPING LISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID,
    name TEXT NOT NULL,
    category TEXT,
    is_completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMP WITH TIME ZONE,
    estimated_total DECIMAL(12, 2),
    actual_total DECIMAL(12, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for shopping_lists
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_household_id ON shopping_lists(household_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_completed ON shopping_lists(is_completed);

-- RLS Policies for shopping_lists
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopping lists" ON shopping_lists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopping lists" ON shopping_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. SHOPPING LIST ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shopping_list_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1 CHECK (quantity > 0),
    unit TEXT,
    estimated_price DECIMAL(10, 2),
    actual_price DECIMAL(10, 2),
    is_checked BOOLEAN DEFAULT false,
    category TEXT,
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for shopping_list_items
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_checked ON shopping_list_items(is_checked);

-- RLS Policies for shopping_list_items (inherit from parent shopping_list)
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in their shopping lists" ON shopping_list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create items in their shopping lists" ON shopping_list_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their shopping lists" ON shopping_list_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their shopping lists" ON shopping_list_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = auth.uid()
        )
    );

-- =====================================================
-- 6. LOAN PAYMENTS TABLE (for installment tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    principal_amount DECIMAL(12, 2) NOT NULL CHECK (principal_amount >= 0),
    interest_amount DECIMAL(12, 2) DEFAULT 0 CHECK (interest_amount >= 0),
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for loan_payments
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user_id ON loan_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_date ON loan_payments(payment_date);

-- RLS Policies for loan_payments
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loan payments" ON loan_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own loan payments" ON loan_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loan payments" ON loan_payments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loan payments" ON loan_payments
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. REMINDER PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reminder_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    bill_reminders_enabled BOOLEAN DEFAULT true,
    bill_reminder_days INTEGER DEFAULT 3 CHECK (bill_reminder_days >= 0),
    loan_reminders_enabled BOOLEAN DEFAULT true,
    loan_reminder_days INTEGER DEFAULT 7 CHECK (loan_reminder_days >= 0),
    budget_alerts_enabled BOOLEAN DEFAULT true,
    budget_alert_threshold DECIMAL(5, 2) DEFAULT 90 CHECK (budget_alert_threshold BETWEEN 0 AND 100),
    savings_milestones_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for reminder_preferences
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminder_preferences_user_id ON reminder_preferences(user_id);

-- RLS Policies for reminder_preferences
ALTER TABLE reminder_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminder preferences" ON reminder_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminder preferences" ON reminder_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminder preferences" ON reminder_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder preferences" ON reminder_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 8. UPDATE EXISTING TABLES
-- =====================================================

-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS partner_id UUID,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by TEXT,
ADD COLUMN IF NOT EXISTS split_type TEXT,
ADD COLUMN IF NOT EXISTS split_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add new columns to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS household_id UUID,
ADD COLUMN IF NOT EXISTS duration_years INTEGER,
ADD COLUMN IF NOT EXISTS duration_months INTEGER,
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS has_installments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS installment_frequency TEXT,
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- 9. TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all relevant tables
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_bills_updated_at BEFORE UPDATE ON recurring_bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_preferences_updated_at BEFORE UPDATE ON reminder_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. HELPFUL VIEWS (OPTIONAL)
-- =====================================================

-- View for upcoming bills
CREATE OR REPLACE VIEW upcoming_bills AS
SELECT 
    rb.*,
    EXTRACT(DAY FROM (rb.next_due_date - NOW())) as days_until_due
FROM recurring_bills rb
WHERE rb.is_active = true
AND rb.next_due_date >= NOW()
ORDER BY rb.next_due_date;

-- View for budget status
CREATE OR REPLACE VIEW budget_status AS
SELECT 
    b.*,
    CASE 
        WHEN b.budgeted_amount > 0 THEN (b.spent_amount / b.budgeted_amount * 100)
        ELSE 0
    END as percentage_used,
    (b.budgeted_amount - b.spent_amount) as remaining_budget
FROM budgets b
WHERE b.is_active = true;

-- View for savings progress
CREATE OR REPLACE VIEW savings_progress AS
SELECT 
    sg.*,
    CASE 
        WHEN sg.target_amount > 0 THEN (sg.current_amount / sg.target_amount * 100)
        ELSE 0
    END as percentage_complete,
    (sg.target_amount - sg.current_amount) as amount_remaining
FROM savings_goals sg
WHERE sg.is_achieved = false;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add a comment to track migration
COMMENT ON TABLE budgets IS 'Enhanced features migration - December 4, 2024';
COMMENT ON TABLE savings_goals IS 'Enhanced features migration - December 4, 2024';
COMMENT ON TABLE recurring_bills IS 'Enhanced features migration - December 4, 2024';
COMMENT ON TABLE shopping_lists IS 'Enhanced features migration - December 4, 2024';
COMMENT ON TABLE shopping_list_items IS 'Enhanced features migration - December 4, 2024';
COMMENT ON TABLE loan_payments IS 'Enhanced features migration - December 4, 2024';
COMMENT ON TABLE reminder_preferences IS 'Enhanced features migration - December 4, 2024';

