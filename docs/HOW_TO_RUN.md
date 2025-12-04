# 🚀 How to Run and Test the Project

Complete step-by-step guide to get You & Me Expenses running and test it.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Running the Frontend](#running-the-frontend)
5. [Testing the Frontend](#testing-the-frontend)
6. [Running the Backend (Optional)](#running-the-backend-optional)
7. [Testing the Backend](#testing-the-backend)
8. [Troubleshooting](#troubleshooting)
9. [Quick Reference](#quick-reference)

---

## 📦 Prerequisites

### Required Software

#### 1. Node.js 18+ and npm
**Check if installed:**
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

**If not installed:**
- Download from [nodejs.org](https://nodejs.org/)
- Choose "LTS" (Long Term Support) version
- Install with default settings
- Restart your terminal after installation

#### 2. Git (Optional but recommended)
**Check if installed:**
```bash
git --version
```

**If not installed:**
- Download from [git-scm.com](https://git-scm.com/)
- Install with default settings

#### 3. .NET 8 SDK (Only if running backend)
**Check if installed:**
```bash
dotnet --version   # Should show 8.0.x
```

**If not installed:**
- Download from [dotnet.microsoft.com/download](https://dotnet.microsoft.com/download/dotnet/8.0)
- Choose SDK (not Runtime)
- Install and restart terminal

### Required Accounts

#### 1. Supabase Account (Free)
- Go to [supabase.com](https://supabase.com)
- Click "Start your project"
- Sign up with GitHub or email

---

## 🔧 Initial Setup

### Step 1: Get the Project Files

**Option A: If using Git**
```bash
git clone https://github.com/YOUR_USERNAME/you-me-expenses.git
cd you-me-expenses
```

**Option B: If you have the files**
```bash
cd You&me_Expenses
```

### Step 2: Verify Project Structure

You should see these folders:
```
You&me_Expenses/
├── frontend/      ← React application
├── backend/       ← .NET API (optional)
├── supabase/      ← Database schema
└── README.md
```

---

## 🗄️ Supabase Configuration

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in details:
   - **Name**: `you-me-expenses` (or any name)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your location
4. Click **"Create new project"**
5. ⏱️ Wait 2-3 minutes for setup to complete

### Step 2: Setup Database Schema

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. On your computer, open file: `supabase/schema.sql`
3. Copy **ALL** content from the file
4. Paste into Supabase SQL Editor
5. Click **"Run"** (or press `Ctrl/Cmd + Enter`)
6. Wait for "Success" message

**Verify:** Go to **Database** → **Tables**  
You should see: `transactions` and `loans` tables

### Step 3: Create Storage Bucket

1. Click **"Storage"** (left sidebar)
2. Click **"New Bucket"**
3. Enter name: `receipts`
4. Toggle **"Public bucket"** to ON
5. Click **"Create bucket"**

### Step 4: Configure Storage Policies

1. Click on the `receipts` bucket
2. Click **"Policies"** tab
3. Click **"New Policy"**
4. Choose **"For full customization"**
5. Add these three policies:

**Policy 1: Allow Upload**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');
```

**Policy 2: Allow View**
```sql
CREATE POLICY "Users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');
```

**Policy 3: Allow Delete**
```sql
CREATE POLICY "Users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
```

### Step 5: Get Your API Keys

1. Click **"Settings"** (left sidebar, bottom)
2. Click **"API"**
3. Copy these two values:

**Project URL:**
```
https://xxxxxxxxxxxxx.supabase.co
```

**anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M... (long string)
```

⚠️ **IMPORTANT:** Keep these safe! You'll need them in the next step.

---

## 🌐 Running the Frontend

### Step 1: Navigate to Frontend

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

⏱️ This will take 1-2 minutes. You'll see a progress bar.

**Expected output:**
```
added 234 packages, and audited 235 packages in 45s
```

### Step 3: Create Environment File

**Windows (PowerShell):**
```powershell
New-Item -Path .env -ItemType File
```

**Mac/Linux:**
```bash
touch .env
```

**Or:** Simply create a new file named `.env` in the `frontend` folder using your text editor.

### Step 4: Configure Environment Variables

Open `frontend/.env` in any text editor and add:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Replace** with YOUR actual values from Supabase Step 5!

**Important:**
- No spaces around `=`
- No quotes needed
- Must start with `VITE_`
- Save the file

### Step 5: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.0.8  ready in 324 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### Step 6: Open in Browser

The app should automatically open at: `http://localhost:3000`

If not, manually open your browser and go to:
```
http://localhost:3000
```

### Step 7: Test the Application

#### 7.1 Create Account
1. Click **"Sign Up"**
2. Enter email and password (min 6 characters)
3. Click **"Sign Up"**
4. Check your email for confirmation link
5. Click the confirmation link

#### 7.2 Log In
1. Return to `http://localhost:3000`
2. Click **"Login"**
3. Enter your email and password
4. Click **"Login"**
5. You should see the Dashboard!

#### 7.3 Test Features

**Add an Expense:**
1. Click **"Expenses"** in navigation
2. Click **"Add Expense"**
3. Fill in:
   - Amount: `50`
   - Category: `Food & Dining`
   - Description: `Groceries`
   - Date: Today
4. Click **"Save"**
5. You should see your expense in the list!

**Add an Income:**
1. Click **"Income"** in navigation
2. Click **"Add Income"**
3. Fill in details
4. Click **"Save"**

**Create a Loan:**
1. Click **"Loans"** in navigation
2. Click **"Add Loan"**
3. Fill in details
4. Click **"Save"**

**Upload a Receipt:**
1. Add an expense
2. Click **"Upload Receipt"**
3. Choose an image file
4. Click **"Save"**

**Change Language:**
1. Click **"Profile"** in navigation
2. Choose a different language (English/Spanish/French)
3. See the interface change!

**View Dashboard:**
1. Click **"Dashboard"**
2. See your financial summary
3. View recent transactions

### Step 8: Stop the Server

When you're done testing:
- Press `Ctrl + C` in the terminal
- Or close the terminal window

---

## 🧪 Testing the Frontend

### Step 1: Navigate to Frontend (if not already there)

```bash
cd frontend
```

### Step 2: Run Tests

```bash
npm test
```

**Expected output:**
```
✓ src/tests/components/ErrorBoundary.test.jsx
✓ src/tests/components/Toast.test.jsx
✓ src/tests/services/api.test.js
✓ src/tests/utils/formatCurrency.test.js

Test Files  4 passed (4)
     Tests  Passed
```

### Step 3: Run Tests in Watch Mode

```bash
npm test -- --watch
```

This will re-run tests automatically when you change files.

**To exit:** Press `q`

### Step 4: Generate Coverage Report

```bash
npm run test:coverage
```

**Output shows:**
```
Coverage Summary:
Statements   : 82.5%
Branches     : 75.3%
Functions    : 85.2%
Lines        : 82.1%
```

**View detailed report:**
- Open `frontend/coverage/index.html` in your browser

### Step 5: Run Tests with UI

```bash
npm run test:ui
```

Opens a visual test interface in your browser at `http://localhost:51204`

---

## 🔧 Running the Backend (Optional)

> **Note:** The backend is OPTIONAL! The app works perfectly without it using Supabase directly.

### Step 1: Navigate to Backend

```bash
cd backend
```

### Step 2: Restore Dependencies

```bash
dotnet restore
```

**Expected output:**
```
Determining projects to restore...
Restored backend\YouAndMeExpenses.csproj (in 2.3 sec).
```

### Step 3: Build the Project

```bash
dotnet build
```

**Expected output:**
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

### Step 4: Run the API

```bash
dotnet run
```

**Or with hot reload:**
```bash
dotnet watch run
```

**Expected output:**
```
Building...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

### Step 5: Test the API

**Open in browser:**
```
http://localhost:5000
```

You should see Swagger UI with API documentation.

**Test health endpoint:**
```
http://localhost:5000/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-03T...",
  "version": "1.0.0"
}
```

### Step 6: Stop the Server

Press `Ctrl + C` in the terminal

---

## 🧪 Testing the Backend

### Step 1: Navigate to Backend (if not already there)

```bash
cd backend
```

### Step 2: Run Tests

```bash
dotnet test
```

**Expected output:**
```
Starting test execution, please wait...

Passed!  - Tests completed successfully
```

### Step 3: Run Tests with Detailed Output

```bash
dotnet test --verbosity detailed
```

Shows each test as it runs.

### Step 4: Run Tests in Watch Mode

```bash
dotnet watch test
```

Re-runs tests automatically when you change files.

**To exit:** Press `Ctrl + C`

### Step 5: Generate Coverage Report

```bash
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover
```

**Output shows:**
```
| Module              | Line   | Branch | Method |
|---------------------|--------|--------|--------|
| YouAndMeExpenses    | 82.5%  | 75%    | 85%    |
```

### Step 6: Generate HTML Coverage Report

```bash
# Install report generator (one time only)
dotnet tool install -g dotnet-reportgenerator-globaltool

# Generate coverage data
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura

# Generate HTML report
reportgenerator -reports:"coverage.cobertura.xml" -targetdir:"coveragereport" -reporttypes:Html
```

**View report:**
- Open `backend/coveragereport/index.html` in your browser

---

## 🐛 Troubleshooting

### Common Issues

#### ❌ "npm: command not found"
**Problem:** Node.js not installed  
**Solution:** Install Node.js from [nodejs.org](https://nodejs.org/)

#### ❌ "Port 3000 is already in use"
**Problem:** Another app is using port 3000  
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- --port 3001
```

#### ❌ "dotnet: command not found"
**Problem:** .NET not installed  
**Solution:** Install .NET 8 SDK from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0)

#### ❌ "Cannot connect to Supabase"
**Problem:** Wrong credentials in .env  
**Solution:**
1. Check `.env` file has correct values
2. No spaces around `=`
3. Values match Supabase dashboard
4. Restart dev server after changing .env

#### ❌ "Module not found" errors
**Problem:** Dependencies not installed  
**Solution:**
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
dotnet clean
dotnet restore
```

#### ❌ Email confirmation not received
**Problem:** Email in spam or Supabase email limits  
**Solution:**
1. Check spam folder
2. Wait 5 minutes
3. Check Supabase logs
4. Try different email

#### ❌ Tests failing
**Problem:** Test environment issue  
**Solution:**
```bash
# Frontend
cd frontend
npm install
npm test

# Backend
cd backend
dotnet clean
dotnet build
dotnet test
```

#### ❌ "Access denied" or permission errors
**Problem:** File permissions  
**Solution:**
```bash
# Mac/Linux - run with sudo
sudo npm install

# Or fix permissions
sudo chown -R $USER:$USER .
```

---

## 📝 Quick Reference

### Frontend Commands

```bash
cd frontend

# Setup
npm install                    # Install dependencies
cp .env.example .env          # Create env file (edit after)

# Development
npm run dev                   # Start dev server
npm run build                 # Build for production
npm run preview               # Preview production build

# Testing
npm test                      # Run tests once
npm test -- --watch           # Run tests in watch mode
npm run test:ui               # Open test UI
npm run test:coverage         # Generate coverage

# Code Quality
npm run lint                  # Check code
npm run lint:fix              # Fix issues
npm run format                # Format code
npm run format:check          # Check formatting
```

### Backend Commands

```bash
cd backend

# Setup
dotnet restore                # Install dependencies
dotnet build                  # Build project

# Development
dotnet run                    # Start API
dotnet watch run              # Start with hot reload

# Testing
dotnet test                   # Run tests once
dotnet watch test             # Run tests in watch mode
dotnet test --verbosity detailed  # Detailed output
dotnet test /p:CollectCoverage=true  # With coverage
```

### URLs

```
Frontend:     http://localhost:3000
Backend API:  http://localhost:5000
Swagger UI:   http://localhost:5000/swagger
Test UI:      http://localhost:51204  (when running test:ui)
```

---

## ✅ Success Checklist

After following this guide, you should have:

- [ ] Node.js and npm installed
- [ ] .NET 8 SDK installed (if using backend)
- [ ] Supabase account created
- [ ] Database schema created
- [ ] Storage bucket created
- [ ] Frontend running on http://localhost:3000
- [ ] Can sign up and log in
- [ ] Can add expenses, income, loans
- [ ] Can upload receipts
- [ ] Can change language
- [ ] Frontend tests passing (4 test suites)
- [ ] Backend tests passing (4 test suites) - if using backend
- [ ] Coverage reports generated

---

## 🎯 What's Next?

Now that everything is running:

1. **Use the app daily** with your wife
2. **Gather feedback** on what works/doesn't work
3. **Add features** from the [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md)
4. **Deploy to production** following [DEPLOYMENT.md](./DEPLOYMENT.md)
5. **Customize** colors, categories, etc.

---

## 📚 Additional Resources

- **Setup Guide:** [SETUP.md](./SETUP.md) - Detailed setup instructions
- **Testing Guide:** [TESTING_COMPLETE.md](./TESTING_COMPLETE.md) - Complete testing docs
- **Feature Roadmap:** [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) - Future features
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md) - How to deploy online
- **Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines

---

## 🆘 Need Help?

1. Check [Troubleshooting](#troubleshooting) section above
2. Review error messages carefully
3. Check browser console (F12) for errors
4. Verify environment variables in `.env`
5. Check Supabase dashboard for issues
6. Try restarting the dev server
7. Clear browser cache and cookies

---

<div align="center">

## 🎉 You're All Set!

**Everything should now be running!**

Frontend: ✅ http://localhost:3000  
Tests: ✅ Passing  
Ready to use: ✅ Yes!

**Enjoy tracking your expenses together! 💑**

</div>

