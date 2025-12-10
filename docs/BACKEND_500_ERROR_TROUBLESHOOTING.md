# 🔧 Backend 500 Error Troubleshooting Guide

## Issue: 500 Internal Server Error on Login

**Status:** Request reaches backend but server throws an error.

---

## 🔍 Step 1: Check Render.com Logs

1. Go to [Render.com Dashboard](https://dashboard.render.com)
2. Select your web service (`paire-api`)
3. Click **"Logs"** tab
4. Look for error messages around the time of the login attempt
5. Common errors you might see:
   - Database connection errors
   - Missing configuration
   - JWT secret errors
   - Migration errors

---

## ✅ Step 2: Verify Environment Variables

Go to Render.com → Your Service → **Environment** tab and verify these are set:

### Required Variables:

```bash
# Core
ASPNETCORE_ENVIRONMENT=Production

# Database (CRITICAL - most common cause of 500 errors)
ConnectionStrings__DefaultConnection=User Id=postgres.xxxxx;Password=YOUR_PASSWORD;Server=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres

# JWT (CRITICAL - required for authentication)
JwtSettings__Secret=YOUR_64_CHARACTER_SECRET_KEY_HERE
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7

# CORS
CORS_ORIGINS=https://alexkola94.github.io

# Frontend URL
AppSettings__FrontendUrl=https://alexkola94.github.io/Paire
```

### Common Issues:

1. **Missing JWT Secret:**
   - Error: "JWT Secret is missing"
   - Fix: Generate and set `JwtSettings__Secret`

2. **Database Connection Failed:**
   - Error: "Connection refused" or "Timeout"
   - Fix: Verify connection string and password

3. **Database Not Migrated:**
   - Error: "relation does not exist" or "table not found"
   - Fix: Run database migrations (see Step 3)

---

## 🗄️ Step 3: Check Database Migrations

The backend needs database tables to exist. Check if migrations have been run:

### Option A: Check via Supabase Dashboard

1. Go to Supabase Dashboard → Your Project
2. Go to **Table Editor**
3. Check if these tables exist:
   - `AspNetUsers` (or `ApplicationUsers`)
   - `AspNetRoles`
   - `transactions`
   - `loans`
   - etc.

### Option B: Run Migrations Manually

If tables don't exist, you need to run migrations. However, on Render.com, this is tricky. Options:

1. **Run migrations locally and push schema:**
   ```bash
   cd backend/YouAndMeExpensesAPI
   dotnet ef database update
   ```

2. **Or use Supabase SQL Editor:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the schema SQL from `supabase/schema.sql`

---

## 🔐 Step 4: Verify Database Connection

1. **Test connection string:**
   - Copy your connection string from Render
   - Test it in a PostgreSQL client (pgAdmin, DBeaver, etc.)
   - Verify you can connect

2. **Check Supabase project status:**
   - Make sure your Supabase project is not paused
   - Free tier projects pause after inactivity

---

## 🧪 Step 5: Test Backend Health Endpoint

Test if the backend is running at all:

```bash
curl https://paire-api.onrender.com/health
```

**Expected response:**
```json
{
  "status": "healthy",
  ...
}
```

If this fails, the backend isn't running properly.

---

## 📋 Step 6: Common Error Patterns

### Error: "JWT Secret is missing"
**Fix:** Set `JwtSettings__Secret` in Render environment variables

### Error: "Connection refused" or "Timeout"
**Fix:** 
- Verify database connection string
- Check Supabase project is not paused
- Verify password is correct

### Error: "relation does not exist" or "table not found"
**Fix:** Run database migrations (see Step 3)

### Error: "InvalidOperationException" in Program.cs
**Fix:** Check which configuration is missing from error message

### Error: "UserManager" or "SignInManager" issues
**Fix:** Verify Identity configuration in Program.cs (usually means database issue)

---

## 🚀 Step 7: Quick Fixes

### Fix 1: Restart Backend Service
1. Render Dashboard → Your Service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for redeployment

### Fix 2: Verify All Environment Variables
1. Go through the checklist above
2. Make sure ALL required variables are set
3. No typos in variable names

### Fix 3: Check Database
1. Verify Supabase project is active
2. Test connection string
3. Check if tables exist

---

## 📞 Next Steps

1. **Check Render logs first** - this will tell you exactly what's wrong
2. **Verify environment variables** - most common issue
3. **Test database connection** - second most common issue
4. **Check if migrations ran** - if tables don't exist

---

## 🔗 Related Documentation

- [PRODUCTION_DEPLOYMENT_PLAN.md](./PRODUCTION_DEPLOYMENT_PLAN.md) - Full deployment guide
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database setup
- [SETUP_ENTITY_FRAMEWORK.md](./SETUP_ENTITY_FRAMEWORK.md) - Migration guide

---

**Last Updated:** December 2025

