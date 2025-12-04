# 🚀 Complete Entity Framework Setup Guide

## 📋 Overview

We're going to:
1. ✅ Drop all old tables (clean slate)
2. ✅ Run Entity Framework migrations (create fresh schema)
3. ✅ Seed database with test data
4. ✅ Test everything works!

---

## ⚠️ Prerequisites

Make sure you have:
- [ ] Database password from Supabase
- [ ] Updated `appsettings.json` with connection string
- [ ] EF Core tools installed (`dotnet tool install --global dotnet-ef`)

---

## 🗑️ STEP 1: Drop All Old Tables

### In Supabase SQL Editor:

1. Go to https://supabase.com/dashboard/project/sirgeoifiuevsdrjwfwq
2. Click **SQL Editor** → **New query**
3. Copy and paste: `supabase/migrations/DROP_ALL_TABLES.sql`
4. Click **Run**

**Expected output:**
```
All tables dropped successfully!
remaining_tables: 0
```

---

## 🔨 STEP 2: Update appsettings.json

Open `backend/YouAndMeExpensesAPI/appsettings.json` and replace `YOUR_DATABASE_PASSWORD_HERE` with your actual Supabase database password.

**Example:**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.sirgeoifiuevsdrjwfwq;Password=MyActualPassword123;SSL Mode=Require;Trust Server Certificate=true"
  },
  ...
}
```

---

## 🏗️ STEP 3: Create Entity Framework Migration

Open terminal in project root:

```bash
cd backend/YouAndMeExpensesAPI

# Create initial migration
dotnet ef migrations add InitialCreate

# You should see:
# Build succeeded.
# Done. To undo this action, use 'ef migrations remove'
```

This creates a migration file in `Migrations/` folder with all table definitions.

---

## 📊 STEP 4: Apply Migration to Database

```bash
# Apply migration
dotnet ef database update

# You should see:
# Applying migration '20241204_InitialCreate'
# Done.
```

**What this does:**
- ✅ Creates all tables in PostgreSQL
- ✅ Sets up indexes
- ✅ Configures column types
- ✅ NO RLS policies needed!

---

## 🌱 STEP 5: Seed the Database

### In Supabase SQL Editor:

1. Go to **SQL Editor** → **New query**
2. Copy and paste: `supabase/migrations/SEED_DATA_EF.sql`
3. Click **Run**

**Expected output:**
```
✅ SEED DATA INSERTED SUCCESSFULLY!

table_name       | record_count
-----------------+--------------
budgets          | 3
loans            | 2
partnerships     | 1
recurring_bills  | 3
savings_goals    | 2
transactions     | 9
user_profiles    | 2
```

---

## ✅ STEP 6: Verify Everything Works

### Check Tables Created:

In Supabase SQL Editor, run:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- ✅ `budgets`
- ✅ `loans`
- ✅ `loan_payments`
- ✅ `partnerships`
- ✅ `recurring_bills`
- ✅ `savings_goals`
- ✅ `transactions`
- ✅ `user_profiles`
- ✅ `__EFMigrationsHistory` (EF Core tracking table)

### Check Data Inserted:

```sql
-- Check transactions
SELECT 
  u.display_name,
  t.type,
  COUNT(*) as count,
  SUM(t.amount) as total
FROM transactions t
JOIN user_profiles u ON t.user_id = u.id
GROUP BY u.display_name, t.type;
```

Should show:
```
Alex   | expense | 4 | 451.25
Alex   | income  | 1 | 3000.00
Maria  | expense | 3 | 310.30
Maria  | income  | 1 | 2500.00
```

---

## 🚀 STEP 7: Start the Backend

```bash
cd backend/YouAndMeExpensesAPI
dotnet run
```

You should see:
```
info: YouAndMeExpensesAPI[0]
      You & Me Expenses API is starting...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5038
```

---

## 🧪 STEP 8: Test the Frontend

1. Go to http://localhost:3002
2. **Refresh** the page (F5)
3. Try adding an expense:
   - Go to **Expenses** page
   - Click **"Add Expense"**
   - Fill in: Amount: 50, Category: Food, Description: Test
   - Click **Save**
   - **Should work!** ✅ No more 403 error!

4. Check **Analytics** page:
   - Should show real data now!
   - Charts should display with the seed data!

---

## 📊 What's Different Now?

### Before (Supabase SDK + RLS):
```
Frontend → Supabase SDK → PostgreSQL + RLS Policies
❌ RLS policy errors
❌ Type casting issues
❌ Complex permission syntax
```

### After (Entity Framework):
```
Frontend → ASP.NET API → Entity Framework → PostgreSQL
✅ No RLS needed
✅ Type-safe queries
✅ Simple C# code
✅ Complete control
```

---

## 🎯 Database Schema

Entity Framework created these tables with proper types:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **transactions** | Expenses & Income | user_id, amount, type, date |
| **loans** | Loan tracking | user_id, amount, is_settled |
| **loan_payments** | Payment history | loan_id, amount, payment_date |
| **user_profiles** | User info | id, display_name, email |
| **partnerships** | Partner relationships | user1_id, user2_id, status |
| **budgets** | Budget tracking | user_id, category, amount |
| **savings_goals** | Savings targets | user_id, target_amount, current_amount |
| **recurring_bills** | Recurring expenses | user_id, amount, frequency |

All tables have:
- ✅ UUID primary keys
- ✅ Proper indexes for performance
- ✅ Timestamps (created_at, updated_at)
- ✅ Correct data types (decimal for money, etc.)

---

## 🔐 Security Without RLS

Instead of RLS policies, we check permissions in the API:

```csharp
[HttpGet]
public async Task<IActionResult> GetTransactions()
{
    var userId = Request.Headers["X-User-Id"].ToString();
    
    var transactions = await _dbContext.Transactions
        .Where(t => t.UserId == userId)
        .OrderByDescending(t => t.Date)
        .ToListAsync();
    
    return Ok(transactions);
}
```

**Benefits:**
- ✅ Easier to understand and maintain
- ✅ No type casting issues
- ✅ Better error messages
- ✅ More flexible logic

---

## 🔍 Troubleshooting

### Migration Error: "Build failed"
```bash
# Make sure you're in the correct directory
cd backend/YouAndMeExpensesAPI

# Try cleaning and rebuilding
dotnet clean
dotnet build
dotnet ef migrations add InitialCreate
```

### Migration Error: "Cannot connect to database"
- Check password in appsettings.json
- Check Supabase database is running
- Verify connection string format

### Seed Data Error: "Duplicate key value"
- Tables already have data
- Either drop tables again or modify seed script to skip existing data

### Backend Won't Start
```bash
# Check for compilation errors
dotnet build

# Check appsettings.json is valid JSON
# Make sure connection string is correct
```

---

## 📝 Next Steps

After this setup, I can help you:

1. ✅ **Update all services** to use EF Core instead of Supabase SDK
2. ✅ **Remove RLS dependencies** completely
3. ✅ **Add proper validation** and error handling
4. ✅ **Optimize queries** with includes and projections
5. ✅ **Add transaction support** for data consistency

---

## 🎉 Success Checklist

- [ ] All old tables dropped
- [ ] Migration created successfully
- [ ] Migration applied to database
- [ ] Tables visible in Supabase
- [ ] Seed data inserted
- [ ] Backend starts without errors
- [ ] Frontend can add expenses (no 403 error!)
- [ ] Analytics shows real data
- [ ] No more RLS errors!

---

## 💡 Tips

- **Migrations are version controlled** - Commit them to Git
- **Need to change schema?** Create new migration: `dotnet ef migrations add YourMigrationName`
- **Want to rollback?** `dotnet ef database update PreviousMigrationName`
- **See SQL that will run?** `dotnet ef migrations script`

---

**Ready to start? Follow the steps above, and let me know if you hit any issues!** 🚀

