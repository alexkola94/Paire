# Supabase Database Connection Troubleshooting

## Error: "Tenant or user not found" (XX000)

This error occurs when the backend cannot connect to your Supabase PostgreSQL database.

### Common Causes

1. **Supabase Project is Paused** (Most Common)
   - Free tier projects pause after 7 days of inactivity
   - Solution: Resume your project in Supabase dashboard

2. **Incorrect Connection String**
   - Wrong username format
   - Wrong password
   - Wrong port number
   - Wrong host

3. **Database Credentials Changed**
   - Password was reset
   - Project was recreated

---

## Step-by-Step Fix

### Step 1: Check Supabase Project Status

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Check if project shows **"Paused"** status
4. If paused, click **"Restore project"** or **"Resume"**
5. Wait 2-3 minutes for project to fully resume

### Step 2: Get Correct Connection String

1. In Supabase Dashboard → **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **"URI"** tab (not "JDBC" or "Golang")
4. Copy the connection string

**Example format:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

### Step 3: Convert to .NET Format

Convert the PostgreSQL URI to .NET connection string format:

**From:**
```
postgresql://postgres.abcdefghijklmnop:your-password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**To:**
```
Host=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.abcdefghijklmnop;Password=your-password
```

**Important Notes:**
- **Port 5432**: Direct connection (recommended for production)
- **Port 6543**: Connection pooler (alternative, but may have issues)
- **Username format**: Must be `postgres.[PROJECT_REF]` (not just `postgres`)
- **Database**: Always `postgres` for Supabase

### Step 4: Update Render.com Environment Variable

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Go to **Environment** tab
4. Find `ConnectionStrings__DefaultConnection` (or `Database__ConnectionString`)
5. Update with the correct connection string from Step 3
6. Click **Save Changes**
7. Render will automatically redeploy

**Environment Variable Name:**
```
ConnectionStrings__DefaultConnection
```

**Value Format:**
```
Host=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD
```

### Step 5: Verify Connection

After redeployment:

1. Check Render logs for connection errors
2. Try logging in from the frontend
3. Check logs for successful database queries

---

## Alternative: Use Connection Pooler (Port 6543)

If port 5432 doesn't work, try the connection pooler:

```
Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD;Pooling=true;MinPoolSize=0;MaxPoolSize=20
```

**Note:** Connection pooler may have limitations. Direct connection (port 5432) is recommended.

---

## Quick Checklist

- [ ] Supabase project is **active** (not paused)
- [ ] Connection string uses **port 5432** (or 6543 for pooler)
- [ ] Username format is **`postgres.[PROJECT_REF]`**
- [ ] Password is **correct** (copy from Supabase dashboard)
- [ ] Environment variable name is **`ConnectionStrings__DefaultConnection`**
- [ ] Render service has been **redeployed** after changes

---

## Still Having Issues?

### Check Render Logs

Look for these error patterns:

1. **"Tenant or user not found"**
   - → Supabase project is paused or credentials are wrong

2. **"Connection refused"**
   - → Wrong host or port

3. **"Password authentication failed"**
   - → Wrong password

4. **"Database does not exist"**
   - → Wrong database name (should be `postgres`)

### Test Connection Locally

You can test the connection string locally:

1. Create a test file `test-connection.cs`:
```csharp
using Npgsql;

var connectionString = "Host=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD";

try
{
    using var conn = new NpgsqlConnection(connectionString);
    await conn.OpenAsync();
    Console.WriteLine("✅ Connection successful!");
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Connection failed: {ex.Message}");
}
```

2. Run with: `dotnet run`

---

## Reference: Supabase Connection String Format

### Direct Connection (Recommended)
```
Host=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.[PROJECT_REF];Password=[PASSWORD]
```

### Connection Pooler
```
Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.[PROJECT_REF];Password=[PASSWORD];Pooling=true
```

### Where to Find PROJECT_REF
- Supabase Dashboard → Settings → General → Reference ID
- Or in your Supabase URL: `https://[PROJECT_REF].supabase.co`

---

## Related Documentation

- [Production Deployment Plan](./PRODUCTION_DEPLOYMENT_PLAN.md)
- [Backend 500 Error Troubleshooting](./BACKEND_500_ERROR_TROUBLESHOOTING.md)

