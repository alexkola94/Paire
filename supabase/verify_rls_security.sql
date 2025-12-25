-- ============================================
-- VERIFICATION QUERIES
-- Run these queries to verify the RLS migration was successful
-- ============================================

-- ============================================
-- Query 1: Verify RLS is Enabled on All Tables
-- ============================================
-- This should show all tables with rowsecurity = true

SELECT 
  schemaname, 
  tablename, 
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- Expected: All tables should show "✅ Enabled"

-- ============================================
-- Query 2: Count Policies Per Table
-- ============================================
-- This shows how many policies each table has

SELECT 
  tablename, 
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has Policies'
    ELSE '❌ No Policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected: All tables should have at least one policy

-- ============================================
-- Query 3: List All Policies by Table
-- ============================================
-- Detailed view of all policies

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE permissive 
    WHEN true THEN 'Permissive'
    ELSE 'Restrictive'
  END as type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- Query 4: Verify Function Security
-- ============================================
-- Check that functions have search_path protection

SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%SET search_path%' THEN '✅ Secure'
    ELSE '❌ Vulnerable'
  END as security_status,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_mode
FROM pg_proc 
WHERE proname IN ('get_partner_id', 'are_partners')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Expected: Both functions should show "✅ Secure"

-- ============================================
-- Query 5: Tables Without RLS (Should Be Empty)
-- ============================================
-- This query finds tables that don't have RLS enabled

SELECT 
  schemaname,
  tablename,
  '❌ RLS Not Enabled' as issue
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = false
ORDER BY tablename;

-- Expected: No results (empty set)

-- ============================================
-- Query 6: Tables Without Policies (Should Be Empty)
-- ============================================
-- This finds tables with RLS enabled but no policies

SELECT 
  t.tablename,
  '❌ No Policies Defined' as issue
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND p.policyname IS NULL
GROUP BY t.tablename
ORDER BY t.tablename;

-- Expected: No results (empty set)

-- ============================================
-- Query 7: Summary Report
-- ============================================
-- Overall security status summary

WITH rls_status AS (
  SELECT COUNT(*) as total_tables,
         SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) as protected_tables
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
),
policy_status AS (
  SELECT COUNT(DISTINCT tablename) as tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public'
),
function_status AS (
  SELECT COUNT(*) as secure_functions
  FROM pg_proc
  WHERE proname IN ('get_partner_id', 'are_partners')
    AND prosrc LIKE '%SET search_path%'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
)
SELECT 
  '📊 SECURITY SUMMARY' as report,
  r.total_tables as total_tables,
  r.protected_tables as rls_enabled,
  p.tables_with_policies as tables_with_policies,
  f.secure_functions as secure_functions,
  CASE 
    WHEN r.total_tables = r.protected_tables 
     AND r.protected_tables = p.tables_with_policies
     AND f.secure_functions = 2
    THEN '✅ All Security Issues Fixed'
    ELSE '⚠️ Some Issues Remain'
  END as overall_status
FROM rls_status r, policy_status p, function_status f;

-- Expected: "✅ All Security Issues Fixed"

-- ============================================
-- Query 8: Test User Isolation (Run as authenticated user)
-- ============================================
-- This would be run from your application to test RLS is working
-- Replace 'YOUR_USER_ID' with actual UUID

-- Test 1: Can you see your own transactions?
-- SELECT COUNT(*) FROM transactions WHERE user_id = auth.uid();
-- Expected: Returns your transaction count

-- Test 2: Can you see another user's transactions? (should fail or return 0)
-- SELECT COUNT(*) FROM transactions WHERE user_id = 'ANOTHER_USER_ID';
-- Expected: Returns 0 (if no partnership) or their count (if partnership exists)

-- ============================================
-- DIAGNOSTIC QUERIES
-- ============================================

-- Show all RLS-related settings
SELECT 
  name, 
  setting, 
  short_desc
FROM pg_settings
WHERE name LIKE '%row%security%';

-- Show table ownership
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
