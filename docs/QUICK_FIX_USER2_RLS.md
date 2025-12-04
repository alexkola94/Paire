# 🔧 Quick Fix: Dashboard Showing $0.00 for User 2

## Your Details
- **User ID**: `c609b5ea-1d2b-4574-928e-bcaf4e0b20db`
- **Email**: `alexisdaywalker1994@gmail.com`
- **User**: "Partner" (User 2 from seed data)

## Problem Identified
✅ Seed data was run  
✅ Your user ID matches User 2  
✅ Transactions exist in database  
❌ **Row Level Security (RLS) policies are blocking access**

## Solution: Fix RLS Policies

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**

### Step 2: Run the Fix SQL

Copy and paste the **entire contents** of `supabase/fix_rls_for_user2.sql` and click **"Run"**

This will:
1. ✅ Check if your transactions exist (they should!)
2. ✅ Show your December 2024 summary
3. ✅ Update RLS policies to allow you to see your own data
4. ✅ Allow you to see partner's data (if partnership is active)
5. ✅ Verify the fix worked

### Step 3: Refresh Your Dashboard

1. Go back to your app: `http://localhost:3000`
2. Hard refresh: **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
3. The dashboard should now show your data! 🎉

## Expected Results After Fix

Based on your seed data, you should see:

### December 2024 Summary:
- **Total Income**: $4,200.00
  - Salary: $3,800.00
  - Freelance: $350.00
  - Other: $50.00

- **Total Expenses**: $546.25
  - Groceries: $125.25
  - Healthcare: $40.00
  - Entertainment: $55.00
  - Dining: $75.00
  - Shopping: $200.00
  - Transport: $50.00

- **Balance**: $3,653.75 ✨

## Alternative: Quick Test in Browser Console

Before running the SQL, test in browser console (F12):

```javascript
// Check if transactions exist (bypass RLS)
// Go to Supabase Dashboard -> Database -> transactions table
// You should see 7 expenses + 3 income = 10 transactions for your user
```

## If Still Not Working

### Option A: Check Supabase Dashboard Directly
1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Select "transactions" table
4. Filter by your user_id: `c609b5ea-1d2b-4574-928e-bcaf4e0b20db`
5. You should see 10 rows

### Option B: Temporarily Disable RLS (Testing Only)
```sql
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
```
**⚠️ WARNING**: Only do this for local testing! Re-enable after:
```sql
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

### Option C: Check auth.uid()
In browser console:
```javascript
const { data: { user } } = await supabase.auth.getUser()
console.log('Logged in as:', user.id)
console.log('Should match:', 'c609b5ea-1d2b-4574-928e-bcaf4e0b20db')
```

## Summary

```
✅ Your User ID: c609b5ea-1d2b-4574-928e-bcaf4e0b20db
✅ Seed data includes 10 transactions for you
✅ Expected total: $4,200 income - $546.25 expenses = $3,653.75 balance
❌ RLS policies preventing access → Run fix_rls_for_user2.sql
```

**After running the SQL fix, refresh your dashboard and it should work!** 🚀

---

## Need More Help?

If it's still showing $0.00 after running the fix:
1. Share the output from the SQL query
2. Check browser console for errors
3. Verify you're logged in as the correct user

