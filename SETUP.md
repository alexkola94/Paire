# Setup Guide

Complete setup guide for local development of You & Me Expenses.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **.NET 8 SDK** (optional, for backend) ([Download](https://dotnet.microsoft.com/download))
- **Code Editor** (VS Code recommended)

## 🚀 Quick Start

### 1. Clone or Download

```bash
# If cloning from GitHub
git clone https://github.com/YOUR_USERNAME/you-me-expenses.git
cd you-me-expenses

# Or if you already have the files, navigate to the directory
cd You\&me_Expenses
```

### 2. Supabase Setup

#### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **New Project**
4. Fill in:
   - Name: `you-me-expenses-dev`
   - Database Password: (save this!)
   - Region: Choose closest to you
5. Click **Create new project** (takes ~2 minutes)

#### Setup Database

1. In Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Copy all content
4. Paste in SQL Editor
5. Click **Run** or press `Ctrl/Cmd + Enter`
6. Verify: Go to **Database** > **Tables** - you should see `transactions` and `loans`

#### Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**
3. Name: `receipts`
4. Make it **Public**
5. Click **Create**
6. Click on the bucket, go to **Policies**
7. Add policies (copy from `supabase/schema.sql` comments)

#### Get API Keys

1. Go to **Settings** > **API**
2. Copy:
   - Project URL (e.g., `https://abcdefgh.supabase.co`)
   - anon public key (starts with `eyJ...`)

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
# Windows (PowerShell):
New-Item -Path .env -ItemType File

# Mac/Linux:
touch .env
```

Edit `frontend/.env` and add:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=http://localhost:5000/api
```

**Replace** the values with your actual Supabase credentials!

### 4. Start Development Server

```bash
# Make sure you're in the frontend directory
npm run dev
```

The app will open automatically at `http://localhost:3000`

### 5. Test the Application

1. **Sign Up**: Create a test account with your email
2. **Check Email**: Supabase will send a confirmation email (check spam folder)
3. **Confirm**: Click the link in the email
4. **Log In**: Return to the app and log in
5. **Test Features**:
   - Add an expense
   - Add income
   - Create a loan
   - Upload a receipt
   - Change language
   - View dashboard

## 🔧 Backend Setup (Optional)

The backend is **optional** - the app works perfectly without it using Supabase directly!

If you want to run the backend:

```bash
# Navigate to backend directory
cd backend

# Restore packages
dotnet restore

# Create development settings
# Copy appsettings.json to appsettings.Development.json
```

Edit `appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Supabase": {
    "Url": "https://your-project.supabase.co",
    "Key": "your-service-key",
    "JwtSecret": "your-jwt-secret"
  }
}
```

Run the backend:

```bash
# Development mode with hot reload
dotnet watch run

# Or standard run
dotnet run
```

Backend will be available at:
- `http://localhost:5000`
- API docs: `http://localhost:5000/swagger`

## 📁 Project Structure

```
You&me_Expenses/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API & Supabase services
│   │   ├── i18n/            # Translations
│   │   ├── styles/          # Global CSS
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   ├── index.html           # HTML template
│   ├── package.json         # Dependencies
│   └── vite.config.js       # Vite configuration
├── backend/                 # .NET API (optional)
│   ├── Controllers/         # API endpoints
│   ├── Models/             # Data models
│   └── Program.cs          # API entry point
├── supabase/               # Database configuration
│   ├── schema.sql          # Database schema
│   └── README.md           # Supabase setup guide
├── README.md               # Main documentation
├── SETUP.md               # This file
└── DEPLOYMENT.md          # Deployment guide
```

## 🎨 Customization

### Change Colors

Edit `frontend/src/styles/index.css`:

```css
:root {
  --primary: #9b87f5;        /* Main brand color */
  --primary-light: #b5a3f7;
  --primary-dark: #7c63d4;
  /* ... more colors */
}
```

### Add New Language

1. Create `frontend/src/i18n/locales/xx.json` (xx = language code)
2. Copy structure from `en.json`
3. Translate all strings
4. Import in `frontend/src/i18n/config.js`:
   ```javascript
   import xx from './locales/xx.json'
   // ...
   resources: {
     xx: { translation: xx }
   }
   ```
5. Add button in `Profile.jsx`

### Modify Categories

Edit categories in `frontend/src/components/TransactionForm.jsx`:

```javascript
const expenseCategories = ['food', 'transport', 'utilities', ...]
const incomeCategories = ['salary', 'freelance', 'investment', ...]
```

Add translations in all language files under `categories` section.

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000 (frontend)
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### NPM Install Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Supabase Connection Error

- ✅ Check environment variables in `.env`
- ✅ Verify Supabase project is not paused
- ✅ Check API keys are correct (no extra spaces)
- ✅ Ensure database schema is created

### Build Errors

```bash
# Update dependencies
npm update

# Check Node.js version
node --version  # Should be 18 or higher

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Authentication Issues

1. Check Supabase Auth settings
2. Verify email confirmation
3. Check browser console for errors
4. Clear browser cache and cookies

### File Upload Issues

1. Verify storage bucket exists
2. Check bucket is public
3. Verify storage policies are configured
4. Check file size (max 5MB)

## 🧪 Testing

### Manual Testing Checklist

- [ ] Sign up new user
- [ ] Confirm email
- [ ] Log in
- [ ] Add expense with all fields
- [ ] Upload receipt
- [ ] Add income
- [ ] Create loan
- [ ] Edit transaction
- [ ] Delete transaction
- [ ] Change language
- [ ] Change password
- [ ] Test on mobile (responsive)
- [ ] Test on tablet
- [ ] Log out

### Browser Testing

Test on multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if on Mac)

### Mobile Testing

Use browser dev tools to test:
- 📱 iPhone 12/13/14
- 📱 Samsung Galaxy
- 📱 iPad

## 💡 Development Tips

### VS Code Extensions (Recommended)

- ESLint
- Prettier - Code formatter
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Path Intellisense

### Hot Module Replacement (HMR)

Changes to React components will update instantly without full page reload!

### Browser DevTools

- Open with `F12` or `Ctrl+Shift+I`
- Check Console for errors
- Network tab for API calls
- Application tab to inspect localStorage

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add my feature"

# Push to GitHub
git push origin feature/my-feature
```

## 📚 Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [.NET Documentation](https://docs.microsoft.com/dotnet/)
- [Tailwind CSS](https://tailwindcss.com) (if you want to add it)

## 🆘 Getting Help

1. Check the error message carefully
2. Search in GitHub Issues (if project is on GitHub)
3. Check browser console for errors
4. Review Supabase logs in dashboard
5. Google the error message
6. Ask on Stack Overflow

## ✅ Next Steps

Once everything is working locally:

1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting instructions
2. Customize the app to your needs
3. Add more features!
4. Share with your partner 💑

---

**Happy Coding! 🚀**

If you encounter any issues, check the troubleshooting section or review the error messages carefully.

