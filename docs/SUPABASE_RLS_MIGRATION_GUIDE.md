# Supabase RLS Security Migration - Deployment Guide

This guide explains how to apply the security migration to fix all RLS issues reported by Supabase.

## What This Migration Does

✅ **Enables Row Level Security (RLS) on 27 tables**
- User-scoped tables: Users can only access their own data
- Partner-shared tables: Users can access their own + partner's data  
- System tables: Restrictive policies for AspNet and system tables

✅ **Fixes Security Vulnerabilities**
- Adds `search_path` protection to `get_partner_id` function
- Adds `search_path` protection to `are_partners` function

✅ **Provides Documentation**
- Manual steps to enable password breach detection

## Files Created

1. **`supabase/migrations/20251226_fix_all_rls_security.sql`** - Main migration file
2. **`docs/enable_password_breach_detection.md`** - Password breach detection guide

## How to Apply This Migration

### Option 1: Via Supabase CLI (Recommended)

```bash
# Make sure you're in the project root
cd e:\repos\alexkola94\You&me_Expenses

# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

### Option 2: Via Supabase Dashboard

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the contents of `supabase/migrations/20251226_fix_all_rls_security.sql`
6. Paste into the SQL Editor
7. Click **Run** ▶️

### Option 3: Manual File Upload

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Database** → **Migrations**
4. Click **New Migration**
5. Upload `supabase/migrations/20251226_fix_all_rls_security.sql`

## Verification Steps

After applying the migration, verify it worked:

### 1. Check RLS is Enabled

Run this query in Supabase SQL Editor:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected**: All tables should show `rowsecurity = t` (true)

### 2. Check Policies Exist

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected**: Each table should have at least one policy

### 3. Test Your Application

1. **Start the backend API**
   ```bash
   cd backend/YouAndMeExpensesAPI
   dotnet run
   ```

2. **Start the frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test basic functionality**
   - Register a new user
   - Login
   - Create a transaction
   - Create a loan
   - Verify no "permission denied" errors

### 4. Test User Isolation

1. Create two test users (User A and User B)
2. Login as User A, create some transactions
3. Login as User B, verify you CANNOT see User A's transactions
4. Create a partnership between User A and User B
5. Verify now you CAN see each other's transactions

## Important Notes

> [!WARNING]
> **Backend Database Connection**
> 
> Your backend must use the **service role key** (not the anon key) for database connections. This allows the backend to bypass RLS when needed for system operations.
> 
> Check your backend connection string in `appsettings.json` or environment variables.

> [!IMPORTANT]
> **AspNet Identity Tables**
> 
> The AspNet tables (`AspNetUsers`, `AspNetRoles`, etc.) now have strict RLS policies. Your backend will use the service role connection, so it will continue to work normally.
> 
> Direct access via Supabase client will be restricted.

## Enable Password Breach Detection

After applying the migration, follow the manual steps in:
`docs/enable_password_breach_detection.md`

This is a Supabase dashboard setting that cannot be automated via SQL.

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Disable RLS on all tables (NOT RECOMMENDED for production)
-- Only use this for testing/debugging

ALTER TABLE user_achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievements DISABLE ROW LEVEL SECURITY;
-- ... etc for all tables
```

**Note**: It's better to fix any issues with the policies than to disable RLS entirely.

## Troubleshooting

### "permission denied" errors

**Cause**: Backend is using anon key instead of service role key

**Fix**: Update your connection string to use the service role key

### "relation does not exist" errors

**Cause**: Migration not applied yet

**Fix**: Apply the migration using one of the methods above

### Users can't see partner data

**Cause**: Partnership not created or status not 'active'

**Fix**: Verify the partnership exists in the `partnerships` table with `status = 'active'`

## Next Steps

After successful deployment:

1. ✅ Monitor application logs for any RLS-related errors
2. ✅ Test all critical user flows
3. ✅ Enable password breach detection (see docs)
4. ✅ Consider enabling additional auth security features
5. ✅ Document any RLS policy adjustments for future reference

## Support

If you encounter issues:
- Check Supabase logs: Dashboard → Logs → Database Logs
- Review RLS policies: Dashboard → Database → Policies
- Test SQL queries directly in SQL Editor to isolate issues
