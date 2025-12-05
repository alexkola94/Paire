# ✅ Paire - Deployment Ready

Your app **Paire** is now configured and ready for deployment!

---

## 📋 What's Been Updated

### ✅ Frontend Configuration
- ✅ `frontend/package.json` - Name changed to `paire-frontend`
- ✅ `frontend/vite.config.js` - Base path set to `/Paire/`
- ✅ `frontend/src/App.jsx` - Router basename set to `/Paire`
- ✅ `frontend/public/404.html` - GitHub Pages redirect configured for Paire

### ✅ Backend Configuration
- ✅ `backend/YouAndMeExpensesAPI/Program.cs` - API name changed to "Paire API"
- ✅ `backend/YouAndMeExpensesAPI/appsettings.Production.json` - JWT issuer/audience updated
- ✅ CORS configuration - Updated to use environment variables
- ✅ Swagger documentation - Updated to "Paire API"

### ✅ Deployment Documentation
- ✅ `DEPLOYMENT_GUIDE.md` - Complete step-by-step deployment guide
- ✅ `QUICK_DEPLOY.md` - Quick reference for deployment commands
- ✅ `ENV_TEMPLATE.md` - All environment variables documented
- ✅ `SECURITY_CHECKLIST.md` - Security best practices
- ✅ `.github/workflows/deploy.yml` - Automated CI/CD setup

### ✅ Docker & Infrastructure
- ✅ `backend/YouAndMeExpensesAPI/Dockerfile` - Ready for containerized deployment
- ✅ `backend/YouAndMeExpensesAPI/.dockerignore` - Optimized Docker builds
- ✅ `.gitignore` - Updated to protect sensitive files

---

## 🚀 Quick Deployment Checklist

### Before You Start
- [ ] Update repository name on GitHub to "Paire" (optional, or keep current name)
- [ ] Review `.gitignore` to ensure no secrets are committed
- [ ] Change all default passwords/secrets in production

### Backend Deployment (Render.com)
1. [ ] Go to https://render.com and sign in
2. [ ] Create new Web Service
3. [ ] Connect your GitHub repository
4. [ ] Configure settings:
   - **Name:** `paire-api`
   - **Root Directory:** `backend/YouAndMeExpensesAPI`
   - **Build Command:** `dotnet restore && dotnet build -c Release`
   - **Start Command:** `dotnet run --project YouAndMeExpensesAPI.csproj --urls "http://0.0.0.0:$PORT"`
5. [ ] Add environment variables (see ENV_TEMPLATE.md)
6. [ ] Deploy and copy your API URL

### Frontend Deployment (GitHub Pages)
1. [ ] Update these files with YOUR values:
   - `frontend/vite.config.js` - Replace `/Paire/` if using different repo name
   - `frontend/package.json` - Replace `alexkola94` with your username
   - `frontend/public/404.html` - Replace `/Paire` if using different repo name
   - `frontend/src/App.jsx` - Replace `"/Paire"` if using different repo name

2. [ ] Create `frontend/.env.production`:
   ```env
   VITE_BACKEND_API_URL=https://paire-api.onrender.com
   ```
   (Use YOUR actual Render URL)

3. [ ] Install gh-pages:
   ```bash
   cd frontend
   npm install gh-pages --save-dev
   ```

4. [ ] Deploy:
   ```bash
   npm run deploy
   ```

5. [ ] Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: `gh-pages` branch
   - Save

### Post-Deployment
- [ ] Update CORS_ORIGINS in Render with your GitHub Pages domain
- [ ] Test login/register functionality
- [ ] Verify API connectivity
- [ ] Check browser console for errors

---

## 🔑 Key URLs After Deployment

### Production URLs (Update with YOUR actual URLs)
```
Frontend:  https://alexkola94.github.io/Paire/
API:       https://paire-api.onrender.com
API Docs:  https://paire-api.onrender.com/swagger
Health:    https://paire-api.onrender.com/health
```

### Environment Variables Summary

#### Render.com (Backend)
```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<your-supabase-connection>
JwtSettings__Secret=<generate-new-secret>
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
EmailSettings__SenderName=Paire
CORS_ORIGINS=https://alexkola94.github.io
AppSettings__FrontendUrl=https://alexkola94.github.io/Paire
```

#### Frontend .env.production
```env
VITE_BACKEND_API_URL=https://paire-api.onrender.com
```

---

## 📁 Important Files Reference

### Configuration Files
- `frontend/.env.production` - Frontend API URL (gitignored)
- `backend/YouAndMeExpensesAPI/appsettings.Production.json` - Backend production config

### Deployment Files
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `QUICK_DEPLOY.md` - Quick reference
- `ENV_TEMPLATE.md` - All environment variables
- `SECURITY_CHECKLIST.md` - Security best practices

### Infrastructure
- `Dockerfile` - Containerization (optional)
- `.github/workflows/deploy.yml` - Automated CI/CD (optional)
- `.dockerignore` - Docker optimization

---

## ⚠️ IMPORTANT SECURITY NOTES

### Before Pushing to GitHub:
1. ✅ **Never commit** `appsettings.json` or `.env.production`
2. ✅ **Change** all default secrets (JWT secret, database password)
3. ✅ **Use** strong passwords in production
4. ✅ **Enable** email confirmation and 2FA
5. ✅ **Review** `.gitignore` before committing

### Current Secrets to Change:
- 🔴 **Database Password** - Change from current password
- 🔴 **JWT Secret** - Generate new 64-character secret
- 🔴 **Email Password** - Use app-specific password only
- 🔴 **All secrets** - Never use example/default values

---

## 🎯 Next Steps

### 1. Deploy Backend First
```bash
# Commit your changes
git add .
git commit -m "Configure for deployment"
git push origin main

# Then deploy to Render.com via dashboard
```

### 2. Deploy Frontend Second
```bash
# Create .env.production with your Render URL
cd frontend
echo "VITE_BACKEND_API_URL=https://your-render-url.onrender.com" > .env.production

# Deploy to GitHub Pages
npm run deploy
```

### 3. Configure & Test
- Update CORS in Render
- Test registration/login
- Verify email sending
- Check all features work

---

## 📚 Documentation

- **Full Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Quick Commands:** [QUICK_DEPLOY.md](./QUICK_DEPLOY.md)
- **Environment Setup:** [ENV_TEMPLATE.md](./ENV_TEMPLATE.md)
- **Security:** [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)
- **Features:** [README.md](./README.md)

---

## 🆘 Need Help?

### Common Issues

**CORS Error:**
- Check `CORS_ORIGINS` in Render matches GitHub Pages domain
- Should be `https://username.github.io` (no path)

**API Not Responding:**
- Check Render logs for errors
- Verify environment variables are set
- Check `/health` endpoint

**Frontend White Screen:**
- Check browser console for errors
- Verify API URL in `.env.production`
- Verify `base` path in `vite.config.js`

**Email Not Sending:**
- Verify Gmail app password (not regular password)
- Check SMTP settings in Render
- Test email via `/api/reminders/test-email`

### Debugging Commands

```bash
# Check Render deployment status
# → Go to Render Dashboard → Logs

# Test API health
curl https://paire-api.onrender.com/health

# Test frontend build locally
cd frontend
npm run build
npm run preview

# Check for uncommitted secrets
git status
git diff
```

---

## 🎉 Ready to Deploy!

Everything is configured and ready. Follow these steps:

1. **Review Security:** Read `SECURITY_CHECKLIST.md`
2. **Set Environment Variables:** Use `ENV_TEMPLATE.md` as reference
3. **Deploy Backend:** Follow `DEPLOYMENT_GUIDE.md` Part 1
4. **Deploy Frontend:** Follow `DEPLOYMENT_GUIDE.md` Part 2
5. **Test Everything:** Verify all features work
6. **Monitor:** Check logs regularly

---

## 📈 After Deployment

### Monitoring
- [ ] Set up Render monitoring/alerts
- [ ] Use UptimeRobot for uptime monitoring (free)
- [ ] Monitor error logs weekly
- [ ] Check database backups

### Maintenance
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review logs for suspicious activity
- [ ] Test backup restoration

### Future Enhancements
- [ ] Set up custom domain (optional)
- [ ] Add rate limiting
- [ ] Implement error tracking (Sentry)
- [ ] Add analytics (Google Analytics)
- [ ] Set up CI/CD automation

---

**Your app Paire is ready to go live! 🚀**

Good luck with your deployment! If you encounter any issues, refer to the detailed guides in the documentation folder.

