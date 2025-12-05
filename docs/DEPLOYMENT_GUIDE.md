# 🚀 Complete Deployment Guide
## Paire - Expense Tracking App

This guide walks you through deploying your API on **Render.com** and your frontend on **GitHub Pages**.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Backend API Deployment (Render.com)](#part-1-backend-api-deployment-rendercom)
3. [Part 2: Frontend Deployment (GitHub Pages)](#part-2-frontend-deployment-github-pages)
4. [Part 3: Post-Deployment Configuration](#part-3-post-deployment-configuration)
5. [Testing & Verification](#testing--verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have:

- ✅ GitHub account (for GitHub Pages)
- ✅ Render.com account (sign up at https://render.com - free)
- ✅ Your code pushed to a GitHub repository
- ✅ PostgreSQL database (you already have Supabase)
- ✅ SMTP credentials for email (you already have Gmail setup)
- ✅ Git installed on your computer
- ✅ Node.js and npm installed

---

## Part 1: Backend API Deployment (Render.com)

### Step 1.1: Prepare Your Backend

#### 1.1.1: Create Production Configuration File

Create a new file `appsettings.Production.json` in your backend folder:

**⚠️ IMPORTANT: This file should NOT contain sensitive data - we'll use environment variables**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

#### 1.1.2: Update CORS Configuration

Your `Program.cs` already has CORS configured. We'll update it to use an environment variable:

We need to modify the CORS policy to read from environment variables.

#### 1.1.3: Create a `.gitignore` Entry

Make sure your `.gitignore` includes:

```
appsettings.json
appsettings.Development.json
*.user
.vs/
bin/
obj/
```

This prevents sensitive credentials from being pushed to GitHub.

#### 1.1.4: Verify Your Backend Builds

Open a terminal in your backend folder and run:

```bash
cd backend/YouAndMeExpensesAPI
dotnet build -c Release
```

Make sure there are no errors.

---

### Step 1.2: Push Your Code to GitHub

If you haven't already:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for deployment"

# Create a repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub details.**

---

### Step 1.3: Deploy to Render.com

#### 1.3.1: Sign Up / Sign In to Render

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with GitHub (recommended) or email

#### 1.3.2: Create a New Web Service

1. Click **"New +"** button in the top right
2. Select **"Web Service"**
3. Connect your GitHub account if not already connected
4. Find and select your repository: `YOUR_USERNAME/YOUR_REPO_NAME`
5. Click **"Connect"**

#### 1.3.3: Configure the Web Service

Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `paire-api` (or any name you prefer) |
| **Region** | Choose closest to you (e.g., Frankfurt for Europe) |
| **Branch** | `main` |
| **Root Directory** | `backend/YouAndMeExpensesAPI` |
| **Runtime** | `Docker` (or `.NET`) |
| **Build Command** | `dotnet restore && dotnet build -c Release` |
| **Start Command** | `dotnet run --project YouAndMeExpensesAPI.csproj --urls "http://0.0.0.0:$PORT"` |
| **Instance Type** | **Free** |

#### 1.3.4: Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|-----|-------|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Sets environment |
| `ConnectionStrings__DefaultConnection` | `User Id=postgres.sirgeoifiuevsdrjwfwq;Password=Alexiskola1994@;Server=aws-1-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres` | Your Supabase DB |
| `JwtSettings__Secret` | `YourSuperSecretKeyThatShouldBeAtLeast32CharactersLongForSecurity12345` | JWT secret key |
| `JwtSettings__Issuer` | `PaireAPI` | JWT issuer |
| `JwtSettings__Audience` | `PaireApp` | JWT audience |
| `JwtSettings__ExpirationMinutes` | `60` | Token expiration |
| `JwtSettings__RefreshTokenExpirationDays` | `7` | Refresh token expiration |
| `EmailSettings__SmtpServer` | `smtp.gmail.com` | SMTP server |
| `EmailSettings__SmtpPort` | `587` | SMTP port |
| `EmailSettings__SenderEmail` | `alexisdaywalker1994@gmail.com` | Your email |
| `EmailSettings__SenderName` | `Paire` | Sender name |
| `EmailSettings__Username` | `alexisdaywalker1994@gmail.com` | SMTP username |
| `EmailSettings__Password` | `jqyy mtzm wfjz tkxw` | Your Gmail app password |
| `EmailSettings__EnableSsl` | `true` | Enable SSL |
| `AppSettings__FrontendUrl` | (Leave empty for now - we'll update this later) | Frontend URL |
| `CORS_ORIGINS` | (Leave empty for now - we'll update this later) | CORS origins |

**⚠️ SECURITY NOTE:** After successful deployment, change these secrets to more secure values!

#### 1.3.5: Deploy

1. Click **"Create Web Service"**
2. Render will now:
   - Clone your repository
   - Build your application
   - Deploy it
   - Assign a URL like: `https://paire-api.onrender.com`

This process takes 5-10 minutes. Watch the logs for any errors.

#### 1.3.6: Note Your API URL

Once deployed, you'll see your API URL at the top. It will look like:

```
https://paire-api.onrender.com
```

**Copy this URL - you'll need it for the frontend!**

#### 1.3.7: Test Your API

Open a browser and visit:

```
https://paire-api.onrender.com/health
```

You should see a JSON response like:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T10:30:00Z",
  "version": "1.0.0",
  ...
}
```

---

## Part 2: Frontend Deployment (GitHub Pages)

### Step 2.1: Prepare Your Frontend

#### 2.1.1: Create Environment Configuration

Create a `.env.production` file in your `frontend` folder:

```env
# Production API URL
VITE_BACKEND_API_URL=https://paire-api.onrender.com
```

**Replace with your actual Render.com API URL from Step 1.3.6**

#### 2.1.2: Update `vite.config.js`

Update your Vite config to support GitHub Pages:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Paire/', // Replace with your repo name
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Optimize for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
      ]
    }
  }
})
```

**⚠️ IMPORTANT:** Replace `/You-me-Expenses/` with your actual GitHub repository name.

#### 2.1.3: Install gh-pages Package

Open terminal in your frontend folder:

```bash
cd frontend
npm install --save-dev gh-pages
```

#### 2.1.4: Update `package.json`

Add deployment scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext js,jsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,css,json}\""
  },
  "homepage": "https://YOUR_USERNAME.github.io/Paire"
}
```

**Replace:**
- `YOUR_USERNAME` with your GitHub username
- `You-me-Expenses` with your repository name

#### 2.1.5: Create 404.html for SPA Routing

GitHub Pages doesn't support SPA routing by default. Create `frontend/public/404.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>You & Me Expenses</title>
  <script>
    // Redirect to index.html with path as query parameter
    const path = window.location.pathname.slice(1);
    window.location.replace(
      window.location.origin + 
      '/You-me-Expenses/?redirect=' + 
      encodeURIComponent(path)
    );
  </script>
</head>
<body></body>
</html>
```

**Replace `/You-me-Expenses/` with your repo name**

#### 2.1.6: Update Router Configuration

Update your `frontend/src/App.jsx` to handle the redirect:

Add this code at the beginning of your App component:

```javascript
// Handle redirect from 404.html
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirect = urlParams.get('redirect');
  if (redirect) {
    navigate(redirect, { replace: true });
  }
}, [navigate]);
```

---

### Step 2.2: Build and Test Locally

Before deploying, test your build locally:

```bash
cd frontend

# Create production build
npm run build

# Preview the build
npm run preview
```

Visit `http://localhost:4173` and test your app.

---

### Step 2.3: Deploy to GitHub Pages

#### 2.3.1: Commit Your Changes

```bash
# From project root
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

#### 2.3.2: Deploy

```bash
cd frontend
npm run deploy
```

This will:
1. Build your app
2. Create a `gh-pages` branch
3. Push the built files to GitHub

#### 2.3.3: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** tab
3. Scroll to **Pages** section (left sidebar)
4. Under **Source**, select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Click **Save**

#### 2.3.4: Wait for Deployment

GitHub will deploy your site. This takes 2-5 minutes.

Your site will be available at:
```
https://YOUR_USERNAME.github.io/You-me-Expenses/
```

---

## Part 3: Post-Deployment Configuration

### Step 3.1: Update Backend CORS

Now that you have your frontend URL, update the API's CORS configuration:

1. Go to Render Dashboard
2. Select your API service
3. Go to **Environment** tab
4. Update the `CORS_ORIGINS` variable:

```
https://YOUR_USERNAME.github.io
```

**Don't include the repository path, just the domain.**

5. Update `AppSettings__FrontendUrl`:

```
https://YOUR_USERNAME.github.io/You-me-Expenses
```

6. Click **Save Changes**

Render will automatically redeploy your API.

### Step 3.2: Update Program.cs CORS (One-time code change)

We need to modify your `Program.cs` to read CORS origins from environment variables:

Update the CORS configuration section to:

```csharp
// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Get CORS origins from environment variable or use defaults
        var corsOrigins = builder.Configuration["CORS_ORIGINS"]?.Split(',')
            ?? new[]
            {
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002"
            };

        policy.WithOrigins(corsOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});
```

Then commit and push:

```bash
git add .
git commit -m "Update CORS to use environment variables"
git push origin main
```

Render will automatically redeploy.

---

## Testing & Verification

### ✅ Backend Health Check

```bash
curl https://paire-api.onrender.com/health
```

Should return healthy status.

### ✅ Frontend Loading

Visit your GitHub Pages URL and check:
- [ ] Page loads without errors
- [ ] Login/Register pages work
- [ ] Console shows no CORS errors

### ✅ API Connection Test

1. Open your frontend
2. Open browser DevTools (F12)
3. Try to register/login
4. Check Network tab for API calls
5. Verify API responses

---

## Troubleshooting

### Issue: API Returns 500 Error

**Solution:** Check Render logs:
1. Go to Render Dashboard
2. Select your service
3. Click **Logs** tab
4. Look for error messages

Common causes:
- Database connection string incorrect
- Missing environment variables
- Migration not applied

### Issue: CORS Error in Frontend

**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:**
1. Verify `CORS_ORIGINS` environment variable in Render
2. Make sure it matches your GitHub Pages URL (without path)
3. Redeploy the API

### Issue: Frontend Shows White Screen

**Solution:**
1. Check browser console for errors
2. Verify `base` in `vite.config.js` matches your repo name
3. Verify API URL in `.env.production`

### Issue: Routes Return 404 on GitHub Pages

**Solution:**
1. Verify `404.html` is in `frontend/public/`
2. Check redirect logic in `App.jsx`
3. Ensure `BrowserRouter` has correct `basename`

### Issue: Render API Sleeping (Cold Starts)

**Symptom:** First request takes 30+ seconds

**Solution:** This is normal for free tier. Options:
1. Accept cold starts (free)
2. Upgrade to paid plan ($7/month - keeps instance awake)
3. Use a service like UptimeRobot to ping your API every 10 minutes

---

## 🎉 Deployment Complete!

Your app is now live:

- **Frontend:** https://YOUR_USERNAME.github.io/Paire/
- **API:** https://paire-api.onrender.com
- **API Docs:** https://paire-api.onrender.com/swagger

---

## Next Steps

### Security Enhancements
- [ ] Change JWT secret to a strong random value
- [ ] Use environment-specific secrets
- [ ] Enable HTTPS only (Render already provides SSL)
- [ ] Set up rate limiting
- [ ] Configure proper logging

### Monitoring
- [ ] Set up Render monitoring/alerts
- [ ] Use UptimeRobot for uptime monitoring
- [ ] Monitor error logs regularly

### Database Backups
- [ ] Enable automatic backups in Supabase
- [ ] Export database periodically
- [ ] Test restore procedures

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [ASP.NET Core Deployment](https://docs.microsoft.com/aspnet/core/host-and-deploy/)

---

## 💡 Tips

1. **Free Tier Limitations:**
   - Render free tier sleeps after 15 minutes of inactivity
   - You get 750 hours/month of runtime
   - First request after sleep takes ~30 seconds

2. **Updating Your App:**
   - **Backend:** Just push to `main` branch - Render auto-deploys
   - **Frontend:** Run `npm run deploy` from frontend folder

3. **Environment Variables:**
   - Never commit secrets to Git
   - Use Render's environment variables for backend
   - Use `.env.production` (gitignored) for frontend

4. **Debugging:**
   - Check Render logs for backend issues
   - Check browser console for frontend issues
   - Use `/health` endpoint to verify API status

---

**Need help?** Check the troubleshooting section or open an issue in your repository.

Good luck! 🚀

