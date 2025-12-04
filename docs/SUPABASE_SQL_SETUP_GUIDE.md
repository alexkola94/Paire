# 🚀 Supabase SQL Setup Guide

## You Don't Have a Database Yet? Follow These Steps:

### Step 1: Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Sign in to your account
3. Click on your project: **sirgeoifiuevsdrjwfwq** (or create a new project if needed)

### Step 2: Open SQL Editor

1. In the left sidebar, click **"SQL Editor"** (icon looks like `</>`)
2. Click **"New Query"** button (top right)

### Step 3: Copy & Paste the SQL

1. Open the file: **`SUPABASE_COMPLETE_SETUP.sql`** (I just created it)
2. **Select ALL the content** (Ctrl+A)
3. **Copy it** (Ctrl+C)
4. Go back to Supabase SQL Editor
5. **Paste it** into the query editor (Ctrl+V)

### Step 4: Run the SQL

1. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Return)
2. Wait for it to complete (should take 5-10 seconds)
3. You should see: "Success. No rows returned" or "Setup Complete!"

### Step 5: Verify Everything Was Created

After running the SQL, you can verify by:

**Option A - Check in Table Editor:**
1. Click **"Table Editor"** in left sidebar
2. You should see these tables:
   - ✅ transactions
   - ✅ loans
   - ✅ budgets
   - ✅ savings_goals
   - ✅ recurring_bills
   - ✅ shopping_lists
   - ✅ shopping_list_items
   - ✅ loan_payments
   - ✅ reminder_preferences

**Option B - Run verification query:**
```sql
SELECT 
    table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Step 6: Check Storage Bucket (Optional)

1. Click **"Storage"** in left sidebar
2. You should see a bucket named **"receipts"**
3. If not, create it manually:
   - Click "Create a new bucket"
   - Name: `receipts`
   - Public: No (leave unchecked)
   - Click "Create bucket"

---

## What Did This Create?

### 📊 Tables Created (9 tables):
1. **transactions** - Expenses & Income
2. **loans** - Money lending/borrowing
3. **budgets** - Monthly/yearly budgets
4. **savings_goals** - Savings targets
5. **recurring_bills** - Subscription tracking
6. **shopping_lists** - Shopping list management
7. **shopping_list_items** - Items in lists
8. **loan_payments** - Payment tracking
9. **reminder_preferences** - Email notification settings

### 🔒 Security (RLS Policies):
- ✅ Users can only see their own data
- ✅ Users can only create data for themselves
- ✅ Users can only update their own data
- ✅ Users can only delete their own data

### 📈 Performance (Indexes):
- ✅ Fast queries by user_id
- ✅ Fast date-based searches
- ✅ Optimized category lookups

### 📊 Views (Helper Queries):
- ✅ `upcoming_bills` - Bills due soon
- ✅ `budget_status` - Budget usage percentage
- ✅ `savings_progress` - Savings goal progress

### 🗂️ Storage:
- ✅ `receipts` bucket - For storing receipt images
- ✅ RLS policies for secure file access

---

## Troubleshooting

### ❌ Error: "relation already exists"
**Solution:** Some tables already exist. This is OK! The SQL uses `IF NOT EXISTS` so it won't break anything.

### ❌ Error: "permission denied for schema auth"
**Solution:** Make sure you're running this in the **SQL Editor**, not in a local database. The `auth.users` table only exists in Supabase.

### ❌ Error: "syntax error near..."
**Solution:** Make sure you copied the **entire SQL file**. It should start with comments and end with a SELECT statement.

### ❌ Storage bucket not created
**Solution:** Create manually in Supabase Dashboard:
1. Go to Storage
2. Click "New bucket"
3. Name: `receipts`
4. Public: No
5. Create

---

## Next Steps After Setup

### 1. Test Your API Connection

```bash
cd backend/YouAndMeExpensesAPI
dotnet run
```

Open: http://localhost:5000/health

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-04T...",
  "version": "1.0.0",
  "services": {
    "supabase": "connected",
    "email": "configured",
    "reminders": "active"
  }
}
```

### 2. Configure Gmail SMTP

Follow: [`GMAIL_SETUP.md`](GMAIL_SETUP.md)

### 3. Start Using the App!

Your database is ready! Now you can:
- ✅ Create transactions
- ✅ Track loans
- ✅ Set budgets
- ✅ Create savings goals
- ✅ Get email reminders

---

## Alternative: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Login
supabase login

# Link to your project
supabase link --project-ref sirgeoifiuevsdrjwfwq

# Run migrations
supabase db push

# Or apply specific migrations
cd supabase
supabase migration up
```

But for first-time setup, **using the SQL Editor is easier**!

---

## Need Help?

1. **Supabase Docs**: https://supabase.com/docs/guides/database
2. **SQL Editor Guide**: https://supabase.com/docs/guides/database/overview#the-sql-editor
3. **Check our docs**:
   - [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)
   - [`QUICK_START_REMINDERS.md`](QUICK_START_REMINDERS.md)

---

## Summary

✅ **What to run**: `SUPABASE_COMPLETE_SETUP.sql`  
✅ **Where to run it**: Supabase Dashboard → SQL Editor  
✅ **How long**: 5-10 seconds  
✅ **Result**: 9 tables + storage + security policies  

That's it! Your database is ready to use! 🎉

