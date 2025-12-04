# Deployment Guide

Complete guide for deploying You & Me Expenses application.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Supabase Setup](#supabase-setup)
- [Frontend Deployment (GitHub Pages)](#frontend-deployment-github-pages)
- [Backend Deployment (Optional)](#backend-deployment-optional)
- [Environment Configuration](#environment-configuration)
- [Post-Deployment](#post-deployment)

## Prerequisites

- GitHub account
- Supabase account (free tier available)
- Node.js 18+ and npm
- Git installed locally

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in project details:
   - Name: `you-me-expenses`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your location
4. Wait for project to be created (~2 minutes)

### 2. Setup Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the entire contents of `supabase/schema.sql`
3. Paste into SQL Editor and click **Run**
4. Verify tables are created in **Database** > **Tables**

### 3. Create Storage Bucket

1. Navigate to **Storage** in sidebar
2. Click **New Bucket**
3. Name: `receipts`
4. Make it **Public**
5. Click **Create**

### 4. Configure Storage Policies

In **Storage** > **Policies** for the `receipts` bucket:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow users to view
CREATE POLICY "Users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- Allow users to delete
CREATE POLICY "Users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
```

### 5. Get API Credentials

1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Frontend Deployment (GitHub Pages)

### 1. Prepare Repository

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: You & Me Expenses"

# Create GitHub repository and push
gh repo create you-me-expenses --public --source=. --remote=origin --push
# OR manually create on GitHub and push:
git remote add origin https://github.com/YOUR_USERNAME/you-me-expenses.git
git branch -M main
git push -u origin main
```

### 2. Configure Environment Variables

Create `frontend/.env.production`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**⚠️ IMPORTANT:** Add `.env.production` to `.gitignore` to avoid exposing credentials!

### 3. Update Vite Configuration

Edit `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/you-me-expenses/', // Replace with your repo name
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

### 4. Add GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

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
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: ./frontend
        run: npm install
        
      - name: Create .env file
        working-directory: ./frontend
        run: |
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" > .env.production
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env.production
          
      - name: Build
        working-directory: ./frontend
        run: npm run build
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
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
        uses: actions/deploy-pages@v2
```

### 5. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add these secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

### 6. Enable GitHub Pages

1. Go to **Settings** > **Pages**
2. Source: **GitHub Actions**
3. Save

### 7. Deploy

```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

The GitHub Action will automatically build and deploy your site!

Your app will be available at: `https://YOUR_USERNAME.github.io/you-me-expenses/`

## Backend Deployment (Optional)

The backend is optional since the app works directly with Supabase. If you want to deploy it:

### Option 1: Railway

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Select the `backend` directory
4. Add environment variables from `appsettings.json`
5. Deploy!

### Option 2: Azure App Service

```bash
# Install Azure CLI
az login

# Create resource group
az group create --name YouMeExpensesRG --location eastus

# Create app service plan
az appservice plan create --name YouMeExpensesPlan --resource-group YouMeExpensesRG --sku B1 --is-linux

# Create web app
az webapp create --resource-group YouMeExpensesRG --plan YouMeExpensesPlan --name youme-expenses-api --runtime "DOTNET|8.0"

# Deploy
cd backend
dotnet publish -c Release
cd bin/Release/net8.0/publish
zip -r deploy.zip .
az webapp deploy --resource-group YouMeExpensesRG --name youme-expenses-api --src-path deploy.zip
```

### Option 3: Docker + Any Cloud

```dockerfile
# Create Dockerfile in backend/
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["YouAndMeExpenses.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet build -c Release -o /app/build

FROM build AS publish
RUN dotnet publish -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "YouAndMeExpenses.dll"]
```

```bash
docker build -t youme-expenses-api .
docker run -p 5000:80 youme-expenses-api
```

## Environment Configuration

### Development

Create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:5000/api
```

### Production

Set via GitHub Secrets (for GitHub Actions) or your hosting platform's environment variables.

## Post-Deployment

### 1. Test Your Deployment

1. Visit your deployed URL
2. Sign up with a test account
3. Test all features:
   - Add expense
   - Add income
   - Create loan
   - Upload receipt
   - Change language
   - Change password

### 2. Configure Supabase Auth URLs

In Supabase Dashboard > **Authentication** > **URL Configuration**:

- Site URL: `https://YOUR_USERNAME.github.io/you-me-expenses/`
- Redirect URLs: Add your deployment URL

### 3. Monitor and Maintain

- **Supabase**: Monitor database usage in dashboard
- **GitHub Pages**: Check Actions tab for deployment status
- **Logs**: Check browser console for any errors

### 4. Custom Domain (Optional)

To use a custom domain:

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. In GitHub repo **Settings** > **Pages**:
   - Add custom domain
3. Update DNS records:
   - Add CNAME record pointing to `YOUR_USERNAME.github.io`
4. Wait for SSL certificate to provision

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Ensure all dependencies are in package.json
- Check GitHub Actions logs

### Auth Not Working
- Verify Supabase credentials are correct
- Check Supabase Auth URL configuration
- Ensure RLS policies are enabled

### Receipts Upload Fails
- Verify storage bucket is public
- Check storage policies are configured
- Ensure bucket name is 'receipts'

### 404 on Refresh
Add `404.html` in frontend/public (copy of index.html) for client-side routing on GitHub Pages.

## Security Checklist

- ✅ Supabase anon key stored in GitHub Secrets
- ✅ RLS policies enabled on all tables
- ✅ Storage policies configured
- ✅ HTTPS enabled (automatic with GitHub Pages)
- ✅ No sensitive data in repository
- ✅ .env files in .gitignore

## Need Help?

- Supabase Issues: [supabase.com/docs](https://supabase.com/docs)
- GitHub Pages: [docs.github.com/pages](https://docs.github.com/pages)
- React + Vite: [vitejs.dev](https://vitejs.dev)

🎉 Congratulations! Your app is now live!

