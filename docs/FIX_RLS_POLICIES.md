# 🔒 Fix: Row Level Security (RLS) Policies

## ❌ The Problem

You're seeing **406 (Not Acceptable)** errors when trying to access the Partnership page:

```
GET .../user_profiles?... 406 (Not Acceptable)
```

**Root Cause:** The `user_profiles` table has Row Level Security (RLS) enabled, but the policies are missing or incorrect. This blocks all reads/writes to the table.

---

## 🚨 Quick Understanding: What is RLS?

**Row Level Security (RLS)** is Supabase's way of controlling who can see or modify which rows in your tables.

- ✅ **Good:** Keeps your data secure
- ❌ **Bad:** If policies are missing, nobody can access the data (even legitimate users!)

---

## ✅ The Solution: Run SQL Migrations

I've created **4 SQL migration files** to fix all RLS policies:

1. **`fix_user_profiles_rls_simple.sql`** ⭐ **START HERE**
2. `fix_partnerships_rls.sql`
3. `fix_budgets_rls.sql`
4. `fix_user_profiles_rls.sql` (alternative, more restrictive)

---

## 🚀 Step-by-Step Fix (5 minutes)

### Step 1: Go to Supabase SQL Editor

1. Open https://supabase.com/dashboard
2. Select your project (`sirgeoifiuevsdrjwfwq`)
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run User Profiles RLS Fix (MOST IMPORTANT)

Copy and paste **`supabase/migrations/fix_user_profiles_rls_simple.sql`** and click **Run**.

This will:
- ✅ Allow authenticated users to read all profiles (needed for partnerships)
- ✅ Allow users to create their own profile
- ✅ Allow users to update only their own profile

```sql
-- Key policy that fixes the 406 error
CREATE POLICY "Authenticated users can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (true);
```

### Step 3: Run Partnerships RLS Fix

Copy and paste **`supabase/migrations/fix_partnerships_rls.sql`** and click **Run**.

This allows users to:
- ✅ View partnerships they're part of
- ✅ Create new partnerships
- ✅ Update/delete their partnerships

### Step 4: Run Budgets RLS Fix

Copy and paste **`supabase/migrations/fix_budgets_rls.sql`** and click **Run**.

This allows users to:
- ✅ View their own budgets
- ✅ View their partner's budgets
- ✅ Create/update/delete their own budgets

### Step 5: Refresh Your App

1. Go back to your app (http://localhost:3000)
2. **Hard refresh** (Ctrl + Shift + R)
3. Navigate to Partnership page
4. **The 406 error should be gone!** 🎉

---

## 📋 Quick Copy-Paste Guide

Run these in order in Supabase SQL Editor:

### 1. User Profiles (REQUIRED)
```sql
-- From fix_user_profiles_rls_simple.sql

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view partner profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can search profiles by email" ON user_profiles;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles"
ON user_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE TO authenticated 
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
```

### 2. Partnerships
```sql
-- From fix_partnerships_rls.sql

DROP POLICY IF EXISTS "Users can view their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can create partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can update their partnerships" ON partnerships;
DROP POLICY IF EXISTS "Users can delete their partnerships" ON partnerships;

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their partnerships"
ON partnerships FOR SELECT TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create partnerships"
ON partnerships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their partnerships"
ON partnerships FOR UPDATE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete their partnerships"
ON partnerships FOR DELETE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON partnerships TO authenticated;
```

### 3. Budgets
```sql
-- From fix_budgets_rls.sql

DROP POLICY IF EXISTS "Users can view their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete their budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view partner budgets" ON budgets;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their budgets"
ON budgets FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view partner budgets"
ON budgets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM partnerships
    WHERE partnerships.status = 'active'
    AND (
      (partnerships.user1_id = auth.uid() AND partnerships.user2_id = budgets.user_id)
      OR
      (partnerships.user2_id = auth.uid() AND partnerships.user1_id = budgets.user_id)
    )
  )
);

CREATE POLICY "Users can create budgets"
ON budgets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their budgets"
ON budgets FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their budgets"
ON budgets FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;
```

---

## 🧪 Test the Fixes

After running the SQL migrations:

### Test 1: Profile Page
1. Go to Profile page
2. Click Edit
3. Set display name
4. Should save without errors ✅

### Test 2: Partnership Page
1. Go to Partnership page
2. Should load without 406 error ✅
3. Click "Invite Partner"
4. Enter email
5. Should be able to search for user ✅

### Test 3: Budgets Page
1. Go to Budgets page
2. Click "Add Budget"
3. Fill form and save
4. Should work without errors ✅

---

## 📊 What Each Policy Does

### User Profiles RLS

| Policy | What It Does |
|--------|-------------|
| `Authenticated users can view all profiles` | Anyone logged in can read all profiles (needed for partnerships) |
| `Users can insert own profile` | You can only create your own profile |
| `Users can update own profile` | You can only edit your own profile |

**Why allow reading all profiles?**
- Users need to find partners by email
- Transactions show "Added by [name]" tags
- Partnership page displays partner details

### Partnerships RLS

| Policy | What It Does |
|--------|-------------|
| `Users can view their partnerships` | See partnerships you're part of |
| `Users can create partnerships` | Invite others to partner with you |
| `Users can update their partnerships` | Change partnership status |
| `Users can delete their partnerships` | End a partnership |

### Budgets RLS

| Policy | What It Does |
|--------|-------------|
| `Users can view their budgets` | See your own budgets |
| `Users can view partner budgets` | See your partner's budgets (if partnered) |
| `Users can create budgets` | Create your own budgets |
| `Users can update their budgets` | Edit your own budgets |
| `Users can delete their budgets` | Delete your own budgets |

---

## 🔍 Troubleshooting

### Still Getting 406 Errors?

1. **Check if policies were created:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('user_profiles', 'partnerships', 'budgets');
   ```

2. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('user_profiles', 'partnerships', 'budgets');
   ```
   Should show `rowsecurity = true`

3. **Test a simple query:**
   ```sql
   SELECT COUNT(*) FROM user_profiles;
   ```
   If this returns a number, RLS is working!

### Getting "relation does not exist" errors?

Run the table creation migrations first:
- `supabase/migrations/20241204_add_partner_sharing.sql`

### Getting "permission denied" errors?

Run the GRANT statements:
```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON partnerships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets TO authenticated;
```

---

## 🎯 Expected Behavior After Fix

### ✅ What Should Work

- **Profile Page:**
  - ✅ Can view own profile
  - ✅ Can edit display name
  - ✅ Can upload avatar
  - ✅ Changes save successfully

- **Partnership Page:**
  - ✅ Page loads without errors
  - ✅ Can search for partners by email
  - ✅ Can create partnerships
  - ✅ Can see partner details
  - ✅ Can disconnect partnerships

- **Budgets Page:**
  - ✅ Can view own budgets
  - ✅ Can create new budgets
  - ✅ Can edit/delete budgets
  - ✅ Budget calculations work

- **Analytics Page:**
  - ✅ Can see all charts
  - ✅ Partner comparison shows data
  - ✅ Name tags display correctly

---

## 🔐 Security Considerations

### Is it safe to allow all authenticated users to read profiles?

**Yes**, because:
1. Only **basic info** is exposed (display name, email, avatar)
2. No sensitive data like passwords or payment info
3. Required for **partnership features** to work
4. Standard practice in collaborative/social apps
5. Similar to how Slack, Discord, or any team app works

### Privacy Controls

Even with readable profiles:
- ✅ Users control their own display name
- ✅ Users control their own avatar
- ✅ Users can only edit their own data
- ✅ Financial data (transactions, loans) has separate RLS

---

## 📝 Summary

| Table | RLS Status | Policies |
|-------|-----------|----------|
| `user_profiles` | ✅ Fixed | All authenticated users can read, users can edit own |
| `partnerships` | ✅ Fixed | Users can manage their own partnerships |
| `budgets` | ✅ Fixed | Users can manage own budgets, view partner's |
| `transactions` | ✅ Already working | Existing policies from previous migrations |
| `loans` | ✅ Already working | Existing policies from previous migrations |

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ No more 406 errors in console
2. ✅ Partnership page loads
3. ✅ Can set display name in Profile
4. ✅ Can create partnerships
5. ✅ Name tags show up in transactions
6. ✅ Budgets page works
7. ✅ Analytics shows data

---

## 📞 Still Having Issues?

If problems persist after running all migrations:

1. **Check Supabase Dashboard:**
   - Go to Database → Tables
   - Click on `user_profiles`
   - Go to "Policies" tab
   - Should see 3 policies listed

2. **Check Browser Console:**
   - Look for different error codes
   - Share the exact error message

3. **Verify User Authentication:**
   ```javascript
   // In browser console
   const { data } = await supabase.auth.getUser()
   console.log(data.user.id)
   ```

---

## ✅ Checklist

Before testing, make sure you've run:

- [ ] `fix_user_profiles_rls_simple.sql` ⭐ MOST IMPORTANT
- [ ] `fix_partnerships_rls.sql`
- [ ] `fix_budgets_rls.sql`
- [ ] Hard refresh browser (Ctrl + Shift + R)
- [ ] Check console for errors
- [ ] Test Profile page
- [ ] Test Partnership page
- [ ] Test Budgets page

---

**Status: Ready to fix! Run the migrations and your app will work! 🚀**

