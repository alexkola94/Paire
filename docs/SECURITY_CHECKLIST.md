# 🔒 Security Checklist for Deployment - Paire

## ⚠️ CRITICAL - Before Pushing to GitHub

### 1. Protect Sensitive Files

Make sure these files are in `.gitignore`:
- ✅ `appsettings.json` (contains DB credentials)
- ✅ `appsettings.Development.json`
- ✅ `appsettings.Production.json`
- ✅ `.env.production` (contains API URL)
- ✅ `.env` files
- ✅ `*.key`, `*.pem` files

### 2. Check What's Being Committed

Before pushing:
```bash
# See what files will be committed
git status

# Check the diff to ensure no secrets
git diff

# If you see sensitive data, DO NOT COMMIT!
```

### 3. If You Already Committed Secrets

**If you accidentally committed secrets to GitHub:**

1. **Immediately change all compromised credentials:**
   - Database password (Supabase)
   - JWT secret key
   - Email password (Gmail app password)
   - Any API keys

2. **Remove from Git history:**
```bash
# Remove the file from Git but keep it locally
git rm --cached backend/YouAndMeExpensesAPI/appsettings.json

# Commit the removal
git commit -m "Remove appsettings.json from version control"

# Push
git push origin main
```

3. **For complete removal from history (advanced):**
```bash
# Use BFG Repo-Cleaner or git filter-branch
# See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
```

---

## 🔑 Secure Your Credentials

### Database (Supabase)

**Current credentials are EXPOSED in this document!**

1. Go to Supabase Dashboard
2. Change your database password
3. Update the connection string in Render environment variables only

### JWT Secret

**Generate a new strong secret:**

```bash
# PowerShell (Windows)
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

# Bash/Linux/Mac
openssl rand -base64 64
```

Use this new secret in Render environment variables.

### Gmail App Password

Your Gmail app password is visible in `appsettings.json`. Consider:

1. Using a dedicated email account for the app
2. Rotating the app password periodically
3. Using environment variables only (never in code)

---

## 🌐 Production Security Best Practices

### 1. HTTPS Only

- ✅ Render provides free SSL
- ✅ GitHub Pages provides free SSL
- ✅ Set `RequireHttpsMetadata = true` in JWT config for production

Update `Program.cs`:
```csharp
options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
```

### 2. CORS Configuration

Only allow your actual frontend domain:
```
CORS_ORIGINS=https://alexkola94.github.io
```

Never use `*` (allow all) in production!

### 3. Rate Limiting

Consider adding rate limiting middleware:
```bash
dotnet add package AspNetCoreRateLimit
```

### 4. SQL Injection Protection

✅ Entity Framework Core already protects against SQL injection
✅ Always use parameterized queries
✅ Never concatenate user input into SQL strings

### 5. XSS Protection

✅ React automatically escapes output
✅ Never use `dangerouslySetInnerHTML` unless necessary
✅ Sanitize user input on backend

### 6. Authentication Security

Current settings in `Program.cs`:
```csharp
options.Password.RequireDigit = true;
options.Password.RequireLowercase = true;
options.Password.RequireUppercase = false;  // ⚠️ Consider enabling
options.Password.RequireNonAlphanumeric = false;  // ⚠️ Consider enabling
options.Password.RequiredLength = 6;  // ⚠️ Consider increasing to 8+
```

**Recommended production settings:**
```csharp
options.Password.RequireDigit = true;
options.Password.RequireLowercase = true;
options.Password.RequireUppercase = true;  // ✅ Enable
options.Password.RequireNonAlphanumeric = true;  // ✅ Enable
options.Password.RequiredLength = 8;  // ✅ Increase
```

### 7. Email Confirmation

✅ Already enabled: `options.SignIn.RequireConfirmedEmail = true`

Make sure email sending works in production!

---

## 📊 Monitoring & Logging

### 1. Monitor Logs

Regularly check Render logs for:
- Failed login attempts
- 500 errors
- Unauthorized access attempts
- Database errors

### 2. Set Up Alerts

In Render Dashboard:
- Enable email alerts for service downtime
- Monitor CPU/memory usage
- Set up error tracking (e.g., Sentry)

### 3. Database Backups

Supabase:
1. Enable automatic backups
2. Test restore procedures
3. Export backups periodically

---

## 🔄 Regular Security Maintenance

### Weekly
- [ ] Check Render logs for errors
- [ ] Review failed login attempts
- [ ] Monitor API performance

### Monthly
- [ ] Update NuGet packages: `dotnet outdated`
- [ ] Update npm packages: `npm audit`
- [ ] Review and rotate secrets
- [ ] Check database backup integrity

### Quarterly
- [ ] Security audit of code
- [ ] Review user permissions
- [ ] Update dependencies
- [ ] Test disaster recovery

---

## 📋 Content-Security-Policy (CSP) & Headers

The site uses a strict CSP set in `vercel.json` (and `frontend/vercel.json`):

- **script-src:** `'self'` only — no `'unsafe-inline'` to reduce XSS risk. Vite builds external scripts only.
- **style-src:** `'self' 'unsafe-inline'` — kept because the app uses React inline styles (`style={{}}`). Removing it would require moving styles to classes or using nonces.
- **base-uri 'self'; form-action 'self'; object-src 'none'** — added to limit where content and forms can target and to disable plugins.
- **frame-src 'self' https: blob:** — allows receipt/PDF viewers (Income, Expenses, Receipts) to load attachment URLs in iframes when they are https (e.g. Supabase storage) or blob URLs.

If you add third-party scripts (e.g. analytics) that inject inline script, either:
- Host the script on your domain and allow it via `script-src 'self'`, or
- Add the provider’s domain explicitly (e.g. `script-src 'self' https://www.googletagmanager.com`) and avoid inline snippets where possible.

To remove `'unsafe-inline'` from **style-src** later: use only external stylesheets and/or CSS modules, or implement nonce-based inline styles (requires server-side nonce generation).

---

## 🌐 CORS (Access-Control-Allow-Origin)

**“Very lax CORS policy” / `Access-Control-Allow-Origin: *`**

- **Cause:** The API was using `AllowAnyOrigin()` in production when `CORS_ORIGINS` was empty, which sends `Access-Control-Allow-Origin: *` and is only appropriate for public CDNs, not for an API with auth/sensitive data.
- **Fix (backend):** Production **never** uses `AllowAnyOrigin()`. If `CORS_ORIGINS` is not set, the API falls back to `https://thepaire.org` and `https://www.thepaire.org` only.
- **Action:** Set `CORS_ORIGINS` in your API host (e.g. Render) to your real frontend origins, e.g. `https://thepaire.org,https://www.thepaire.org`, so CORS is explicit and credentials work. Redeploy the API after changing it.
- If the scanner was run against the **frontend** (thepaire.org) and it still reports lax CORS, the header may be coming from the host (e.g. Vercel). In that case, restrict CORS in the host config to your domain(s) only, not `*`.

---

## Main and Travel app tending (applied)

- **Backend Permissions-Policy:** `SecureHeadersMiddleware.cs` uses `geolocation=(self)` so it matches the frontend; Travel app geolocation works when the API is involved.
- **Travel app – SerpApi hotels:** `frontend/src/travel/services/discoveryService.js` uses `getBackendUrl()` for the SerpApi hotels proxy (no hardcoded `localhost:5038`), so hotel search works in production.
- **CSP frame-src:** `frame-src 'self' https: blob:;` is set in `vercel.json` / `frontend/vercel.json` so receipt and PDF iframes (Income, Expenses, Receipts) can load https or blob attachment URLs.
- **Optional:** Backend CSP in `SecureHeadersMiddleware` still allows `'unsafe-inline'` / `'unsafe-eval'` for rare cases; the SPA’s CSP comes from Vercel. If Mapbox 404s persist for other styles (`satellite-streets-v12`, `outdoors-v12`), consider switching to Mapbox’s current alternatives in `frontend/src/travel/utils/travelConstants.js`.

---

## 🚨 Incident Response Plan

### If Your Database is Compromised:

1. **Immediately:**
   - Change database password
   - Revoke all JWT tokens (change JWT secret)
   - Lock down database access

2. **Investigate:**
   - Check logs for suspicious activity
   - Identify affected users
   - Determine scope of breach

3. **Notify:**
   - Inform affected users
   - Document the incident
   - Report if required by law

4. **Prevent:**
   - Fix the vulnerability
   - Implement additional security measures
   - Review and update security practices

---

## 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ASP.NET Core Security Best Practices](https://docs.microsoft.com/aspnet/core/security/)
- [React Security Best Practices](https://react.dev/learn/security)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

---

## ✅ Pre-Deployment Security Checklist

Before deploying to production:

- [ ] All secrets moved to environment variables
- [ ] No hardcoded credentials in code
- [ ] `.gitignore` properly configured
- [ ] Strong JWT secret generated
- [ ] Database password changed from default
- [ ] CORS configured for production domain only
- [ ] HTTPS enforced
- [ ] Email confirmation enabled
- [ ] Strong password requirements set
- [ ] Rate limiting considered
- [ ] Error logging configured
- [ ] Database backups enabled
- [ ] Incident response plan documented

---

## 🔐 Environment Variables Template

**Never commit these values!**

Use Render Dashboard → Environment to set:

```
# Database
ConnectionStrings__DefaultConnection=<CHANGE_ME>

# JWT (Generate new secret!)
JwtSettings__Secret=<GENERATE_NEW_64_CHAR_SECRET>
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp

# Email (Use dedicated account)
EmailSettings__SenderEmail=<CHANGE_ME>
EmailSettings__Username=<CHANGE_ME>
EmailSettings__Password=<CHANGE_ME>

# CORS (Your actual domain)
CORS_ORIGINS=https://alexkola94.github.io

# Frontend URL
AppSettings__FrontendUrl=https://alexkola94.github.io/You-me-Expenses
```

---

**Remember: Security is an ongoing process, not a one-time setup!**

