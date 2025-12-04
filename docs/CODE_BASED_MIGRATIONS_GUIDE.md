# Alternative: Code-Based Migrations with Entity Framework

## ⚠️ Warning

Switching to Entity Framework migrations would require significant refactoring and you'd lose some Supabase-specific features.

## Why This Is NOT Recommended

1. **Lose Supabase Integration**: Direct Postgrest client is optimized for Supabase
2. **Lose RLS**: Entity Framework doesn't understand Row Level Security
3. **Lose Real-time**: Supabase real-time subscriptions won't work
4. **More Complex**: Need to maintain DbContext + Supabase client

## If You Still Want To Try

### Step 1: Install Entity Framework

```bash
cd backend/YouAndMeExpensesAPI
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.EntityFrameworkCore.Tools
```

### Step 2: Create DbContext

```csharp
// Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Models;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<Loan> Loans { get; set; }
    public DbSet<Budget> Budgets { get; set; }
    public DbSet<SavingsGoal> SavingsGoals { get; set; }
    public DbSet<RecurringBill> RecurringBills { get; set; }
    public DbSet<ReminderPreferences> ReminderPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure models
        modelBuilder.Entity<Transaction>().ToTable("transactions");
        modelBuilder.Entity<Loan>().ToTable("loans");
        modelBuilder.Entity<Budget>().ToTable("budgets");
        // ... etc
        
        // But you CAN'T configure RLS policies here!
    }
}
```

### Step 3: Register in Program.cs

```csharp
// Add this INSTEAD of Supabase client
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Supabase"))
);
```

### Step 4: Create Migrations

```bash
# Create migration
dotnet ef migrations add InitialCreate

# Apply migration
dotnet ef database update
```

### Step 5: Update Services

Change from:
```csharp
var result = await supabaseClient.From<Transaction>().Get();
```

To:
```csharp
var result = await dbContext.Transactions.ToListAsync();
```

### Problems You'll Face

1. **No RLS**: You lose Row Level Security - must implement in code
2. **No Auth Integration**: `auth.uid()` doesn't work
3. **Manual Filtering**: Must manually filter by user_id everywhere
4. **No Real-time**: Lose Supabase real-time subscriptions
5. **No Storage Integration**: Supabase Storage API won't work with EF

---

## Why SQL Migrations Are Better For Supabase

### ✅ Advantages

1. **Native Supabase support**
2. **Full PostgreSQL feature support**
3. **Row Level Security built-in**
4. **Works with Supabase Dashboard**
5. **Supabase Auth integration**
6. **Real-time capabilities**
7. **Simpler architecture**

### ✅ Workflow

```bash
# 1. Create migration file
supabase migration new feature_name

# 2. Write SQL
# Edit: supabase/migrations/TIMESTAMP_feature_name.sql

# 3. Apply locally
supabase migration up

# 4. Test locally
# Run your app and test

# 5. Commit to Git
git add supabase/migrations/
git commit -m "Add feature migration"

# 6. Deploy to production
# Supabase automatically applies migrations when you push
```

---

## Best Practice: Keep SQL Migrations

**Recommendation**: Stick with SQL migrations for this Supabase project.

If you want code-based migrations, consider:
- **FluentMigrator**: SQL-like migrations in C#
- **DbUp**: SQL scripts with C# control
- **Evolve**: Simple migration tool

But for Supabase, SQL migrations are the standard and recommended approach.

---

## TL;DR

**Use SQL migrations because:**
1. You're using Supabase (database-first platform)
2. Not using Entity Framework
3. Need Row Level Security
4. Want full PostgreSQL features
5. Industry standard for Supabase projects

**Only use code-based if:**
- You switch to Entity Framework entirely
- You don't need Supabase-specific features
- You're willing to lose RLS and real-time

