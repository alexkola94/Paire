# 🚀 Complete Production Deployment Guide
## Render.com (Backend API) + GitHub Pages (Frontend)

This is a detailed, step-by-step guide to deploy your Paire application to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Deploy Backend to Render.com](#part-1-deploy-backend-to-rendercom)
3. [Part 2: Deploy Frontend to GitHub Pages](#part-2-deploy-frontend-to-github-pages)
4. [Part 3: Connect Frontend to Backend](#part-3-connect-frontend-to-backend)
5. [Part 4: Configure Supabase](#part-4-configure-supabase)
6. [Part 5: Testing & Verification](#part-5-testing--verification)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ GitHub account
- ✅ Render.com account (free tier available at [render.com](https://render.com))
- ✅ Supabase account (free tier available at [supabase.com](https://supabase.com))
- ✅ Your code pushed to a GitHub repository
- ✅ All environment variables ready (see below)

### Required Information Checklist

Before deployment, gather:

- [ ] **Supabase Project URL** (e.g., `https://xxxxx.supabase.co`)
- [ ] **Supabase Anon Key** (starts with `eyJ...`)
- [ ] **Supabase Database Connection String** (from Supabase Dashboard → Settings → Database)
- [ ] **Gmail App Password** (for email notifications - optional but recommended)
- [ ] **GitHub Repository URL** (e.g., `https://github.com/username/Paire`)
- [ ] **GitHub Username** (for GitHub Pages URL)

---

## Part 1: Deploy Backend to Render.com

### Step 1.1: Prepare Your Repository

1. **Ensure your code is pushed to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Verify your backend structure:**
   - Backend should be in: `backend/YouAndMeExpensesAPI/`
   - `Program.cs` exists
   - `YouAndMeExpensesAPI.csproj` exists
   - `appsettings.Example.json` exists (for reference)

### Step 1.2: Create Render.com Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

### Step 1.3: Create New Web Service

1. In Render dashboard, click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Select your repository: `You-me-Expenses` (or your repo name)
5. Click **"Connect"**

### Step 1.4: Configure Web Service

Fill in the following settings:

#### Basic Settings:
- **Name:** `paire-api` (or your preferred name)
- **Region:** Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch:** `main` (or your default branch)
- **Root Directory:** `backend/YouAndMeExpensesAPI`

#### Runtime Configuration:
Render.com will **auto-detect** .NET from your `.csproj` file. You have two options:

**Option 1: Auto-Detection (Recommended)**
- **Runtime:** Leave as **"Auto-detect"** or **"Docker"** (Render will detect .NET 7.0 from your `.csproj`)
- **Build Command:** `dotnet restore && dotnet publish -c Release -o ./publish`
- **Start Command:** `dotnet ./publish/YouAndMeExpensesAPI.dll`

**Option 2: Use Dockerfile**
- **Runtime:** Select **"Docker"** (if available)
- **Dockerfile Path:** `backend/YouAndMeExpensesAPI/Dockerfile` (or leave blank if Dockerfile is in root directory)
- **Build Command:** (Leave blank - Docker handles this)
- **Start Command:** (Leave blank - Docker handles this)

**Note:** If you don't see a specific .NET option, Render will automatically detect it from your `YouAndMeExpensesAPI.csproj` file. Just make sure the Root Directory is set correctly.

#### Advanced Settings (click "Advanced"):
- **Auto-Deploy:** `Yes` (deploys on every push to main)
- **Health Check Path:** `/health`

### Step 1.5: Set Environment Variables

Click **"Environment"** tab and add these variables:

#### Core Configuration:
```bash
ASPNETCORE_ENVIRONMENT=Production
```

#### Database Connection:
```bash
ConnectionStrings__DefaultConnection=User Id=postgres.xxxxx;Password=YOUR_PASSWORD;Server=aws-0-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres
```

**How to get this:**
1. Go to Supabase Dashboard → Your Project
2. Go to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **"Connection pooling"** tab
5. Copy the connection string
6. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual database password

#### JWT Configuration:
```bash
JwtSettings__Secret=YOUR_64_CHARACTER_SECRET_KEY_HERE
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7
```

**Generate JWT Secret:**

**PowerShell (Windows):**
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
```

**Bash/Linux/Mac:**
```bash
openssl rand -base64 64
```

**Online:** https://generate-secret.vercel.app/64

#### Email Configuration (Gmail):
```bash
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__SenderName=Paire
EmailSettings__Username=your-email@gmail.com
EmailSettings__Password=xxxx xxxx xxxx xxxx
EmailSettings__EnableSsl=true
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable **2-Factor Authentication** (if not already enabled)
3. Go to **App Passwords**
4. Select **"Mail"** and **"Other (Custom name)"**
5. Enter name: "Paire API"
6. Click **Generate**
7. Copy the 16-character password (spaces don't matter)

#### CORS Configuration:
```bash
CORS_ORIGINS=https://YOUR_USERNAME.github.io
```

**Important:** 
- Use ONLY the domain, NO path
- Example: `https://alexkola94.github.io` (NOT `https://alexkola94.github.io/Paire`)

#### Frontend URL:
```bash
AppSettings__FrontendUrl=https://YOUR_USERNAME.github.io/Paire
```

**Important:**
- Use the FULL URL WITH path
- Example: `https://alexkola94.github.io/Paire`

### Step 1.6: Deploy

1. Scroll down and click **"Create Web Service"**
2. Render will start building your application
3. Wait for deployment to complete (usually 5-10 minutes)
4. You'll see build logs in real-time

### Step 1.7: Get Your Backend URL

1. Once deployment is complete, you'll see a URL like:
   - `https://paire-api.onrender.com`
2. **Copy this URL** - you'll need it for the frontend
3. Test the health endpoint:
   - Visit: `https://your-api.onrender.com/health`
   - Should return: `{"status":"healthy",...}`

### Step 1.8: Verify Backend is Working

1. **Test Health Endpoint:**
   ```bash
   curl https://your-api.onrender.com/health
   ```
   Should return JSON with status "healthy"

2. **Check Logs:**
   - In Render dashboard, click **"Logs"** tab
   - Look for any errors
   - Should see: "Now listening on: http://0.0.0.0:10000"

3. **Test API Endpoint:**
   - Visit: `https://your-api.onrender.com/api/system/health`
   - Should return API health status

---

## Part 2: Deploy Frontend to GitHub Pages

### Step 2.1: Prepare Frontend Environment

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Create `.env.production` file:**
   ```bash
   # Create the file
   touch .env.production  # Linux/Mac
   # OR
   New-Item .env.production  # Windows PowerShell
   ```

3. **Add backend API URL:**
   ```env
   VITE_BACKEND_API_URL=https://your-api.onrender.com
   ```
   Replace `your-api.onrender.com` with your actual Render URL from Step 1.7

4. **Verify `.gitignore` excludes `.env.production`:**
   - Check that `.env.production` is in `.gitignore`
   - This file should NOT be committed to Git

### Step 2.2: Update Vite Configuration (if needed)

Check `frontend/vite.config.js`:

```javascript
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Base path for GitHub Pages - should be '/Paire/' for production
  base: mode === 'production' ? '/Paire/' : '/',
  // ... rest of config
}))
```

**Important:** 
- If your GitHub repo is named differently, change `/Paire/` to match your repo name
- Example: If repo is `you-me-expenses`, use `/you-me-expenses/`

### Step 2.3: Test Production Build Locally

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Preview the build:**
   ```bash
   npm run preview
   ```

3. **Test in browser:**
   - Open `http://localhost:4173` (or the port shown)
   - Verify the app loads correctly
   - Check browser console for errors

4. **Fix any issues** before proceeding

### Step 2.4: Set Up GitHub Pages

#### Option A: Using GitHub Actions (Recommended)

1. **Create GitHub Actions workflow:**
   - Create directory: `.github/workflows/`
   ```bash
   mkdir -p .github/workflows
   ```

2. **Create deployment file:**
   Create `.github/workflows/deploy-pages.yml`:

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
             echo "VITE_BACKEND_API_URL=${{ secrets.VITE_BACKEND_API_URL }}" > .env.production
         
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

3. **Add GitHub Secret:**
   - Go to your GitHub repository
   - Click **Settings** → **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - Name: `VITE_BACKEND_API_URL`
   - Value: `https://your-api.onrender.com` (your Render URL)
   - Click **"Add secret"**

4. **Enable GitHub Pages:**
   - Go to **Settings** → **Pages**
   - Under **Source**, select **"GitHub Actions"**
   - Save

5. **Deploy:**
   ```bash
   git add .github/workflows/deploy-pages.yml
   git commit -m "Add GitHub Pages deployment workflow"
   git push origin main
   ```

6. **Monitor deployment:**
   - Go to **Actions** tab in GitHub
   - Watch the workflow run
   - Wait for completion (usually 3-5 minutes)

#### Option B: Using gh-pages Package (Alternative)

1. **Install gh-pages:**
   ```bash
   cd frontend
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   The `deploy` script should already exist:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Build and deploy:**
   ```bash
   npm run deploy
   ```

4. **Enable GitHub Pages:**
   - Go to GitHub repo → **Settings** → **Pages**
   - Source: **"Deploy from a branch"**
   - Branch: `gh-pages` / `/ (root)`
   - Click **Save**

### Step 2.5: Get Your Frontend URL

Once deployed, your site will be available at:
```
https://YOUR_USERNAME.github.io/Paire
```

Replace:
- `YOUR_USERNAME` with your GitHub username
- `Paire` with your repository name (if different)

---

## Part 3: Connect Frontend to Backend

### Step 3.1: Update Backend CORS (if needed)

1. Go back to Render.com dashboard
2. Navigate to your web service
3. Go to **Environment** tab
4. Verify `CORS_ORIGINS` is set correctly:
   ```bash
   CORS_ORIGINS=https://YOUR_USERNAME.github.io
   ```
   - Use ONLY the domain (no path)
   - Example: `https://alexkola94.github.io`

5. **Redeploy** if you changed it:
   - Click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 3.2: Update Frontend Environment Variable

1. **If using GitHub Actions:**
   - Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
   - Edit `VITE_BACKEND_API_URL` secret
   - Update value to your Render URL: `https://your-api.onrender.com`
   - Trigger a new deployment (push a commit or manually run workflow)

2. **If using gh-pages:**
   - Update `frontend/.env.production`:
     ```env
     VITE_BACKEND_API_URL=https://your-api.onrender.com
     ```
   - Rebuild and redeploy:
     ```bash
     cd frontend
     npm run build
     npm run deploy
     ```

### Step 3.3: Verify Connection

1. **Open your GitHub Pages site:**
   - Visit: `https://YOUR_USERNAME.github.io/Paire`

2. **Open browser Developer Tools:**
   - Press `F12` or right-click → **Inspect**
   - Go to **Console** tab

3. **Test API connection:**
   - Try to register/login
   - Check console for any CORS errors
   - Check **Network** tab for API calls

4. **Expected behavior:**
   - ✅ No CORS errors in console
   - ✅ API calls return 200/201 status
   - ✅ App functions normally

---

## Part 4: Configure Supabase

### Step 4.1: Update Supabase Auth URLs

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Authentication** → **URL Configuration**

4. **Update Site URL:**
   ```
   https://YOUR_USERNAME.github.io/Paire
   ```

5. **Add Redirect URLs:**
   - Click **"Add URL"**
   - Add: `https://YOUR_USERNAME.github.io/Paire/**`
   - Add: `https://YOUR_USERNAME.github.io/Paire`
   - Click **"Save"**

### Step 4.2: Verify Row Level Security (RLS)

1. Go to **Table Editor** in Supabase
2. For each table, verify:
   - RLS is **Enabled**
   - Policies are configured correctly

3. **Test RLS:**
   - Try creating a record from your deployed app
   - Verify it only shows for the correct user

### Step 4.3: Verify Storage Bucket (if using receipts)

1. Go to **Storage** in Supabase
2. Verify `receipts` bucket exists
3. Check policies are set:
   - Users can upload
   - Users can view their own files
   - Users can delete their own files

---

## Part 5: Testing & Verification

### Step 5.1: Frontend Tests

Test these features on your deployed site:

- [ ] **Homepage loads** without errors
- [ ] **Registration** works
- [ ] **Email verification** link works
- [ ] **Login** works
- [ ] **Dashboard** loads with data
- [ ] **Add expense** works
- [ ] **Add income** works
- [ ] **View transactions** works
- [ ] **Language switching** works
- [ ] **Logout** works

### Step 5.2: Backend Tests

Test API endpoints:

1. **Health Check:**
   ```bash
   curl https://your-api.onrender.com/health
   ```

2. **API Health:**
   ```bash
   curl https://your-api.onrender.com/api/system/health
   ```

3. **Test from browser console:**
   ```javascript
   fetch('https://your-api.onrender.com/health')
     .then(r => r.json())
     .then(console.log)
   ```

### Step 5.3: Integration Tests

1. **Register a new user** from deployed frontend
2. **Verify email** (check your email)
3. **Login** with the new account
4. **Add a transaction**
5. **Verify it appears** in the dashboard
6. **Check Supabase** to verify data is stored

### Step 5.4: Performance Check

1. **Page Load Time:**
   - Open DevTools → **Network** tab
   - Reload page
   - Check load time (should be < 3 seconds)

2. **API Response Time:**
   - Check **Network** tab for API calls
   - Response times should be < 1 second

---

## Troubleshooting

### Backend Issues

#### ❌ No .NET Runtime Option Available

**Problem:** Render.com doesn't show ".NET" in the runtime dropdown

**Solutions:**
1. **Render auto-detects .NET** - You don't need to select a specific runtime
2. Just set the **Root Directory** to: `backend/YouAndMeExpensesAPI`
3. Render will automatically detect .NET 7.0 from your `.csproj` file
4. If you see "Docker" option, you can select it (Dockerfile will be used)
5. If auto-detection fails, ensure:
   - Root Directory points to the folder containing `.csproj` file
   - The `.csproj` file is named correctly
   - Check build logs for detection messages

#### ❌ Build Fails on Render

**Problem:** Build command fails

**Solutions:**
1. Check build logs in Render dashboard
2. Verify `Root Directory` is correct: `backend/YouAndMeExpensesAPI`
3. Verify build command:
   ```
   dotnet restore && dotnet publish -c Release -o ./publish
   ```
4. Verify start command:
   ```
   dotnet ./publish/YouAndMeExpensesAPI.dll
   ```
5. If using Docker, verify Dockerfile exists and is correct

#### ❌ Application Crashes on Start

**Problem:** Service shows "Unhealthy" status

**Solutions:**
1. Check logs in Render dashboard
2. Verify all environment variables are set
3. Check database connection string is correct
4. Verify JWT secret is set
5. Check health endpoint: `/health`

#### ❌ Database Connection Failed

**Problem:** "Database connection string is missing"

**Solutions:**
1. Verify `ConnectionStrings__DefaultConnection` is set
2. Check connection string format is correct
3. Verify database password is correct
4. Check Supabase project is not paused

#### ❌ CORS Errors

**Problem:** Frontend can't connect to backend

**Solutions:**
1. Verify `CORS_ORIGINS` in Render environment variables
2. Use ONLY domain (no path): `https://username.github.io`
3. Redeploy backend after changing CORS
4. Check browser console for exact error

### Frontend Issues

#### ❌ Build Fails on GitHub Actions

**Problem:** Workflow fails during build

**Solutions:**
1. Check Actions tab for error logs
2. Verify Node.js version (should be 18+)
3. Check `VITE_BACKEND_API_URL` secret is set
4. Verify `vite.config.js` base path matches repo name

#### ❌ 404 on Page Refresh

**Problem:** Pages show 404 when refreshing

**Solutions:**
1. Verify `404.html` exists in `frontend/public/`
2. If not, create it (copy of `index.html`)
3. Redeploy frontend

#### ❌ API Calls Fail

**Problem:** Frontend can't reach backend

**Solutions:**
1. Verify `VITE_BACKEND_API_URL` is set correctly
2. Check backend is running (visit health endpoint)
3. Verify CORS is configured correctly
4. Check browser console for errors

#### ❌ Assets Not Loading

**Problem:** Images/styles not loading

**Solutions:**
1. Verify `base` path in `vite.config.js` matches repo name
2. Check asset paths in code (should be relative)
3. Rebuild and redeploy

### General Issues

#### ❌ Email Not Sending

**Problem:** Verification emails not received

**Solutions:**
1. Verify Gmail app password is correct
2. Check 2FA is enabled on Gmail account
3. Check Render logs for email errors
4. Verify `EmailSettings__*` variables are set

#### ❌ Authentication Not Working

**Problem:** Can't login/register

**Solutions:**
1. Verify Supabase Auth URLs are configured
2. Check Supabase anon key is correct
3. Verify RLS policies are enabled
4. Check browser console for errors

---

## 🎉 Success Checklist

Once everything is working, you should have:

- ✅ Backend API running on Render.com
- ✅ Frontend deployed to GitHub Pages
- ✅ Frontend can communicate with backend
- ✅ No CORS errors
- ✅ Authentication working
- ✅ Database operations working
- ✅ Email notifications working (if configured)

---

## 📝 Important Notes

### Render.com Free Tier Limitations

- **Spins down after 15 minutes** of inactivity
- **First request after spin-down** takes ~30 seconds (cold start)
- **Consider upgrading** to paid plan for production use

### GitHub Pages Limitations

- **Public repositories only** (for free tier)
- **Build time limits** (usually not an issue)
- **Bandwidth limits** (generous for most apps)

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

## 📚 Additional Resources

- [Render.com Documentation](https://render.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

## 🆘 Need Help?

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review **Render logs** for backend issues
3. Review **GitHub Actions logs** for frontend issues
4. Check **browser console** for frontend errors
5. Verify all environment variables are set correctly

---

**Last Updated:** December 2025  
**Status:** Complete deployment guide for Render.com + GitHub Pages

