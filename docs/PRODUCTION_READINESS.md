# 🚀 Production Readiness Checklist

This document outlines the steps and checks needed to prepare the Paire application for production deployment.

## ✅ Pre-Deployment Checklist

### 📁 Project Organization
- [x] All documentation files moved to `docs/` folder
- [x] Removed `.old` backup files
- [x] Cleaned up root directory structure

### 🔐 Security Configuration

#### Backend Security
- [x] `appsettings.json` is gitignored (contains local dev credentials)
- [x] `appsettings.Production.json` has empty placeholders
- [x] `appsettings.Example.json` provides template without secrets
- [ ] **Action Required:** Set all environment variables in production hosting (Render/Azure/etc.)
  - `ConnectionStrings__DefaultConnection`
  - `JwtSettings__Secret` (generate new secure key)
  - `EmailSettings__*` (all email configuration)
  - `CORS_ORIGINS` (your production frontend URL)
  - `AppSettings__FrontendUrl`

#### Frontend Security
- [x] `.env` files are gitignored
- [ ] **Action Required:** Create `.env.production` with production API URL
- [ ] **Action Required:** Ensure no hardcoded API keys in source code

### 🗄️ Database
- [ ] **Action Required:** Verify production database connection string
- [ ] **Action Required:** Run migrations on production database
- [ ] **Action Required:** Verify Row Level Security (RLS) policies are active
- [ ] **Action Required:** Test database backups are configured

### 🌐 CORS Configuration
- [x] CORS configured to read from environment variable
- [ ] **Action Required:** Set `CORS_ORIGINS` in production to your frontend domain
- [ ] **Action Required:** Remove localhost origins in production

### 📧 Email Configuration
- [ ] **Action Required:** Configure Gmail App Password or alternative SMTP
- [ ] **Action Required:** Test email sending in production
- [ ] **Action Required:** Verify email templates work correctly

### 📊 Economic News Feature
- [x] Eurostat API integration (free, no authentication required)
- [ ] **Optional:** Configure news API keys for enhanced content:
  - `GNews__ApiKey` - Get free key from https://gnews.io/ (100 requests/day free)
  - `NewsAPI__ApiKey` - Get free key from https://newsapi.org/ (100 requests/day free)
  - `CurrentsAPI__ApiKey` - Get free key from https://currentsapi.services/ (200 requests/day free)
- [x] Response caching configured (5-minute cache for external APIs)
- [ ] **Action Required:** Test economic data endpoints in production
- [ ] **Action Required:** Verify API rate limits are respected

### 🔑 JWT Configuration
- [ ] **Action Required:** Generate new secure JWT secret (64+ characters)
- [ ] **Action Required:** Set `JwtSettings__Secret` in production
- [ ] **Action Required:** Verify JWT expiration settings are appropriate

### 🏗️ Build & Deployment

#### Backend
- [x] `.gitignore` excludes build artifacts (`bin/`, `obj/`)
- [x] `.gitignore` excludes sensitive configuration files
- [ ] **Action Required:** Configure production build settings
- [ ] **Action Required:** Set `ASPNETCORE_ENVIRONMENT=Production` in hosting
- [ ] **Action Required:** Disable Swagger in production (or restrict access)

#### Frontend
- [x] `dist/` folder is gitignored
- [ ] **Action Required:** Build production bundle: `npm run build`
- [ ] **Action Required:** Test production build locally: `npm run preview`
- [ ] **Action Required:** Configure GitHub Pages or hosting service

### 🧪 Testing
- [ ] **Action Required:** Run all tests before deployment
- [ ] **Action Required:** Test critical user flows in production-like environment
- [ ] **Action Required:** Verify error handling and logging

### 📊 Monitoring & Logging
- [ ] **Action Required:** Configure production logging levels
- [ ] **Action Required:** Set up error tracking (e.g., Sentry, Application Insights)
- [ ] **Action Required:** Configure health check monitoring
- [ ] **Action Required:** Set up uptime monitoring

### 🔍 Code Quality
- [x] Removed development-only files (`.old` files)
- [x] Cleaned up documentation structure
- [ ] **Action Required:** Review and remove any console.log statements
- [ ] **Action Required:** Verify no debug code in production build

## 🚨 Critical Security Items

### Before Going Live:
1. **Change all default passwords and secrets**
2. **Generate new JWT secret** (never reuse development secret)
3. **Verify HTTPS is enforced** in production
4. **Review CORS settings** - only allow your production domain
5. **Disable Swagger UI** or restrict access in production
6. **Verify RLS policies** are active on all tables
7. **Test authentication flow** end-to-end
8. **Verify email verification** is working
9. **Check that sensitive data** is not logged
10. **Review API rate limiting** (if implemented)

## 📝 Environment Variables Reference

### Backend (Render/Azure/etc.)
```bash
# Core
ASPNETCORE_ENVIRONMENT=Production

# Database
ConnectionStrings__DefaultConnection=User Id=...;Password=...;Server=...;Port=5432;Database=postgres

# JWT
JwtSettings__Secret=YOUR_64_CHAR_SECRET
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7

# Email
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__SenderName=Paire
EmailSettings__Username=your-email@gmail.com
EmailSettings__Password=YOUR_APP_PASSWORD
EmailSettings__EnableSsl=true

# CORS & Frontend
CORS_ORIGINS=https://your-username.github.io
AppSettings__FrontendUrl=https://your-username.github.io/Paire

# Economic News APIs (Optional - for enhanced news content)
GNews__ApiKey=your_gnews_api_key_optional
NewsAPI__ApiKey=your_newsapi_key_optional
CurrentsAPI__ApiKey=your_currentsapi_key_optional
```

### Frontend (`.env.production`)
```env
VITE_BACKEND_API_URL=https://your-api.onrender.com
```

## 🔄 Post-Deployment Verification

After deployment, verify:

1. **Health Check:** `https://your-api.onrender.com/health` returns healthy
2. **Frontend Loads:** Production site loads without errors
3. **Authentication:** Can register and login
4. **API Calls:** Frontend can communicate with backend
5. **CORS:** No CORS errors in browser console
6. **Email:** Can receive verification emails
7. **Database:** Data persists correctly
8. **Performance:** Response times are acceptable

## 📚 Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [ENV_TEMPLATE.md](./ENV_TEMPLATE.md) - Environment variables template
- [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) - Security best practices
- [HOW_TO_RUN.md](./HOW_TO_RUN.md) - Development setup

## 🆘 Troubleshooting

### Common Issues:

**"Database connection failed"**
- Verify connection string is correct
- Check database is not paused (Supabase)
- Verify network access from hosting provider

**"CORS error"**
- Verify `CORS_ORIGINS` matches your frontend domain exactly
- Check for trailing slashes or protocol mismatches
- Ensure backend is redeployed after CORS changes

**"JWT validation failed"**
- Verify JWT secret is set correctly
- Check issuer and audience match
- Ensure tokens are being sent in requests

**"Email not sending"**
- Verify Gmail app password is correct
- Check 2FA is enabled on Gmail account
- Review SMTP settings match Gmail requirements

**"Economic data not loading"**
- Eurostat API is free and requires no authentication - should work automatically
- Check network connectivity to Eurostat API
- Verify news API keys are valid (if configured)
- Check API rate limits haven't been exceeded
- Review backend logs for specific API errors

---

**Last Updated:** December 2025  
**Status:** Ready for production deployment after completing action items above

