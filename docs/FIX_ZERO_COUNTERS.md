# 🔧 Fix: Financial Overview Showing $0.00

## Problem
The Dashboard shows `$0.00` for Total Income, Total Expenses, and Balance because:
1. ❌ **Supabase database is not set up** (tables don't exist)
2. ❌ **No transactions in the database**

## Solution: Set Up Your Supabase Database

### Step 1: Go to Supabase SQL Editor

1. Open https://supabase.com/dashboard
2. Select your project (`sirgeoifiuevsdrjwfwq`)
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run the Complete Setup SQL

Copy and paste the entire contents of **`supabase/SUPABASE_COMPLETE_SETUP.sql`** into the SQL editor and click **"Run"**.

This will create:
- ✅ All database tables (`transactions`, `loans`, `budgets`, etc.)
- ✅ Row Level Security (RLS) policies
- ✅ Storage bucket for receipts
- ✅ Indexes for performance
- ✅ Triggers and functions

### Step 3: Add Test Data (Optional but Recommended)

After running the setup, add some sample transactions:

Copy and paste **`supabase/seed_test_data.sql`** into the SQL editor and click **"Run"**.

**Important:** Update the user IDs in the seed file to match your actual user ID!

To get your user ID:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: 
   ```javascript
   supabase.auth.getUser().then(({data}) => console.log(data.user.id))
   ```
4. Copy your user ID
5. Replace `10f690b8-b8e9-423d-814e-ef6758d5104a` in `seed_test_data.sql` with your ID

### Step 4: Refresh Your Dashboard

After running the migrations:
1. Go back to your app: `http://localhost:3000`
2. Refresh the page (Ctrl+R or F5)
3. The counters should now show data! 🎉

## Alternative: Add Transactions Manually

Instead of seed data, you can add transactions through the UI:

1. **Add Income**:
   - Go to "Income" page
   - Click "+ Add Income"
   - Fill in: Amount, Description, Date, Category
   - Click "Save"

2. **Add Expenses**:
   - Go to "Expenses" page
   - Click "+ Add Expense"
   - Fill in: Amount, Description, Date, Category
   - Click "Save"

3. **Check Dashboard**:
   - Go back to Dashboard
   - The counters should now reflect your transactions!

## Quick Test: Check if Database is Set Up

Open your browser console (F12) and run:

```javascript
// Check if transactions table exists
const { data, error } = await supabase.from('transactions').select('count')
console.log('Transactions table:', data, error)

// Check if user_profiles table exists
const { data: profiles, error: profError } = await supabase.from('user_profiles').select('count')
console.log('User profiles table:', profiles, profError)
```

**If you get errors** → Run the migration SQL files first!
**If you get empty arrays** → Add transactions!

## Summary

```
✅ Step 1: Run supabase/SUPABASE_COMPLETE_SETUP.sql in Supabase SQL Editor
✅ Step 2: (Optional) Run supabase/seed_test_data.sql for test data
✅ Step 3: Refresh your dashboard → Counters should work!
```

## Need Help?

- Check the Supabase dashboard → Database → Tables
- Verify `transactions` table exists
- Verify Row Level Security (RLS) is enabled
- Check browser console for any errors

---

**Your data will appear once you set up the database!** 🚀

