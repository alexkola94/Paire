# 🚀 Setting Up Entity Framework Core with PostgreSQL (Supabase)

## ✅ Benefits Over Supabase SDK

- ✅ **No more RLS policy headaches!**
- ✅ Complete control over database operations
- ✅ Type-safe queries with LINQ
- ✅ Automatic migrations
- ✅ Better performance and caching
- ✅ Still use Supabase for Auth & Storage
- ✅ Use your own PostgreSQL database (hosted on Supabase)

---

## 📦 Step 1: Get PostgreSQL Connection String from Supabase

### A. Go to Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection String**
5. Select **URI** format
6. Copy the connection string

It will look like:
```
postgresql://postgres.sirgeoifiuevsdrjwfwq:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

### B. Update Your Connection String

Replace `[YOUR-PASSWORD]` with your actual database password.

**Don't know your password?** 
- Go to **Settings** → **Database** → **Reset Database Password**

---

## 📝 Step 2: Update appsettings.json

Add the connection string to `backend/YouAndMeExpensesAPI/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.sirgeoifiuevsdrjwfwq;Password=YOUR_PASSWORD_HERE;SSL Mode=Require;Trust Server Certificate=true"
  },
  "Supabase": {
    "Url": "https://sirgeoifiuevsdrjwfwq.supabase.co",
    "AnonKey": "your-anon-key"
  },
  ...
}
```

**Note:** Replace `YOUR_PASSWORD_HERE` with your actual Supabase database password!

---

## 🔨 Step 3: Create Initial Migration

Run these commands:

```bash
cd backend/YouAndMeExpensesAPI

# Create initial migration
dotnet ef migrations add InitialCreate

# Apply migration to database
dotnet ef database update
```

This will:
- ✅ Create all tables with proper schema
- ✅ Set up indexes
- ✅ Configure relationships
- ✅ **No RLS needed!** (We handle permissions in API)

---

## 🎯 Step 4: How This Works

### Architecture:

```
Frontend (React)
    ↓
Backend API (ASP.NET Core)
    ↓
Entity Framework Core
    ↓
PostgreSQL (hosted on Supabase)
```

### What Changed:

| Before | After |
|--------|-------|
| Supabase SDK everywhere | EF Core for database |
| RLS policies required | API-level permissions |
| Complex policy syntax | Simple C# code |
| Type mismatches | Strong typing |
| Manual joins | Automatic includes |

### What Stays:

- ✅ Supabase Auth (still works!)
- ✅ Supabase Storage (for files)
- ✅ Same PostgreSQL database
- ✅ Same frontend code

---

## 💻 Step 5: Using Entity Framework in Code

### Before (Supabase SDK):
```csharp
var transactions = await _supabaseClient
    .From<Transaction>()
    .Where(t => t.UserId == userId)
    .Get();
```

### After (Entity Framework):
```csharp
var transactions = await _dbContext.Transactions
    .Where(t => t.UserId == userId)
    .ToListAsync();
```

Much cleaner and type-safe! ✅

---

## 🔐 Security: API-Level Permissions

Instead of RLS, we check permissions in the API:

```csharp
[HttpPost]
public async Task<IActionResult> CreateTransaction(Transaction transaction)
{
    // Get user ID from auth header
    var userId = Request.Headers["X-User-Id"].ToString();
    
    // Ensure user can only create their own transactions
    if (transaction.UserId != userId)
    {
        return Forbid();
    }
    
    _dbContext.Transactions.Add(transaction);
    await _dbContext.SaveChangesAsync();
    
    return Ok(transaction);
}
```

**Benefits:**
- ✅ Easier to understand
- ✅ Easier to test
- ✅ More flexible
- ✅ No type casting issues!

---

## 📊 Database Tables Created

Entity Framework will create these tables:

1. **transactions** - Expenses & Income
2. **loans** - Loan management
3. **loan_payments** - Payment history
4. **user_profiles** - User information
5. **partnerships** - Partner relationships
6. **budgets** - Budget tracking
7. **savings_goals** - Savings targets
8. **recurring_bills** - Recurring expenses

All with:
- ✅ Proper indexes
- ✅ Foreign keys
- ✅ Default values
- ✅ Timestamps

---

## 🚀 Next Steps

After setup, I'll help you:

1. ✅ **Migrate existing services** to use EF Core
2. ✅ **Update controllers** to use DbContext
3. ✅ **Remove RLS dependencies** completely
4. ✅ **Add proper validation** and error handling
5. ✅ **Test everything** end-to-end

---

## 🎯 Quick Start Checklist

- [ ] Get PostgreSQL connection string from Supabase
- [ ] Update `appsettings.json` with connection string
- [ ] Run `dotnet ef migrations add InitialCreate`
- [ ] Run `dotnet ef database update`
- [ ] Verify tables created in Supabase SQL Editor
- [ ] Ready to migrate services!

---

## 📞 Troubleshooting

### Connection Error?
- Check password is correct
- Check SSL Mode is set to `Require`
- Check host/port/database name

### Migration Error?
- Make sure EF Core tools are installed:
  ```bash
  dotnet tool install --global dotnet-ef
  ```

### Tables Not Created?
- Check `dotnet ef database update` output for errors
- Verify connection string in appsettings.json
- Check Supabase database is accessible

---

**Ready to proceed?** Let me know when you've added the connection string, and I'll help you run the migrations!

