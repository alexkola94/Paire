# 🔧 Environment Variables Template - Paire

This document provides templates for all environment variables needed for deployment.

---

## Frontend Environment Variables

### File: `frontend/.env.production`

**⚠️ This file is gitignored - create it locally**

```env
# Backend API URL from Render.com
# Replace with your actual Render deployment URL
VITE_BACKEND_API_URL=https://paire-api.onrender.com
```

**How to get this value:**
1. Deploy backend to Render.com first
2. Copy the URL from Render dashboard (e.g., `https://paire-api.onrender.com`)
3. Paste it here
4. Redeploy frontend

---

## Backend Environment Variables (Render.com)

### Configure in: Render Dashboard → Your Service → Environment

#### Core Settings

```bash
# Environment
ASPNETCORE_ENVIRONMENT=Production
```

#### Database Configuration

```bash
# PostgreSQL Connection String (from Supabase)
# Format: User Id=USER;Password=PASSWORD;Server=SERVER;Port=5432;Database=postgres
ConnectionStrings__DefaultConnection=User Id=postgres.xxxxx;Password=YOUR_PASSWORD;Server=aws-0-region.pooler.supabase.com;Port=5432;Database=postgres
```

**How to get this:**
1. Go to Supabase Dashboard
2. Project Settings → Database
3. Copy connection string
4. **IMPORTANT:** Change the password to a new secure password first!

#### JWT Settings

```bash
# JWT Secret Key - Generate a new one!
# NEVER use the example secret in production
JwtSettings__Secret=YOUR_SECURE_64_CHARACTER_SECRET_KEY_HERE

# JWT Configuration
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7
```

**Generate JWT Secret:**

PowerShell (Windows):
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
```

Bash/Linux/Mac:
```bash
openssl rand -base64 64
```

Online: https://generate-secret.vercel.app/64

#### Email Settings (Gmail)

```bash
# SMTP Configuration
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__EnableSsl=true

# Your Email Account
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__SenderName=Paire
EmailSettings__Username=your-email@gmail.com

# Gmail App Password (NOT your regular Gmail password)
EmailSettings__Password=xxxx xxxx xxxx xxxx
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to "App Passwords"
4. Generate new app password for "Mail"
5. Copy the 16-character password
6. Use it here (with or without spaces)

**Alternative Email Providers:**

**SendGrid:**
```bash
EmailSettings__SmtpServer=smtp.sendgrid.net
EmailSettings__SmtpPort=587
EmailSettings__Username=apikey
EmailSettings__Password=YOUR_SENDGRID_API_KEY
```

**Mailgun:**
```bash
EmailSettings__SmtpServer=smtp.mailgun.org
EmailSettings__SmtpPort=587
EmailSettings__Username=postmaster@your-domain.mailgun.org
EmailSettings__Password=YOUR_MAILGUN_PASSWORD
```

#### CORS Configuration

```bash
# Frontend Domain (GitHub Pages)
# IMPORTANT: Use ONLY the domain, NO path/repo name
# Wrong: https://username.github.io/repo-name
# Right: https://username.github.io
CORS_ORIGINS=https://alexkola94.github.io

# For local development, you can add multiple (comma-separated):
# CORS_ORIGINS=https://alexkola94.github.io,http://localhost:3000
```

#### Frontend URL

```bash
# Full URL to your GitHub Pages site (WITH repo name)
AppSettings__FrontendUrl=https://alexkola94.github.io/Paire
```

---

## Complete Environment Variables List for Render

Copy this template and fill in your values:

```bash
# ======================
# Core Settings
# ======================
ASPNETCORE_ENVIRONMENT=Production

# ======================
# Database
# ======================
ConnectionStrings__DefaultConnection=User Id=YOUR_DB_USER;Password=YOUR_DB_PASSWORD;Server=YOUR_DB_SERVER;Port=5432;Database=postgres

# ======================
# JWT Authentication
# ======================
JwtSettings__Secret=GENERATE_A_NEW_64_CHARACTER_SECRET
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7

# ======================
# Email Configuration
# ======================
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__SenderName=Paire
EmailSettings__Username=your-email@gmail.com
EmailSettings__Password=YOUR_GMAIL_APP_PASSWORD
EmailSettings__EnableSsl=true

# ======================
# CORS & Frontend
# ======================
CORS_ORIGINS=https://YOUR_USERNAME.github.io
AppSettings__FrontendUrl=https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
```

---

## GitHub Secrets (for CI/CD)

If using GitHub Actions (optional), add these secrets:

**Settings → Secrets and variables → Actions → New repository secret**

```
Name: VITE_BACKEND_API_URL
Value: https://your-app-name.onrender.com
```

---

## Verification Checklist

After setting environment variables:

### Backend (Render)
- [ ] All environment variables set in Render dashboard
- [ ] Service redeployed (happens automatically)
- [ ] Visit `https://your-app.onrender.com/health` - should return healthy
- [ ] Check Render logs for any errors
- [ ] No errors about missing configuration

### Frontend
- [ ] `.env.production` created with correct API URL
- [ ] File is gitignored (not pushed to GitHub)
- [ ] Built and deployed: `npm run deploy`
- [ ] Site loads at GitHub Pages URL
- [ ] No CORS errors in browser console
- [ ] Can register/login successfully

---

## Troubleshooting

### "Configuration is missing" error
**Solution:** Check that environment variable names match exactly (including double underscores `__`)

### CORS error in browser
**Solution:** 
1. Verify `CORS_ORIGINS` in Render matches your GitHub Pages domain
2. Make sure it's ONLY the domain, not the full path
3. Redeploy backend after changing CORS

### Email not sending
**Solution:**
1. Verify Gmail app password is correct
2. Check that 2FA is enabled on Gmail
3. Try sending test email via Render logs
4. Check for SMTP errors in logs

### Database connection failed
**Solution:**
1. Verify Supabase connection string is correct
2. Check that database password is correct
3. Ensure Supabase project is not paused
4. Check Render logs for specific error

---

## Security Reminders

- ✅ Never commit environment variables to Git
- ✅ Use strong, unique secrets for production
- ✅ Rotate secrets periodically
- ✅ Use separate databases for dev/production
- ✅ Monitor logs for suspicious activity
- ✅ Keep backup of environment variables in secure location (password manager)

---

## Need Help?

- Check `DEPLOYMENT_GUIDE.md` for detailed deployment instructions
- Check `SECURITY_CHECKLIST.md` for security best practices
- Check Render logs for error details
- Check browser console for frontend errors

---

**Remember to save these values in a secure location (like a password manager) - you'll need them for updates and debugging!**

