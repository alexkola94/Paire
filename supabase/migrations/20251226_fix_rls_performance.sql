-- ============================================
-- Migration: Fix RLS Performance Issues
-- Created: 2025-12-26
-- Description: Optimizes RLS policies by using (select auth.uid()) 
--              and removes duplicate indexes
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================

-- ============================================
-- PART 1: FIX SHOPPING_LISTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can create their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can update their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can delete their own shopping lists" ON shopping_lists;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own shopping lists" ON shopping_lists
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own shopping lists" ON shopping_lists
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- PART 2: FIX SHOPPING_LIST_ITEMS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view items in their shopping lists" ON shopping_list_items;
DROP POLICY IF EXISTS "Users can create items in their shopping lists" ON shopping_list_items;
DROP POLICY IF EXISTS "Users can update items in their shopping lists" ON shopping_list_items;
DROP POLICY IF EXISTS "Users can delete items in their shopping lists" ON shopping_list_items;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view items in their shopping lists" ON shopping_list_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can create items in their shopping lists" ON shopping_list_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update items in their shopping lists" ON shopping_list_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can delete items in their shopping lists" ON shopping_list_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM shopping_lists
            WHERE shopping_lists.id = shopping_list_items.shopping_list_id
            AND shopping_lists.user_id = (select auth.uid())
        )
    );

-- ============================================
-- PART 3: FIX REMINDER_PREFERENCES RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reminder preferences" ON reminder_preferences;
DROP POLICY IF EXISTS "Users can create their own reminder preferences" ON reminder_preferences;
DROP POLICY IF EXISTS "Users can update their own reminder preferences" ON reminder_preferences;
DROP POLICY IF EXISTS "Users can delete their own reminder preferences" ON reminder_preferences;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own reminder preferences" ON reminder_preferences
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own reminder preferences" ON reminder_preferences
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reminder preferences" ON reminder_preferences
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own reminder preferences" ON reminder_preferences
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- PART 4: REMOVE DUPLICATE INDEXES
-- ============================================

-- The table has a UNIQUE constraint on user_id (created by the column definition)
-- which automatically creates an index, making idx_reminder_preferences_user_id redundant
-- We'll keep the constraint-based index and drop the explicitly created one
DROP INDEX IF EXISTS idx_reminder_preferences_user_id;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'RLS performance optimization completed successfully';
  RAISE NOTICE 'Updated policies for shopping_lists, shopping_list_items, and reminder_preferences';
  RAISE NOTICE 'Removed duplicate index on reminder_preferences';
END $$;
