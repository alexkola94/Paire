# 🎯 QUICK REFERENCE CARD

**You & Me Expenses - Version 2.0.0**

---

## 🚀 **Start the App**

```bash
# Terminal 1 - Backend
cd backend/YouAndMeExpensesAPI
dotnet run

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5038

---

## 📱 **All Pages** (13 Pages)

| Page | URL | Status |
|------|-----|--------|
| Dashboard | `/dashboard` | ✅ |
| Analytics | `/analytics` | ✅ |
| Expenses | `/expenses` | ✅ |
| Income | `/income` | ✅ |
| Loans | `/loans` | ✅ Enhanced |
| Budgets | `/budgets` | ✅ |
| **Savings Goals** | `/savings-goals` | 🆕 NEW |
| **Recurring Bills** | `/recurring-bills` | 🆕 NEW |
| **Shopping Lists** | `/shopping-lists` | 🆕 NEW |
| Partnership | `/partnership` | ✅ |
| Reminders | `/reminders` | ✅ |
| Profile | `/profile` | ✅ |
| Login | `/login` | ✅ |

---

## 🎯 **New Features**

### **1. Savings Goals** 💰
- Set financial targets
- Track progress visually
- Add deposits/withdrawals
- Priority levels
- Target dates
- Categories & custom colors

### **2. Recurring Bills** 📅
- Track subscriptions
- Weekly/Monthly/Quarterly/Yearly
- Overdue alerts
- Mark as paid
- Cost projections

### **3. Loan Payments** 💳
- Payment history
- Principal/Interest breakdown
- Auto-update balances
- Payment tracking

### **4. Shopping Lists** 🛒
- Multiple lists
- Checkbox items
- Cost estimation
- Quantity tracking

---

## 📊 **API Endpoints Summary**

**Total: 70+ endpoints**

### **New Endpoints:**
```
/api/savingsgoals              (8 endpoints)
/api/recurringbills            (8 endpoints)
/api/loanpayments              (7 endpoints)
/api/shoppinglists             (12 endpoints)
```

---

## 🌍 **Languages**

Press language selector to switch:
- 🇬🇧 English (EN)
- 🇬🇷 Greek (EL)
- 🇪🇸 Spanish (ES)
- 🇫🇷 French (FR)

---

## 📁 **Important Files**

### **Configuration:**
```
frontend/.env                           (create from .env.example)
backend/.../appsettings.Development.json (create from appsettings.Example.json)
```

### **Documentation:**
```
README.md                         Main documentation
SETUP_QUICK.md                    5-minute setup
ENV_SETUP_GUIDE.md                Environment config
docs/COMPLETE_FEATURES_ROADMAP.md Complete feature list
docs/SESSION_COMPLETE_SUMMARY.md  This session summary
```

---

## 🔧 **Common Commands**

### **Frontend:**
```bash
npm run dev         # Start dev server
npm run build       # Build for production
npm test            # Run tests
npm run preview     # Preview build
```

### **Backend:**
```bash
dotnet run                    # Start API
dotnet build                  # Build project
dotnet test                   # Run tests
dotnet ef migrations add Name # Create migration
dotnet ef database update     # Apply migrations
```

---

## 🐛 **Quick Troubleshooting**

### **Frontend won't start:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Backend won't start:**
```bash
dotnet clean
dotnet restore
dotnet run
```

### **CORS errors:**
Check `appsettings.Development.json` → `Cors.AllowedOrigins`

### **Auth errors:**
Check `.env` → Supabase credentials

---

## 📊 **Database Tables**

**12 Tables:**
```
✅ transactions
✅ loans
✅ budgets
✅ user_profiles
✅ partnerships
🆕 savings_goals          (NOW ACTIVE)
🆕 recurring_bills        (NOW ACTIVE)
🆕 loan_payments          (NOW ACTIVE)
🆕 shopping_lists         (NOW ACTIVE)
🆕 shopping_list_items    (NOW ACTIVE)
✅ reminder_preferences
✅ __EFMigrationsHistory
```

---

## 🎨 **Color Scheme**

```css
Primary:   #9b87f5  (Soft Purple)
Success:   #90ee90  (Light Green)
Error:     #ffb3ba  (Soft Red)
Warning:   #ffe4b5  (Soft Orange)
Info:      #add8e6  (Light Blue)
```

---

## ✅ **Testing Checklist**

Quick test all new features:
- [ ] Create a savings goal → see progress bar
- [ ] Add a recurring bill → see due date
- [ ] Open loan → click "Payments" → add payment
- [ ] Create shopping list → add items → check them off
- [ ] Check responsive on mobile (F12 → toggle device)
- [ ] Switch language → verify translations work
- [ ] Check all navigation links work

---

## 📞 **Help & Support**

### **Documentation:**
- Main README: `./README.md`
- Setup Guide: `./SETUP_QUICK.md`
- Environment: `./ENV_SETUP_GUIDE.md`
- Features: `./docs/COMPLETE_FEATURES_ROADMAP.md`

### **Need Help?**
- Check `/docs` folder (40+ documentation files)
- Review code comments
- Check browser console (F12)
- Check terminal output

---

## 🎊 **Version Info**

**Version:** 2.0.0  
**Release Date:** December 4, 2025  
**Status:** Production Ready  
**Features:** 20+ features  
**Pages:** 13 pages  
**Languages:** 4 languages  
**API Endpoints:** 70+

---

<div align="center">

## ⭐ **ALL SYSTEMS GO!** ⭐

**Everything is ready for testing and deployment!**

**Happy Financial Management!** 💑💰

</div>

---

*Quick Reference - Always keep this handy!*

