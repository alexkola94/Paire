# ⚡ Quick Deployment Reference

Quick reference for deploying Paire to production.

## 🎯 Quick Links

- **Full Step-by-Step Guide:** [RENDER_GITHUB_PAGES_DEPLOYMENT.md](./RENDER_GITHUB_PAGES_DEPLOYMENT.md)
- **Environment Variables:** [ENV_TEMPLATE.md](./ENV_TEMPLATE.md)
- **Production Checklist:** [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)

---

## 📋 Deployment Checklist

### Before You Start
- [ ] Code pushed to GitHub
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Gmail app password ready (optional)

### Backend (Render.com)
- [ ] Create Web Service on Render
- [ ] Set Root Directory: `backend/YouAndMeExpensesAPI`
- [ ] **Runtime:** Leave as "Auto-detect" (Render detects .NET from `.csproj`)
- [ ] Set Build Command: `dotnet restore && dotnet publish -c Release -o ./publish`
- [ ] Set Start Command: `dotnet ./publish/YouAndMeExpensesAPI.dll`
- [ ] Add all environment variables (see below)
- [ ] Deploy and get URL

**Note:** If you don't see a ".NET" option in Runtime dropdown, that's normal - Render auto-detects it!

### Frontend (GitHub Pages)
- [ ] Create `.env.production` with backend URL
- [ ] Add GitHub Secrets (if using Actions)
- [ ] Enable GitHub Pages
- [ ] Deploy

### Configuration
- [ ] Update Supabase Auth URLs
- [ ] Test deployment
- [ ] Verify CORS works

---

## 🔑 Essential Environment Variables

### Backend (Render.com)

```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=User Id=...;Password=...;Server=...;Port=5432;Database=postgres
JwtSettings__Secret=YOUR_64_CHAR_SECRET
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
CORS_ORIGINS=https://YOUR_USERNAME.github.io
AppSettings__FrontendUrl=https://YOUR_USERNAME.github.io/Paire
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__Username=your-email@gmail.com
EmailSettings__Password=YOUR_APP_PASSWORD
EmailSettings__EnableSsl=true
```

### Frontend (GitHub Secrets)

```bash
VITE_BACKEND_API_URL=https://your-api.onrender.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

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

### Build Frontend Locally
```bash
cd frontend
npm run build
npm run preview
```

---

## 🔗 Important URLs

After deployment, you'll have:

- **Backend API:** `https://your-api.onrender.com`
- **Frontend:** `https://YOUR_USERNAME.github.io/Paire`
- **Health Check:** `https://your-api.onrender.com/health`

---

## ⚠️ Common Issues

### No .NET Runtime Option
- **This is normal!** Render auto-detects .NET from your `.csproj` file
- Just set Root Directory correctly and Render will detect it automatically
- You don't need to select a specific runtime option

### CORS Error
- Check `CORS_ORIGINS` uses domain only (no path)
- Redeploy backend after changing CORS

### 404 on Refresh
- Verify `404.html` exists in `frontend/public/`

### Build Fails
- Check Node.js version (18+)
- Verify all environment variables are set
- Check Root Directory is correct: `backend/YouAndMeExpensesAPI`

---

## 📚 Full Documentation

For detailed instructions, see:
- [RENDER_GITHUB_PAGES_DEPLOYMENT.md](./RENDER_GITHUB_PAGES_DEPLOYMENT.md) - Complete step-by-step guide

