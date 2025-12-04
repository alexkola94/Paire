# 🚀 Getting Started with You & Me Expenses

Welcome! This guide will help you get your expense tracking app up and running.

## ⚡ 3 Simple Steps

### Step 1: Prerequisites ✅
Install these if you haven't already:
- **Node.js 18+** → [Download here](https://nodejs.org)
- **Git** → [Download here](https://git-scm.com)

### Step 2: Setup Supabase (5 minutes) 🗄️
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Run database schema (copy from `supabase/schema.sql`)
4. Create storage bucket named `receipts`
5. Copy your project URL and anon key

### Step 3: Run the App 🎉
```bash
cd frontend
npm install
# Create .env file with your Supabase credentials
npm run dev
```

**That's it!** Open http://localhost:3000

---

## 📚 Where to Go Next

### First Time Setup
👉 **Follow the [Quick Start Guide](./QUICKSTART.md)** - Most detailed walkthrough

### Want to Deploy Online?
👉 **Read [Deployment Guide](./DEPLOYMENT.md)** - Host on GitHub Pages (FREE!)

### Need Help?
👉 **Check [Setup Guide](./SETUP.md)** - Troubleshooting and detailed instructions

---

## ✨ What's New in Latest Version

I just added these production-ready features:

### 🆕 Error Handling
- **Error Boundary** - Graceful error handling
- **Toast Notifications** - User-friendly feedback messages
- Better error messages throughout

### 🔧 Development Tools
- **ESLint** - Code quality checks
- **Prettier** - Auto-formatting
- New npm scripts:
  ```bash
  npm run lint        # Check code quality
  npm run lint:fix    # Auto-fix issues
  npm run format      # Format code
  ```

### 📋 GitHub Templates
- Bug report template
- Feature request template
- Pull request template

### 📄 Documentation
- **CHANGELOG.md** - Version history
- **LICENSE** - MIT License
- **This file!** - Getting started guide

---

## 🎯 Your Next Actions

### Immediate (Required)
1. ✅ Install Node.js 18+
2. ✅ Create Supabase account
3. ✅ Setup database schema
4. ✅ Create storage bucket
5. ✅ Configure `.env` file
6. ✅ Run `npm install`
7. ✅ Run `npm run dev`
8. ✅ Test the app!

### Short Term (Recommended)
1. 📱 Test on your phone
2. 🎨 Customize colors (optional)
3. 🌍 Add more languages (optional)
4. 📊 Add your real expenses
5. 👥 Share with your wife

### Long Term (When Ready)
1. 🚀 Deploy to GitHub Pages
2. 📱 Add to phone home screen
3. 🔔 Setup notifications (future feature)
4. 📊 Export your data
5. 🌟 Star the repo!

---

## 💡 Pro Tips

### For First-Time Users
- Start with small amounts to test
- Upload a test receipt
- Try all features before real use
- Test on mobile browser

### For Developers
- Code is well-commented
- Follow existing patterns
- Test on mobile always
- Keep transitions smooth

### For Customization
- Colors: `frontend/src/styles/index.css`
- Categories: `frontend/src/components/TransactionForm.jsx`
- Translations: `frontend/src/i18n/locales/*.json`

---

## 🆘 Common Issues

### "npm: command not found"
→ Install Node.js from nodejs.org

### "Port 3000 is already in use"
→ Kill the process or use different port:
```bash
# Kill process on port 3000
npx kill-port 3000
```

### "Cannot connect to Supabase"
→ Check your `.env` file has correct credentials

### "Module not found" errors
→ Delete `node_modules` and run `npm install` again

---

## 📖 Full Documentation Index

| Document | Purpose |
|----------|---------|
| **README.md** | Project overview and features |
| **QUICKSTART.md** | 5-minute setup guide |
| **SETUP.md** | Detailed setup instructions |
| **DEPLOYMENT.md** | Deploy to production |
| **CONTRIBUTING.md** | Development guidelines |
| **CHANGELOG.md** | Version history |
| **supabase/README.md** | Database setup |
| **backend/README.md** | Backend API docs |

---

## 🎉 You're All Set!

The project is **100% complete** and ready to use:

✅ Full-featured expense tracking  
✅ Beautiful, responsive UI  
✅ Secure authentication  
✅ File uploads  
✅ Multi-language support  
✅ Production-ready code  
✅ Complete documentation  
✅ Easy deployment  

**Ready to start?** → Open [QUICKSTART.md](./QUICKSTART.md)

**Questions?** → Check [SETUP.md](./SETUP.md)

**Ready to deploy?** → Read [DEPLOYMENT.md](./DEPLOYMENT.md)

---

<div align="center">

**Made with ❤️ for couples managing finances together**

[Report Bug](https://github.com/YOUR_USERNAME/you-me-expenses/issues) • [Request Feature](https://github.com/YOUR_USERNAME/you-me-expenses/issues) • [Documentation](./README.md)

</div>

