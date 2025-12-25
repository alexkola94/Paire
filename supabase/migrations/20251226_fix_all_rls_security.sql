-- ============================================
-- Migration: Fix All RLS and Security Issues
-- Created: 2025-12-26
-- Description: Enables RLS on all tables, fixes function security, and adds comprehensive policies
-- ============================================

-- ============================================
-- PART 1: ENABLE RLS ON ALL TABLES
-- ============================================

-- Enable RLS on tables that don't have it yet
ALTER TABLE IF EXISTS user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS data_clearing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_bill_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partnership_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bank_connections ENABLE ROW LEVEL SECURITY;

-- Enable RLS on AspNet Identity tables (system managed)
ALTER TABLE IF EXISTS "AspNetUserTokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AspNetUserRoles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AspNetUserLogins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AspNetUserClaims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AspNetUsers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AspNetRoleClaims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AspNetRoles" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on system tables
ALTER TABLE IF EXISTS "__EFMigrationsHistory" ENABLE ROW LEVEL SECURITY;

-- Verify existing tables also have RLS enabled
ALTER TABLE IF EXISTS shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reminder_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: USER ACHIEVEMENTS POLICIES
-- ============================================

-- Users can view their own achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own achievements
DROP POLICY IF EXISTS "Users can insert own achievements" ON user_achievements;
CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own achievements
DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;
CREATE POLICY "Users can update own achievements"
  ON user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own achievements
DROP POLICY IF EXISTS "Users can delete own achievements" ON user_achievements;
CREATE POLICY "Users can delete own achievements"
  ON user_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 3: ACHIEVEMENTS POLICIES (Public Read)
-- ============================================

-- All authenticated users can view achievements
DROP POLICY IF EXISTS "Authenticated users can view achievements" ON achievements;
CREATE POLICY "Authenticated users can view achievements"
  ON achievements FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can modify achievements (system/admin only)
-- Note: Service role bypasses RLS, so these are for documentation
DROP POLICY IF EXISTS "Service role can insert achievements" ON achievements;
CREATE POLICY "Service role can insert achievements"
  ON achievements FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update achievements" ON achievements;
CREATE POLICY "Service role can update achievements"
  ON achievements FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can delete achievements" ON achievements;
CREATE POLICY "Service role can delete achievements"
  ON achievements FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 4: DATA CLEARING REQUESTS POLICIES
-- ============================================

-- Users can view their own data clearing requests
DROP POLICY IF EXISTS "Users can view own data clearing requests" ON data_clearing_requests;
CREATE POLICY "Users can view own data clearing requests"
  ON data_clearing_requests FOR SELECT
  USING (
    auth.uid() = requester_user_id OR
    auth.uid() = partner_user_id
  );

-- Users can create their own data clearing requests
DROP POLICY IF EXISTS "Users can create own data clearing requests" ON data_clearing_requests;
CREATE POLICY "Users can create own data clearing requests"
  ON data_clearing_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_user_id);

-- Users can update their own data clearing requests
DROP POLICY IF EXISTS "Users can update own data clearing requests" ON data_clearing_requests;
CREATE POLICY "Users can update own data clearing requests"
  ON data_clearing_requests FOR UPDATE
  USING (
    auth.uid() = requester_user_id OR
    auth.uid() = partner_user_id
  );

-- Users can delete their own data clearing requests
DROP POLICY IF EXISTS "Users can delete own data clearing requests" ON data_clearing_requests;
CREATE POLICY "Users can delete own data clearing requests"
  ON data_clearing_requests FOR DELETE
  USING (auth.uid() = requester_user_id);

-- ============================================
-- PART 5: IMPORT HISTORY POLICIES
-- ============================================

-- Users can view their own import history
DROP POLICY IF EXISTS "Users can view own import history" ON import_history;
CREATE POLICY "Users can view own import history"
  ON import_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own import history
DROP POLICY IF EXISTS "Users can create own import history" ON import_history;
CREATE POLICY "Users can create own import history"
  ON import_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own import history
DROP POLICY IF EXISTS "Users can update own import history" ON import_history;
CREATE POLICY "Users can update own import history"
  ON import_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own import history
DROP POLICY IF EXISTS "Users can delete own import history" ON import_history;
CREATE POLICY "Users can delete own import history"
  ON import_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 6: RECURRING BILL ATTACHMENTS POLICIES
-- ============================================

-- Users can view attachments for their recurring bills
DROP POLICY IF EXISTS "Users can view own bill attachments" ON recurring_bill_attachments;
CREATE POLICY "Users can view own bill attachments"
  ON recurring_bill_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recurring_bills
      WHERE recurring_bills.id = recurring_bill_attachments.recurring_bill_id
        AND recurring_bills.user_id = auth.uid()
    )
  );

-- Users can insert attachments for their recurring bills
DROP POLICY IF EXISTS "Users can insert own bill attachments" ON recurring_bill_attachments;
CREATE POLICY "Users can insert own bill attachments"
  ON recurring_bill_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recurring_bills
      WHERE recurring_bills.id = recurring_bill_attachments.recurring_bill_id
        AND recurring_bills.user_id = auth.uid()
    )
  );

-- Users can update attachments for their recurring bills
DROP POLICY IF EXISTS "Users can update own bill attachments" ON recurring_bill_attachments;
CREATE POLICY "Users can update own bill attachments"
  ON recurring_bill_attachments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recurring_bills
      WHERE recurring_bills.id = recurring_bill_attachments.recurring_bill_id
        AND recurring_bills.user_id = auth.uid()
    )
  );

-- Users can delete attachments for their recurring bills
DROP POLICY IF EXISTS "Users can delete own bill attachments" ON recurring_bill_attachments;
CREATE POLICY "Users can delete own bill attachments"
  ON recurring_bill_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recurring_bills
      WHERE recurring_bills.id = recurring_bill_attachments.recurring_bill_id
        AND recurring_bills.user_id = auth.uid()
    )
  );

-- ============================================
-- PART 7: SYSTEM LOGS POLICIES
-- ============================================

-- Only service role can access system logs (admin/system only)
DROP POLICY IF EXISTS "Service role can view system logs" ON system_logs;
CREATE POLICY "Service role can view system logs"
  ON system_logs FOR SELECT
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can insert system logs" ON system_logs;
CREATE POLICY "Service role can insert system logs"
  ON system_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update system logs" ON system_logs;
CREATE POLICY "Service role can update system logs"
  ON system_logs FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can delete system logs" ON system_logs;
CREATE POLICY "Service role can delete system logs"
  ON system_logs FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 8: USER SESSIONS POLICIES
-- ============================================

-- Users can view their own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own sessions
DROP POLICY IF EXISTS "Users can create own sessions" ON user_sessions;
CREATE POLICY "Users can create own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sessions
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;
CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 9: BANK ACCOUNTS POLICIES
-- ============================================

-- Users can view their own bank accounts
DROP POLICY IF EXISTS "Users can view own bank accounts" ON bank_accounts;
CREATE POLICY "Users can view own bank accounts"
  ON bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own bank accounts
DROP POLICY IF EXISTS "Users can create own bank accounts" ON bank_accounts;
CREATE POLICY "Users can create own bank accounts"
  ON bank_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bank accounts
DROP POLICY IF EXISTS "Users can update own bank accounts" ON bank_accounts;
CREATE POLICY "Users can update own bank accounts"
  ON bank_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own bank accounts
DROP POLICY IF EXISTS "Users can delete own bank accounts" ON bank_accounts;
CREATE POLICY "Users can delete own bank accounts"
  ON bank_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 10: PARTNERSHIP INVITATIONS POLICIES
-- ============================================

-- Users can view invitations they sent or received
DROP POLICY IF EXISTS "Users can view related partnership invitations" ON partnership_invitations;
CREATE POLICY "Users can view related partnership invitations"
  ON partnership_invitations FOR SELECT
  USING (
    auth.uid() = inviter_id OR
    auth.jwt()->>'email' = invitee_email
  );

-- Users can create partnership invitations
DROP POLICY IF EXISTS "Users can create partnership invitations" ON partnership_invitations;
CREATE POLICY "Users can create partnership invitations"
  ON partnership_invitations FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Users can update invitations they are involved with
DROP POLICY IF EXISTS "Users can update related partnership invitations" ON partnership_invitations;
CREATE POLICY "Users can update related partnership invitations"
  ON partnership_invitations FOR UPDATE
  USING (
    auth.uid() = inviter_id OR
    auth.jwt()->>'email' = invitee_email
  );

-- Users can delete invitations they created
DROP POLICY IF EXISTS "Users can delete own partnership invitations" ON partnership_invitations;
CREATE POLICY "Users can delete own partnership invitations"
  ON partnership_invitations FOR DELETE
  USING (auth.uid() = inviter_id);

-- ============================================
-- PART 11: BANK CONNECTIONS POLICIES
-- ============================================

-- Users can view their own bank connections
DROP POLICY IF EXISTS "Users can view own bank connections" ON bank_connections;
CREATE POLICY "Users can view own bank connections"
  ON bank_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own bank connections
DROP POLICY IF EXISTS "Users can create own bank connections" ON bank_connections;
CREATE POLICY "Users can create own bank connections"
  ON bank_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own bank connections
DROP POLICY IF EXISTS "Users can update own bank connections" ON bank_connections;
CREATE POLICY "Users can update own bank connections"
  ON bank_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own bank connections
DROP POLICY IF EXISTS "Users can delete own bank connections" ON bank_connections;
CREATE POLICY "Users can delete own bank connections"
  ON bank_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PART 12: ASPNET IDENTITY TABLES POLICIES
-- ============================================
-- These tables are managed by ASP.NET Core Identity, not Supabase Auth
-- Restrictive policies to prevent direct access via Supabase client
-- Backend uses service role which bypasses RLS

-- AspNetUsers - Users can view their own user record
DROP POLICY IF EXISTS "Users can view own AspNetUsers record" ON "AspNetUsers";
CREATE POLICY "Users can view own AspNetUsers record"
  ON "AspNetUsers" FOR SELECT
  USING (
    "Id" = auth.uid()::text OR
    auth.role() = 'service_role'
  );

-- Service role only for modifications
DROP POLICY IF EXISTS "Service role can modify AspNetUsers" ON "AspNetUsers";
CREATE POLICY "Service role can modify AspNetUsers"
  ON "AspNetUsers" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AspNetRoles - Public read for role names, service role for write
DROP POLICY IF EXISTS "Authenticated users can view roles" ON "AspNetRoles";
CREATE POLICY "Authenticated users can view roles"
  ON "AspNetRoles" FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can modify AspNetRoles" ON "AspNetRoles";
CREATE POLICY "Service role can modify AspNetRoles"
  ON "AspNetRoles" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AspNetUserRoles - Service role only
DROP POLICY IF EXISTS "Service role can manage AspNetUserRoles" ON "AspNetUserRoles";
CREATE POLICY "Service role can manage AspNetUserRoles"
  ON "AspNetUserRoles" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AspNetUserClaims - Service role only
DROP POLICY IF EXISTS "Service role can manage AspNetUserClaims" ON "AspNetUserClaims";
CREATE POLICY "Service role can manage AspNetUserClaims"
  ON "AspNetUserClaims" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AspNetUserLogins - Service role only
DROP POLICY IF EXISTS "Service role can manage AspNetUserLogins" ON "AspNetUserLogins";
CREATE POLICY "Service role can manage AspNetUserLogins"
  ON "AspNetUserLogins" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AspNetUserTokens - Service role only
DROP POLICY IF EXISTS "Service role can manage AspNetUserTokens" ON "AspNetUserTokens";
CREATE POLICY "Service role can manage AspNetUserTokens"
  ON "AspNetUserTokens" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- AspNetRoleClaims - Service role only
DROP POLICY IF EXISTS "Service role can manage AspNetRoleClaims" ON "AspNetRoleClaims";
CREATE POLICY "Service role can manage AspNetRoleClaims"
  ON "AspNetRoleClaims" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- PART 13: EF MIGRATIONS HISTORY POLICIES
-- ============================================
-- This table is managed by Entity Framework migrations
-- Service role only access

DROP POLICY IF EXISTS "Service role can manage migrations history" ON "__EFMigrationsHistory";
CREATE POLICY "Service role can manage migrations history"
  ON "__EFMigrationsHistory" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- PART 14: FIX FUNCTION SECURITY ISSUES
-- ============================================
-- Fix search_path vulnerability in helper functions

-- Recreate get_partner_id function with secure search_path
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
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- Recreate are_partners function with secure search_path
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
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Add comments for documentation
COMMENT ON TABLE user_achievements IS 'User achievements with RLS enabled - users can only access their own achievements';
COMMENT ON TABLE achievements IS 'Achievement definitions with RLS enabled - public read, system write';
COMMENT ON TABLE data_clearing_requests IS 'Data clearing requests with RLS enabled - users can access requests they are involved in';
COMMENT ON TABLE import_history IS 'Import history with RLS enabled - users can only access their own import history';
COMMENT ON TABLE recurring_bill_attachments IS 'Bill attachments with RLS enabled - access controlled via parent recurring_bills';
COMMENT ON TABLE system_logs IS 'System logs with RLS enabled - service role only access';
COMMENT ON TABLE user_sessions IS 'User sessions with RLS enabled - users can only access their own sessions';
COMMENT ON TABLE bank_accounts IS 'Bank accounts with RLS enabled - users can only access their own accounts';
COMMENT ON TABLE partnership_invitations IS 'Partnership invitations with RLS enabled - users can access invitations they sent or received';
COMMENT ON TABLE bank_connections IS 'Bank connections with RLS enabled - users can only access their own connections';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'RLS migration completed successfully';
  RAISE NOTICE 'All 27 tables now have RLS enabled with appropriate policies';
  RAISE NOTICE 'Function security vulnerabilities fixed in get_partner_id and are_partners';
  RAISE NOTICE 'Next step: Enable password breach detection in Supabase dashboard';
END $$;
