# 🚀 Supabase Setup Guide with Migrations

Complete guide for setting up Supabase with proper migrations and configuration.

---

## 📋 **Prerequisites**

### 1. Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using Scoop
scoop install supabase

# Or using npm
npm install -g supabase
```

**Mac/Linux:**
```bash
# Using Homebrew
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

**Verify installation:**
```bash
supabase --version
```

### 2. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new organization (if needed)

---

## 🎯 **Method 1: Setup New Project with Migrations**

### Step 1: Initialize Supabase Locally

```bash
# Navigate to project root
cd You-me-Expenses

# Initialize Supabase (already done - config exists)
# supabase init  # Skip this - we already have supabase/ folder

# Login to Supabase
supabase login
```

This will open a browser for authentication.

### Step 2: Link to Existing Project OR Create New

**Option A: Create New Project**
```bash
# Create new project via CLI
supabase projects create you-me-expenses

# Link to the new project
supabase link --project-ref YOUR_PROJECT_REF
```

**Option B: Link to Existing Project**
```bash
# Get your project ref from Supabase dashboard
# Settings > General > Reference ID

# Link to existing project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Push Migrations to Supabase

```bash
# Push all migrations to your Supabase project
supabase db push

# This will:
# ✅ Create transactions table
# ✅ Create loans table  
# ✅ Set up RLS policies
# ✅ Create indexes
# ✅ Set up triggers
# ✅ Create views
```

### Step 4: Create Storage Bucket

```bash
# Create receipts bucket
supabase storage create receipts --public

# Apply storage policies
supabase db push supabase/migrations/20241204_storage_policies.sql
```

### Step 5: Get Your Credentials

```bash
# Get project details
supabase projects list

# Get API keys
supabase projects api-keys
```

Or get them from dashboard:
1. Go to **Settings** > **API**
2. Copy **Project URL** and **anon public key**

---

## 🎯 **Method 2: Setup via Supabase Dashboard**

If you prefer using the web interface:

### Step 1: Create Project

1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Fill in:
   - **Name:** you-me-expenses
   - **Database Password:** (save this!)
   - **Region:** closest to you
4. Wait 2-3 minutes for setup

### Step 2: Run Migration SQL

1. Go to **SQL Editor** in dashboard
2. Click **New Query**
3. Open `supabase/migrations/20241204_initial_schema.sql`
4. Copy and paste the entire content
5. Click **Run** (or Ctrl/Cmd + Enter)
6. Wait for "Success" message

### Step 3: Create Storage Bucket

1. Go to **Storage** in sidebar
2. Click **New Bucket**
3. Name: `receipts`
4. Toggle **Public bucket** to ON
5. Click **Create bucket**

### Step 4: Apply Storage Policies

1. Go back to **SQL Editor**
2. Open `supabase/migrations/20241204_storage_policies.sql`
3. Copy and paste content
4. Click **Run**

### Step 5: Get Your Credentials

1. Go to **Settings** > **API**
2. Copy:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJ...`

---

## 🔧 **Configuration**

### 1. Update Frontend Environment

Create `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
```

**Important:**
- Replace with YOUR actual values
- No quotes needed
- No spaces around `=`
- Keep this file secure (already in .gitignore)

### 2. Update Backend Configuration (Optional)

Edit `backend/appsettings.Development.json`:

```json
{
  "Supabase": {
    "Url": "https://your-project-id.supabase.co",
    "Key": "your_service_role_key_here",
    "JwtSecret": "your_jwt_secret_here"
  }
}
```

**Note:** Service role key has admin access - keep it secret!

### 3. Update Supabase Config

Edit `supabase/config.toml`:

```toml
[project]
name = "you-me-expenses"
project_id = "your-project-ref"

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://yourusername.github.io/you-me-expenses/"]
```

---

## ✅ **Verify Setup**

### 1. Check Database Tables

```bash
# Via CLI
supabase db list

# Or in dashboard: Database > Tables
# Should see: transactions, loans
```

### 2. Check RLS Policies

```bash
# In dashboard: Authentication > Policies
# Should see 8 policies total (4 for each table)
```

### 3. Check Storage Bucket

```bash
# Via CLI
supabase storage list

# Or in dashboard: Storage
# Should see: receipts bucket (public)
```

### 4. Test Connection

```bash
cd frontend
npm run dev

# Try:
# 1. Sign up
# 2. Add expense
# 3. Upload receipt
```

---

## 📦 **Migration Management**

### View Migration Status

```bash
# See which migrations have been applied
supabase db diff

# View migration history
supabase migration list
```

### Create New Migration

```bash
# Generate a new migration file
supabase migration new add_budget_table

# This creates: supabase/migrations/20241204_add_budget_table.sql
# Edit the file and add your SQL
# Then push: supabase db push
```

### Rollback Migration

```bash
# Rollback last migration
supabase db reset

# Warning: This deletes ALL data!
# Only use in development
```

### Reset Database

```bash
# Reset to clean state and re-apply all migrations
supabase db reset

# Warning: Deletes all data!
```

---

## 🔄 **Local Development**

### Start Local Supabase Instance

```bash
# Start local Supabase (Docker required)
supabase start

# This starts:
# - PostgreSQL database
# - Supabase Studio (dashboard)
# - Authentication server
# - Storage server

# Access at:
# Studio: http://localhost:54323
# API: http://localhost:54321
```

### Stop Local Instance

```bash
supabase stop
```

### Use Local Instance for Development

Update `frontend/.env`:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key
```

Get local keys:
```bash
supabase status
```

---

## 📊 **Database Backup**

### Manual Backup via CLI

```bash
# Backup database
supabase db dump -f backup.sql

# Restore from backup
supabase db reset
psql -f backup.sql
```

### Backup via Dashboard

1. Go to **Database** > **Backups**
2. Click **Create backup**
3. Download when ready

---

## 🔐 **Security Best Practices**

### 1. Never Commit Secrets

```bash
# Make sure these are in .gitignore:
.env
.env.local
.env.production
appsettings.Development.json
supabase/.env
```

### 2. Use Service Role Key Carefully

- **anon key:** Frontend (public, limited access)
- **service_role key:** Backend only (full access, NEVER expose!)

### 3. Test RLS Policies

```sql
-- Test as user (in SQL Editor)
SET request.jwt.claims.sub = 'user-uuid-here';

SELECT * FROM transactions;  -- Should only see own data
```

### 4. Monitor Access

1. Go to **Logs** in dashboard
2. Review API logs
3. Check for unusual patterns

---

## 🐛 **Troubleshooting**

### Issue: "Migration already exists"

```bash
# Skip existing migration
supabase db push --force
```

### Issue: "Cannot connect to project"

```bash
# Relink project
supabase link --project-ref YOUR_REF

# Check status
supabase projects list
```

### Issue: "RLS blocking queries"

```sql
-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'transactions';

-- Temporarily disable RLS (development only!)
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Re-enable when fixed
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

### Issue: "Storage upload fails"

```bash
# Check bucket exists
supabase storage list

# Recreate bucket
supabase storage create receipts --public

# Reapply policies
supabase db push supabase/migrations/20241204_storage_policies.sql
```

---

## 📚 **Migration Files Explained**

### `20241204_initial_schema.sql`
- Creates transactions and loans tables
- Sets up RLS policies
- Creates indexes for performance
- Adds triggers for updated_at
- Creates helpful views

### `20241204_storage_policies.sql`
- Sets up storage bucket policies
- Configures file upload permissions
- Adds auto-delete on transaction removal
- Helper functions for file URLs

---

## 🚀 **Quick Reference Commands**

```bash
# Setup
supabase login
supabase link --project-ref YOUR_REF
supabase db push

# Development
supabase start          # Start local
supabase stop           # Stop local
supabase status         # Check status

# Migrations
supabase migration new name
supabase migration list
supabase db diff
supabase db reset

# Storage
supabase storage create bucket-name
supabase storage list

# Projects
supabase projects list
supabase projects create name
```

---

## ✨ **Next Steps**

After setup:

1. **Run the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Test all features:**
   - Sign up
   - Add expense
   - Add income
   - Create loan
   - Upload receipt

3. **Deploy:**
   - See `DEPLOYMENT.md`
   - Configure GitHub Actions
   - Push to GitHub Pages

---

## 📖 **Additional Resources**

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Database Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

**Setup complete! Your database is now version-controlled with migrations.** 🎉

