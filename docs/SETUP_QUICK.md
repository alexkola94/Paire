# ⚡ QUICK SETUP GUIDE

**Get the app running in 5 minutes!**

---

## 🚀 **Steps**

### **1. Clone & Navigate** (30 seconds)

```bash
git clone <your-repo-url>
cd You-me-Expenses
```

### **2. Setup Frontend** (2 minutes)

```bash
cd frontend
npm install

# Create .env file
# Windows:
echo VITE_SUPABASE_URL=https://your-project.supabase.co > .env
echo VITE_SUPABASE_ANON_KEY=your-key >> .env
echo VITE_BACKEND_API_URL=http://localhost:5038 >> .env

# Mac/Linux:
cat > .env << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key
VITE_BACKEND_API_URL=http://localhost:5038
EOF
```

**Replace `your-project` and `your-key` with actual values from Supabase!**

### **3. Setup Backend** (2 minutes)

```bash
cd ../backend/YouAndMeExpensesAPI

# Copy and edit appsettings
cp appsettings.Example.json appsettings.Development.json

# Edit appsettings.Development.json with your credentials:
# - Supabase URL and service_role key
# - Database connection string
# - (Optional) Gmail settings
# - (Optional) OpenAI key

dotnet restore
```

### **4. Run Everything!** (30 seconds)

```bash
# Terminal 1 - Backend
cd backend/YouAndMeExpensesAPI
dotnet run

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **5. Access the App** (10 seconds)

Open browser: **http://localhost:5173**

---

## ✅ **Quick Checklist**

Before starting:
- [ ] Node.js 18+ installed (`node --version`)
- [ ] .NET 9.0 SDK installed (`dotnet --version`)
- [ ] Supabase project created
- [ ] Git installed

After setup:
- [ ] Frontend runs on port 5173
- [ ] Backend runs on port 5038
- [ ] Can login with Supabase credentials
- [ ] No errors in console

---

## 🎯 **What You Get**

After setup, you'll have access to:

### **Pages:**
1. ✅ Dashboard - Financial overview
2. ✅ Analytics - Charts and insights
3. ✅ Expenses - Track spending
4. ✅ Income - Track earnings
5. ✅ Loans - Manage loans with payment tracking
6. ✅ Budgets - Set budgets
7. ✅ **Savings Goals** - 🆕 Track savings
8. ✅ **Recurring Bills** - 🆕 Manage subscriptions
9. ✅ **Shopping Lists** - 🆕 Organize shopping
10. ✅ Partnership - Share with partner
11. ✅ Reminders - Email notifications
12. ✅ Profile - Account settings

### **Features:**
- 💰 Expense & income tracking
- 📊 Budget management
- 🎯 Savings goals with progress tracking
- 📅 Recurring bill reminders
- 💳 Loan payment tracking
- 🛒 Shopping list organization
- 🤖 AI financial chatbot
- 🔔 Email notifications
- 🤝 Partner sharing
- 📈 Analytics & insights
- 🌍 Multi-language (EN, EL, ES, FR)

---

## 🐛 **Common Issues**

### **Port already in use:**
```bash
# Find and kill process on port 5173 (frontend)
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5173 | xargs kill -9
```

### **"Module not found":**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### **"Database connection failed":**
- Check Supabase project is running
- Verify connection string in `appsettings.Development.json`
- Use "Connection Pooling" mode from Supabase

---

## 📚 **Next Steps**

1. ✅ **Test the features** - Click around and explore
2. ✅ **Read the docs** - Check `/docs` folder
3. ✅ **Setup email** - See [GMAIL_SETUP.md](./docs/GMAIL_SETUP.md)
4. ✅ **Invite partner** - Use Partnership page
5. ✅ **Customize** - Modify colors, categories, etc.

---

## 🆘 **Need More Help?**

- 📖 [Full Setup Guide](./docs/SETUP.md)
- 📖 [Environment Variables](./ENV_SETUP_GUIDE.md)
- 📖 [How to Run](./docs/HOW_TO_RUN.md)
- 📖 [Complete Documentation](./docs/INDEX.md)

---

**🎉 You're all set! Start tracking your finances together!**

---

*Quick Setup Guide - December 4, 2025*

