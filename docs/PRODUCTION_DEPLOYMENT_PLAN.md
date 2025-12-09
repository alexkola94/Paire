# 🚀 Production Deployment Plan
## Render.com (Backend) + GitHub Pages (Frontend)

**Last Updated:** December 2025  
**Status:** Ready for Production Deployment

---

## 📋 Pre-Deployment Checklist

Before starting, ensure you have:

- [ ] **GitHub Account** - Repository created and code pushed
- [ ] **Render.com Account** - Sign up at [render.com](https://render.com) (free tier available)
- [ ] **Supabase Account** - Project created and configured
- [ ] **All Credentials Ready** - See "Required Information" section below

### Required Information

Gather these before starting:

- [ ] **Supabase Project URL** - `https://xxxxx.supabase.co`
- [ ] **Supabase Anon Key** - From Supabase Dashboard → Settings → API
- [ ] **Supabase Service Role Key** - From Supabase Dashboard → Settings → API
- [ ] **Database Connection String** - From Supabase Dashboard → Settings → Database
- [ ] **Gmail App Password** - For email notifications (optional but recommended)
- [ ] **GitHub Username** - For GitHub Pages URL
- [ ] **Repository Name** - Your GitHub repo name (e.g., `You-me-Expenses` or `Paire`)
- [ ] **OpenAI API Key** - For chatbot feature (optional)
- [ ] **News API Keys** - For Economic News feature (optional):
  - GNews API Key (from https://gnews.io/)
  - NewsAPI Key (from https://newsapi.org/)
  - CurrentsAPI Key (from https://currentsapi.services/)

---

## 🎯 Deployment Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   GitHub Repo   │         │   Render.com     │         │  GitHub Pages    │
│                 │         │                  │         │                  │
│  Backend Code   │ ──────> │  Backend API     │ <────── │  Frontend App    │
│  Frontend Code  │         │  (Production)    │         │  (Production)    │
│                 │         │                  │         │                  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │    Supabase      │
                            │   (Database)     │
                            └──────────────────┘
```

**Deployment Flow:**
1. Deploy Backend API to Render.com
2. Deploy Frontend to GitHub Pages
3. Connect Frontend to Backend
4. Configure Supabase for production
5. Test and verify everything works

---

## Part 1: Backend Deployment (Render.com)

### Step 1.1: Prepare Repository ✅

- [ ] **Verify code is pushed to GitHub:**
  ```bash
  git status
  git add .
  git commit -m "Prepare for production deployment"
  git push origin main
  ```

- [ ] **Verify backend structure:**
  - Backend folder: `backend/YouAndMeExpensesAPI/`
  - `Program.cs` exists
  - `YouAndMeExpensesAPI.csproj` exists
  - `.gitignore` excludes `appsettings.json`

### Step 1.2: Create Render.com Account ✅

- [ ] Go to [render.com](https://render.com)
- [ ] Click **"Get Started for Free"**
- [ ] Sign up with GitHub (recommended) or email
- [ ] Verify email if required

### Step 1.3: Create Web Service ✅

- [ ] Click **"New +"** → **"Web Service"**
- [ ] Connect GitHub account (if not already)
- [ ] Select your repository
- [ ] Click **"Connect"**

### Step 1.4: Configure Web Service ✅

**Basic Settings:**
- [ ] **Name:** `paire-api` (or your preferred name)
- [ ] **Region:** Choose closest to users (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`)
- [ ] **Branch:** `main`
- [ ] **Root Directory:** `backend/YouAndMeExpensesAPI` ⚠️ **NO trailing slash**

**Runtime Configuration:**
- [ ] **Runtime:** Select **"Docker"** (recommended) or **"Auto-detect"**
- [ ] **Dockerfile Path:** Leave blank (auto-detects) OR `Dockerfile`
- [ ] **Build Command:** Leave blank (if using Docker) OR `dotnet restore && dotnet publish -c Release -o ./publish`
- [ ] **Start Command:** Leave blank (if using Docker) OR `dotnet ./publish/YouAndMeExpensesAPI.dll`
- [ ] **Instance Type:** **Free** (or upgrade for better performance)

**Advanced Settings:**
- [ ] **Auto-Deploy:** `Yes` (deploys on every push to main)
- [ ] **Health Check Path:** `/health`
- [ ] **Health Check Interval:** `60` seconds

### Step 1.5: Set Environment Variables ✅

Click **"Environment"** tab and add these variables:

#### Core Configuration
```bash
ASPNETCORE_ENVIRONMENT=Production
```

#### Database Connection
```bash
ConnectionStrings__DefaultConnection=Host=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.YOUR_PROJECT_REF;Password=YOUR_PASSWORD
```

**How to get:**
1. Supabase Dashboard → Settings → Database
2. Connection string → **URI** tab (not Connection pooling)
3. Copy the connection string
4. Convert to .NET format (see format above)

**⚠️ Important:**
- Use **port 5432** for direct connection (recommended)
- Username format: `postgres.[PROJECT_REF]` (not just `postgres`)
- If you get "Tenant or user not found" error, see [Supabase Connection Troubleshooting](./SUPABASE_CONNECTION_TROUBLESHOOTING.md)

#### JWT Configuration
```bash
JwtSettings__Secret=YOUR_64_CHARACTER_SECRET_KEY_HERE
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7
```

**Generate JWT Secret:**
- **PowerShell:** `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))`
- **Bash:** `openssl rand -base64 64`
- **Online:** https://generate-secret.vercel.app/64

#### Email Configuration (Optional but Recommended)
```bash
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__SenderName=Paire
EmailSettings__Username=your-email@gmail.com
EmailSettings__Password=xxxx xxxx xxxx xxxx
EmailSettings__EnableSsl=true
```

**Get Gmail App Password:**
1. https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to App Passwords
4. Generate password for "Paire API"

#### CORS Configuration
```bash
CORS_ORIGINS=https://YOUR_USERNAME.github.io
```

**Important:** 
- Use ONLY the domain (no path)
- Example: `https://alexkola94.github.io` (NOT `https://alexkola94.github.io/Paire`)

#### Frontend URL
```bash
AppSettings__FrontendUrl=https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
```

**Important:**
- Use FULL URL WITH path
- Example: `https://alexkola94.github.io/Paire`

#### OpenAI Configuration (Optional - for Chatbot)
```bash
OpenAI__ApiKey=your_openai_api_key_here
```

#### Economic News APIs (Optional - for Enhanced News)
```bash
GNews__ApiKey=your_gnews_api_key_optional
NewsAPI__ApiKey=your_newsapi_key_optional
CurrentsAPI__ApiKey=your_currentsapi_key_optional
```

### Step 1.6: Deploy Backend ✅

- [ ] Scroll down and click **"Create Web Service"**
- [ ] Wait for deployment (5-10 minutes)
- [ ] Monitor build logs in real-time
- [ ] Verify deployment succeeds

### Step 1.7: Get Backend URL ✅

- [ ] Copy your Render URL: `https://your-api.onrender.com`
- [ ] Test health endpoint: `https://your-api.onrender.com/health`
- [ ] Should return: `{"status":"healthy",...}`

**Save this URL - you'll need it for frontend configuration!**

### Step 1.8: Verify Backend ✅

- [ ] **Test Health Endpoint:**
  ```bash
  curl https://your-api.onrender.com/health
  ```

- [ ] **Check Logs:**
  - Render dashboard → **Logs** tab
  - Should see: "Now listening on: http://0.0.0.0:10000"

- [ ] **Test API Endpoint:**
  - Visit: `https://your-api.onrender.com/api/system/health`
  - Should return API health status

---

## Part 2: Frontend Deployment (GitHub Pages)

### Step 2.1: Prepare Frontend ✅

- [ ] **Navigate to frontend directory:**
  ```bash
  cd frontend
  ```

- [ ] **Check `vite.config.js`:**
  - Verify `base` path matches your repo name
  - Example: `base: mode === 'production' ? '/Paire/' : '/'`
  - If repo is `You-me-Expenses`, use `/You-me-Expenses/`

- [ ] **Update `package.json` homepage** (if needed):
  ```json
  "homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME"
  ```

### Step 2.2: Create GitHub Actions Workflow ✅

- [ ] **Create directory:**
  ```bash
  mkdir -p .github/workflows
  ```

- [ ] **Create `.github/workflows/deploy-pages.yml`:**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
     
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
     
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
     
      - name: Create .env.production
        working-directory: ./frontend
        run: |
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env.production
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env.production
          echo "VITE_BACKEND_API_URL=${{ secrets.VITE_BACKEND_API_URL }}" >> .env.production
     
      - name: Build
        working-directory: ./frontend
        run: npm run build
     
      - name: Setup Pages
        uses: actions/configure-pages@v4
     
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend/dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 2.3: Add GitHub Secrets ✅

- [ ] Go to GitHub repository
- [ ] **Settings** → **Secrets and variables** → **Actions**
- [ ] Click **"New repository secret"** and add:

**Secret 1: VITE_SUPABASE_URL**
- Name: `VITE_SUPABASE_URL`
- Value: `https://xxxxx.supabase.co`
- Click **"Add secret"**

**Secret 2: VITE_SUPABASE_ANON_KEY**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: Your Supabase anon key (starts with `eyJ...`)
- Click **"Add secret"**

**Secret 3: VITE_BACKEND_API_URL**
- Name: `VITE_BACKEND_API_URL`
- Value: `https://your-api.onrender.com` (from Step 1.7)
- Click **"Add secret"**

### Step 2.4: Enable GitHub Pages ✅

- [ ] Go to **Settings** → **Pages**
- [ ] Under **Source**, select **"GitHub Actions"**
- [ ] Click **Save**

### Step 2.5: Deploy Frontend ✅

- [ ] **If workflow file is already pushed, skip this step:**
  - ✅ Workflow file already exists in repository
  - ✅ No need to commit/push again

- [ ] **If workflow file is NOT pushed yet:**
  ```bash
  git add .github/workflows/deploy-pages.yml
  git commit -m "Add GitHub Pages deployment workflow"
  git push origin main
  ```

- [ ] **Verify GitHub Secrets are set** (from Step 2.3):
  - Go to **Settings** → **Secrets and variables** → **Actions**
  - Verify these secrets exist:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_BACKEND_API_URL`
  - If missing, add them now (see Step 2.3)

- [ ] **Trigger deployment:**
  - Option 1: Push any commit to `main` branch (auto-triggers)
  - Option 2: Manually trigger:
    - Go to **Actions** tab
    - Select **"Deploy to GitHub Pages"** workflow
    - Click **"Run workflow"** → **"Run workflow"**

- [ ] **Monitor deployment:**
  - Go to **Actions** tab in GitHub
  - Watch workflow run
  - Wait for completion (3-5 minutes)
  - Check for any errors in the logs

### Step 2.6: Get Frontend URL ✅

- [ ] Your site will be at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
- [ ] Replace:
  - `YOUR_USERNAME` with your GitHub username
  - `YOUR_REPO_NAME` with your repository name

---

## Part 3: Connect Frontend to Backend

### Step 3.1: Update Backend CORS ✅

- [ ] Go to Render.com dashboard
- [ ] Navigate to your web service
- [ ] **Environment** tab
- [ ] Verify `CORS_ORIGINS` is set:
  ```bash
  CORS_ORIGINS=https://YOUR_USERNAME.github.io
  ```
- [ ] **Redeploy** if changed:
  - Click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 3.2: Verify Frontend Environment ✅

- [ ] Go to GitHub → **Settings** → **Secrets and variables** → **Actions**
- [ ] Verify `VITE_BACKEND_API_URL` is set correctly
- [ ] If changed, trigger new deployment:
  - Push a commit OR
  - Go to **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### Step 3.3: Test Connection ✅

- [ ] Open your GitHub Pages site
- [ ] Open browser Developer Tools (F12)
- [ ] Go to **Console** tab
- [ ] Try to register/login
- [ ] Check for CORS errors
- [ ] Check **Network** tab for API calls

**Expected:**
- ✅ No CORS errors
- ✅ API calls return 200/201 status
- ✅ App functions normally

---

## Part 4: Configure Supabase

### Step 4.1: Update Auth URLs ✅

- [ ] Go to [Supabase Dashboard](https://app.supabase.com)
- [ ] Select your project
- [ ] **Authentication** → **URL Configuration**

- [ ] **Update Site URL:**
  ```
  https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
  ```

- [ ] **Add Redirect URLs:**
  - Click **"Add URL"**
  - Add: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/**`
  - Add: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
  - Click **"Save"**

### Step 4.2: Verify Row Level Security ✅

- [ ] Go to **Table Editor** in Supabase
- [ ] For each table, verify:
  - [ ] RLS is **Enabled**
  - [ ] Policies are configured correctly

### Step 4.3: Verify Storage Bucket ✅

- [ ] Go to **Storage** in Supabase
- [ ] Verify `receipts` bucket exists
- [ ] Check policies:
  - [ ] Users can upload
  - [ ] Users can view their own files
  - [ ] Users can delete their own files

---

## Part 5: Testing & Verification

### Step 5.1: Frontend Tests ✅

Test these on your deployed site:

- [ ] **Homepage loads** without errors
- [ ] **Registration** works
- [ ] **Email verification** link works
- [ ] **Login** works
- [ ] **Dashboard** loads with data
- [ ] **Add expense** works
- [ ] **Add income** works
- [ ] **View transactions** works
- [ ] **Language switching** works
- [ ] **Economic News** page loads
- [ ] **All features** accessible
- [ ] **Logout** works

### Step 5.2: Backend Tests ✅

- [ ] **Health Check:**
  ```bash
  curl https://your-api.onrender.com/health
  ```

- [ ] **API Health:**
  ```bash
  curl https://your-api.onrender.com/api/system/health
  ```

- [ ] **Test from browser console:**
  ```javascript
  fetch('https://your-api.onrender.com/health')
    .then(r => r.json())
    .then(console.log)
  ```

### Step 5.3: Integration Tests ✅

- [ ] **Register new user** from deployed frontend
- [ ] **Verify email** (check your email)
- [ ] **Login** with new account
- [ ] **Add a transaction**
- [ ] **Verify it appears** in dashboard
- [ ] **Check Supabase** to verify data is stored
- [ ] **Test Economic News** feature
- [ ] **Test all CRUD operations**

### Step 5.4: Performance Check ✅

- [ ] **Page Load Time:**
  - DevTools → **Network** tab
  - Reload page
  - Should be < 3 seconds

- [ ] **API Response Time:**
  - Check **Network** tab for API calls
  - Should be < 1 second

---

## 🎉 Success Checklist

Once everything is working, you should have:

- [ ] ✅ Backend API running on Render.com
- [ ] ✅ Frontend deployed to GitHub Pages
- [ ] ✅ Frontend can communicate with backend
- [ ] ✅ No CORS errors
- [ ] ✅ Authentication working
- [ ] ✅ Database operations working
- [ ] ✅ Email notifications working (if configured)
- [ ] ✅ Economic News feature working
- [ ] ✅ All features accessible and functional

---

## 📝 Important Notes

### Render.com Free Tier Limitations

- ⚠️ **Spins down after 15 minutes** of inactivity
- ⚠️ **First request after spin-down** takes ~30 seconds (cold start)
- 💡 **Consider upgrading** to paid plan for production use ($7/month)

### GitHub Pages Limitations

- ✅ **Public repositories only** (for free tier)
- ✅ **Build time limits** (usually not an issue)
- ✅ **Bandwidth limits** (generous for most apps)

### Security Reminders

- ✅ Never commit `.env` files
- ✅ Never commit `appsettings.json` with real credentials
- ✅ Use strong JWT secrets
- ✅ Rotate secrets periodically
- ✅ Monitor logs for suspicious activity

---

## 🔄 Updating Your Deployment

### Backend Updates

1. Push changes to GitHub
2. Render automatically redeploys (if auto-deploy is enabled)
3. Or manually trigger: Render dashboard → **Manual Deploy**

### Frontend Updates

1. Push changes to GitHub
2. GitHub Actions automatically redeploys
3. Or manually trigger: GitHub → **Actions** → **Deploy to GitHub Pages** → **Run workflow**

---

## 🆘 Troubleshooting

### Common Issues

**Backend Issues:**
- ❌ Build fails → Check Root Directory is correct: `backend/YouAndMeExpensesAPI`
- ❌ No .NET detected → Use Docker runtime or verify `.csproj` file exists
- ❌ Database connection failed → See [Supabase Connection Troubleshooting](./SUPABASE_CONNECTION_TROUBLESHOOTING.md)
- ❌ "Tenant or user not found" error → See [Supabase Connection Troubleshooting](./SUPABASE_CONNECTION_TROUBLESHOOTING.md)
- ❌ CORS errors → Check `CORS_ORIGINS` environment variable
- ❌ 500 Internal Server Error → See [Backend 500 Error Troubleshooting](./BACKEND_500_ERROR_TROUBLESHOOTING.md)

**Frontend Issues:**
- ❌ Build fails → Check GitHub Actions logs
- ❌ 404 on refresh → Verify `404.html` exists in `frontend/public/`
- ❌ API calls fail → Verify `VITE_BACKEND_API_URL` secret is set
- ❌ Assets not loading → Check `base` path in `vite.config.js`

**General Issues:**
- ❌ Email not sending → Verify Gmail app password
- ❌ Authentication not working → Check Supabase Auth URLs

For detailed troubleshooting, see: [RENDER_GITHUB_PAGES_DEPLOYMENT.md](./RENDER_GITHUB_PAGES_DEPLOYMENT.md)

---

## 📚 Additional Resources

- [Render.com Documentation](https://render.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Detailed Deployment Guide](./RENDER_GITHUB_PAGES_DEPLOYMENT.md)

---

**Last Updated:** December 2025  
**Status:** Complete Production Deployment Plan

