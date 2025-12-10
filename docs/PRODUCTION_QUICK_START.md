# ⚡ Production Deployment Quick Start

**Quick reference for deploying to Render.com + GitHub Pages**

---

## 🎯 Quick Checklist

### Before You Start
- [ ] All code pushed to GitHub
- [ ] Supabase project ready
- [ ] All credentials gathered (see below)

### Backend (Render.com)
- [ ] Create Render account
- [ ] Create Web Service
- [ ] Set Root Directory: `backend/YouAndMeExpensesAPI`
- [ ] Add all environment variables
- [ ] Deploy and get URL

### Frontend (GitHub Pages)
- [ ] Add GitHub Secrets (3 required)
- [ ] Enable GitHub Pages
- [ ] Push workflow file
- [ ] Wait for deployment

### Connect & Test
- [ ] Update Supabase Auth URLs
- [ ] Test frontend → backend connection
- [ ] Test all features

---

## 📝 Required Credentials

### Supabase
- Project URL: `https://xxxxx.supabase.co`
- Anon Key: `eyJ...` (from Settings → API)
- Database Connection String: (from Settings → Database)

### Render.com
- Backend URL: `https://your-api.onrender.com` (after deployment)

### GitHub
- Username: `your-username`
- Repository Name: `your-repo-name`

### Optional
- Gmail App Password (for emails)
- OpenAI API Key (for chatbot)
- News API Keys (for Economic News)

---

## 🔧 Environment Variables

### Render.com (Backend)

**Required:**
```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<your-connection-string>
JwtSettings__Secret=<64-char-secret>
CORS_ORIGINS=https://YOUR_USERNAME.github.io
AppSettings__FrontendUrl=https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
```

**Optional:**
```bash
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__Password=<app-password>
OpenAI__ApiKey=<your-key>
GNews__ApiKey=<your-key>
NewsAPI__ApiKey=<your-key>
CurrentsAPI__ApiKey=<your-key>
```

### GitHub Secrets (Frontend)

**Required:**
- `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJ...`
- `VITE_BACKEND_API_URL` = `https://your-api.onrender.com`

---

## 🚀 Quick Commands

### Generate JWT Secret
```powershell
# PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
```

```bash
# Bash
openssl rand -base64 64
```

### Test Backend
```bash
curl https://your-api.onrender.com/health
```

### Deploy Frontend
```bash
git add .github/workflows/deploy-pages.yml
git commit -m "Add deployment workflow"
git push origin main
```

---

## 🔗 Important URLs

After deployment:

- **Frontend:** `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
- **Backend:** `https://your-api.onrender.com`
- **Health Check:** `https://your-api.onrender.com/health`

---

## ⚠️ Common Issues

**Backend:**
- Build fails → Check Root Directory: `backend/YouAndMeExpensesAPI`
- CORS errors → Check `CORS_ORIGINS` (domain only, no path)

**Frontend:**
- Build fails → Check GitHub Secrets are set
- 404 on refresh → Verify `404.html` exists

---

## 📚 Full Documentation

For detailed step-by-step instructions, see:
- [PRODUCTION_DEPLOYMENT_PLAN.md](./PRODUCTION_DEPLOYMENT_PLAN.md) - Complete guide
- [RENDER_GITHUB_PAGES_DEPLOYMENT.md](./RENDER_GITHUB_PAGES_DEPLOYMENT.md) - Detailed troubleshooting

---

**Last Updated:** December 2025

