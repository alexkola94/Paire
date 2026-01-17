# Paire

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![.NET](https://img.shields.io/badge/.NET-8.0-512bd4.svg)

**Finances, aligned.**

A comprehensive expense tracking and financial management platform for couples.

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 💰 **Core Financial Management**
- ✅ **Expense Tracking** - Record and categorize all your expenses with attachments
- ✅ **Income Tracking** - Track all sources of income
- ✅ **Budget Management** - Set monthly/yearly budgets by category
- ✅ **Loan Management** - Track money lent or borrowed with installment plans
- ✅ **Financial Dashboard** - Visual overview with charts and summaries
- ✅ **Analytics** - Comprehensive financial insights and trends

### 🎯 **NEW! Advanced Planning Features**
- ✅ **Travel Mode** - Plan trips, track separate budgets, and manage itineraries
- ✅ **Savings Goals** - Set and track multiple savings goals with visual progress
- ✅ **Recurring Bills** - Manage subscriptions and recurring payments
- ✅ **Loan Payment Tracking** - Track individual loan payments with principal/interest breakdown
- ✅ **Shopping Lists** - Organize shopping with cost estimation

### 🤝 **Partnership Features**
- ✅ **Shared Data** - Share finances with your partner seamlessly
- ✅ **Name Tags** - See who added each transaction
- ✅ **Partner Analytics** - Compare spending between partners
- ✅ **Household Management** - Manage your household finances together

### 🔔 **Smart Notifications**
- ✅ **Bill Reminders** - Email notifications before bills are due
- ✅ **Budget Alerts** - Get notified when approaching budget limits
- ✅ **Loan Reminders** - Never miss a loan payment
- ✅ **Savings Milestones** - Celebrate when reaching savings goals
- ✅ **Customizable Settings** - Control what and when you're notified

### 🤖 **AI Assistant**
- ✅ **Financial Chatbot** - Ask questions about your finances in natural language
- ✅ **Smart Insights** - Get AI-powered financial advice
- ✅ **Query History** - Review past conversations

### 📊 **Economic Data & News**
- ✅ **Economic News** - Real-time Greece economic data from Eurostat API
- ✅ **CPI Tracking** - Consumer Price Index trends and rates
- ✅ **Food Price Monitoring** - Track food price changes over time
- ✅ **Economic Indicators** - GDP, unemployment, inflation, and household income data
- ✅ **News Aggregation** - Latest economic news from multiple sources

### 🌍 **User Experience**
- ✅ **Multi-language Support** - English, Greek, Spanish, French
- ✅ **Mobile-First Design** - Optimized for phones, tablets, and desktops
- ✅ **Smooth Animations** - Beautiful transitions and interactions
- ✅ **Intuitive Interface** - Clean and easy to use
- ✅ **Soft Color Palette** - Easy on the eyes

### 🔐 **Security & Privacy**
- ✅ **Secure Authentication** - Supabase Auth with email verification
- ✅ **Row Level Security** - Your data is completely private
- ✅ **Encrypted Storage** - All data encrypted at rest
- ✅ **HTTPS Only** - Secure connections everywhere
- ✅ **Partner Isolation** - Each partner only sees shared data

---

## 🚀 Quick Start

### **Option 1: Full Stack (Recommended)**

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd You-me-Expenses

# 2. Setup Backend
cd backend/YouAndMeExpensesAPI
cp appsettings.json appsettings.Development.json
# Edit appsettings.Development.json with your Supabase credentials
dotnet restore
dotnet run

# 3. Setup Frontend (in new terminal)
cd frontend
npm install
cp .env.example .env
# Edit .env with your Supabase and backend URLs
npm run dev
```

### **Option 2: Frontend Only**

```bash
# 1. Setup Frontend
cd frontend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials
npm run dev
```

**👉 For detailed setup: See [docs/HOW_TO_RUN.md](./docs/HOW_TO_RUN.md)**

---

## 📱 **Application Pages**

### **Main Features:**
1. **Dashboard** (`/dashboard`) - Financial overview with charts
2. **Travel Mode** (`/travel`) - 🆕 Full featured travel planner & expense tracker
3. **Analytics** (`/analytics`) - Detailed insights and trends
4. **Expenses** (`/expenses`) - Track spending
5. **Income** (`/income`) - Track earnings
6. **Loans** (`/loans`) - Manage loans with payment tracking
7. **Budgets** (`/budgets`) - Set and monitor budgets
8. **Savings Goals** (`/savings-goals`) - 🆕 Track savings progress
9. **Recurring Bills** (`/recurring-bills`) - 🆕 Manage subscriptions
10. **Shopping Lists** (`/shopping-lists`) - 🆕 Organize shopping
11. **Economic News** (`/economic-news`) - 🆕 Greece economic data & indicators
12. **Partnership** (`/partnership`) - Connect with your partner
13. **Reminders** (`/reminders`) - Configure notifications
14. **Profile** (`/profile`) - Manage your account

---

## 🏗️ Tech Stack

### **Frontend**
- **React 18.2** - Modern UI library with Hooks
- **React Router v6** - Client-side routing
- **Vite** - Lightning-fast build tool
- **Supabase Client** - Database & auth
- **react-i18next** - Internationalization (4 languages)
- **date-fns** - Date formatting
- **React Icons** - Beautiful icon library
- **CSS3** - Custom responsive styling

### **Backend**
- **.NET 8.0** - High-performance API
- **Entity Framework Core** - ORM for database
- **Supabase .NET SDK** - Database integration
- **ASP.NET Core** - Web framework
- **Gmail SMTP** - Email notifications
- **OpenAI API** - AI chatbot integration

### **Database & Storage**
- **PostgreSQL** - via Supabase
- **Supabase Storage** - File uploads (receipts)
- **Row Level Security** - Data privacy & isolation
- **Real-time subscriptions** - Live updates

### **DevOps**
- **Git** - Version control
- **npm** - Package management
- **dotnet CLI** - .NET tooling

---

## 📁 Project Structure

```
You-me-Expenses/
├── 📁 backend/
│   └── YouAndMeExpensesAPI/
│       ├── Controllers/         # 12 API controllers
│       │   ├── AnalyticsController.cs
│       │   ├── BudgetsController.cs
│       │   ├── ChatbotController.cs
│       │   ├── LoansController.cs
│       │   ├── LoanPaymentsController.cs      # 🆕 NEW!
│       │   ├── RecurringBillsController.cs    # 🆕 NEW!
│       │   ├── RemindersController.cs
│       │   ├── SavingsGoalsController.cs      # 🆕 NEW!
│       │   ├── ShoppingListsController.cs     # 🆕 NEW!
│       │   ├── EconomicDataController.cs       # 🆕 NEW!
│       │   ├── SystemController.cs
│       │   └── TransactionsController.cs
│       ├── Data/                # Entity Framework DbContext
│       ├── DTOs/                # Data Transfer Objects
│       ├── Models/              # Database models
│       ├── Services/            # Business logic
│       ├── Migrations/          # EF Core migrations
│       └── Program.cs           # API entry point
│
├── 📁 frontend/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── Chatbot.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── TransactionForm.jsx
│   │   ├── pages/               # Page components (13 pages)
│   │   │   ├── Analytics.jsx
│   │   │   ├── Budgets.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Income.jsx
│   │   │   ├── Loans.jsx (enhanced)
│   │   │   ├── Login.jsx
│   │   │   ├── Partnership.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── RecurringBills.jsx       # 🆕 NEW!
│   │   │   ├── ReminderSettings.jsx
│   │   │   ├── SavingsGoals.jsx         # 🆕 NEW!
│   │   │   ├── ShoppingLists.jsx        # 🆕 NEW!
│   │   │   └── EconomicNews.jsx         # 🆕 NEW!
│   │   ├── services/            # API & Supabase
│   │   │   ├── api.js (enhanced)
│   │   │   ├── supabase.js
│   │   │   └── greeceEconomicData.js  # 🆕 NEW!
│   │   ├── i18n/                # Translations (4 languages)
│   │   │   └── locales/
│   │   │       ├── en.json
│   │   │       ├── el.json
│   │   │       ├── es.json
│   │   │       └── fr.json
│   │   ├── styles/              # Global CSS
│   │   ├── utils/               # Utility functions
│   │   ├── tests/               # Unit tests
│   │   ├── App.jsx              # Main app (updated)
│   │   └── main.jsx             # Entry point
│   ├── public/                  # Static assets
│   ├── .env.example             # Environment template
│   ├── package.json
│   └── vite.config.js
│
├── 📁 supabase/                 # Database config
│   ├── migrations/              # SQL migrations
│   ├── schema.sql
│   └── config.toml
│
├── 📁 docs/                     # Documentation (40+ files)
│   ├── HOW_TO_RUN.md
│   ├── COMPLETE_FEATURES_ROADMAP.md    # 🆕 NEW!
│   ├── FINAL_IMPLEMENTATION_REPORT.md  # 🆕 NEW!
│   └── ... (more docs)
│
├── .gitignore
├── README.md                    # This file!
└── .env.example                 # Environment template
```

---

## 🎨 **What Makes This Special**

### **Complete Financial Management:**
1. **Track Everything** - Expenses, income, loans, bills, goals, shopping
2. **Plan Ahead** - Set budgets, savings goals, and monitor recurring bills
3. **Partner Sharing** - Seamlessly share finances with your partner
4. **Smart Insights** - AI-powered chatbot for financial advice
5. **Never Miss Anything** - Email reminders for bills, loans, and budgets

### **Beautiful Design:**
- Deep purple color scheme (#6c5ce7)
- Smooth animations and transitions
- Card-based layouts
- Progress visualizations
- Status indicators with color coding
- Empty states with helpful guidance

### **Developer Friendly:**
- Clean, well-commented code
- Consistent patterns
- Comprehensive error handling
- Easy to extend
- Test-ready structure

---

## 📚 Documentation

### **Getting Started:**
- 🚀 [HOW_TO_RUN.md](./docs/HOW_TO_RUN.md) - **Start here!**
- ⚡ [QUICKSTART.md](./docs/QUICKSTART.md) - 5-minute setup
- 📖 [SETUP.md](./docs/SETUP.md) - Detailed setup guide

### **Features:**
- 🎯 [COMPLETE_FEATURES_ROADMAP.md](./docs/COMPLETE_FEATURES_ROADMAP.md) - All features
- 📊 [FINAL_IMPLEMENTATION_REPORT.md](./docs/FINAL_IMPLEMENTATION_REPORT.md) - Implementation details
- 🗺️ [FEATURE_ROADMAP.md](./docs/FEATURE_ROADMAP.md) - Future plans

### **Deployment:**
- 🚀 [PRODUCTION_DEPLOYMENT_PLAN.md](./docs/PRODUCTION_DEPLOYMENT_PLAN.md) - **📋 Complete Production Deployment Plan (Render.com + GitHub Pages)**
- ⚡ [PRODUCTION_QUICK_START.md](./docs/PRODUCTION_QUICK_START.md) - Quick reference guide
- 🚀 [RENDER_GITHUB_PAGES_DEPLOYMENT.md](./docs/RENDER_GITHUB_PAGES_DEPLOYMENT.md) - Detailed step-by-step guide
- 🌐 [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - General deployment guide
- ✅ [PRODUCTION_READINESS.md](./docs/PRODUCTION_READINESS.md) - Production checklist
- 🔧 [SETUP_ENTITY_FRAMEWORK.md](./docs/SETUP_ENTITY_FRAMEWORK.md) - EF Core setup

### **Configuration:**
- 📧 [GMAIL_SETUP.md](./docs/GMAIL_SETUP.md) - Email notifications setup
- 🔗 [PARTNER_SHARING_GUIDE.md](./docs/PARTNER_SHARING_GUIDE.md) - Partnership setup
- 🗄️ [SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) - Database setup

### **Development:**
- 🤝 [CONTRIBUTING.md](./docs/CONTRIBUTING.md) - Development guidelines
- 🧪 [TESTING_COMPLETE.md](./docs/TESTING_COMPLETE.md) - Testing guide

---

## 🎯 **API Endpoints Overview**

### **40+ RESTful Endpoints:**

| Feature | Endpoints | Status |
|---------|-----------|--------|
| Transactions | 7 endpoints | ✅ Active |
| Loans | 7 endpoints | ✅ Active |
| Budgets | 5 endpoints | ✅ Active |
| Analytics | 6 endpoints | ✅ Active |
| Savings Goals | 8 endpoints | 🆕 NEW! |
| Recurring Bills | 8 endpoints | 🆕 NEW! |
| Loan Payments | 7 endpoints | 🆕 NEW! |
| Shopping Lists | 12 endpoints | 🆕 NEW! |
| Economic Data | 5 endpoints | 🆕 NEW! |
| Reminders | 7 endpoints | ✅ Active |
| Chatbot | 2 endpoints | ✅ Active |

**Total: 75+ API endpoints!**

---

## 💻 **Development Setup**

### **Prerequisites:**
- Node.js 18+ (for frontend)
- .NET 8.0 SDK (for backend)
- Supabase account (free tier available)
- Gmail account (for email notifications - optional)
- OpenAI API key (for chatbot - optional)

### **Environment Variables:**

#### Frontend (`.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_API_URL=http://localhost:5038
```

#### Backend (`appsettings.Development.json`):
```json
{
  "Supabase": {
    "Url": "your_supabase_url",
    "Key": "your_supabase_service_role_key"
  },
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "your@gmail.com",
    "Username": "your@gmail.com",
    "Password": "your_app_password"
  },
  "OpenAI": {
    "ApiKey": "your_openai_api_key"
  }
}
```

### **Quick Commands:**

```bash
# Backend
cd backend/YouAndMeExpensesAPI
dotnet run                    # Start API on port 5038

# Frontend
cd frontend
npm run dev                   # Start dev server on port 5173
npm run build                 # Build for production
npm run preview               # Preview production build
npm test                      # Run tests

# Database
cd supabase
supabase start               # Start local Supabase
supabase db reset            # Reset database
```

---

## 📊 **Database Schema**

### **12 Tables:**
1. `transactions` - Expenses and income
2. `loans` - Loan records
3. `loan_payments` - 🆕 Payment history
4. `budgets` - Budget planning
5. `savings_goals` - 🆕 Savings tracking
6. `recurring_bills` - 🆕 Recurring payments
7. `shopping_lists` - 🆕 Shopping lists
8. `shopping_list_items` - 🆕 List items
9. `user_profiles` - User information
10. `partnerships` - Partner connections
11. `reminder_preferences` - Notification settings
12. `__EFMigrationsHistory` - Migration tracking

---

## 🎨 **Design System**

### **Color Palette:**
```css
Primary:   #6c5ce7  (Deep Indigo)
Secondary: #f0e6ff  (Light Lavender)
Accent:    #a29bfe  (Soft Purple)
Success:   #90ee90  (Light Green)
Error:     #ffb3ba  (Soft Red)
Warning:   #ffe4b5  (Soft Orange)
Info:      #add8e6  (Light Blue)
```

### **Typography:**
- Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Headings: 600 weight, 1.3 line-height
- Body: 400 weight, 1.6 line-height

### **Spacing:**
- XS: 4px
- SM: 8px
- MD: 16px
- LG: 24px
- XL: 32px

### **Border Radius:**
- SM: 8px
- MD: 12px
- LG: 16px
- XL: 24px

---

## 🔧 **Configuration**

### **Backend Configuration:**
Location: `backend/YouAndMeExpensesAPI/appsettings.json`

Required settings:
- Supabase URL and key
- Email SMTP settings (optional for reminders)
- OpenAI API key (optional for chatbot)
- CORS origins
- Connection strings

### **Frontend Configuration:**
Location: `frontend/.env`

Required settings:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `VITE_BACKEND_API_URL` - Backend API URL (default: http://localhost:5038)

---

## 📖 **API Documentation**

### **Base URL:** `http://localhost:5038/api`

### **Authentication:**
All endpoints (except system endpoints) require:
```http
X-User-Id: <user-guid>
```

### **Response Format:**
```json
{
  "data": { ... },
  "message": "Success",
  "error": null
}
```

### **Error Format:**
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

For complete API documentation, see the controllers or use the Swagger UI at `/swagger` (when enabled).

---

## 🧪 **Testing**

### **Frontend Tests:**
```bash
cd frontend
npm test                      # Run all tests
npm test -- --coverage        # With coverage
npm test -- --watch           # Watch mode
```

### **Backend Tests:**
```bash
cd backend/YouAndMeExpenses.Tests
dotnet test                   # Run all tests
dotnet test --verbosity detailed
```

### **Manual Testing:**
See [docs/TESTING_COMPLETE.md](./docs/TESTING_COMPLETE.md) for testing scenarios.

---

## 🌐 **Deployment**

### **Frontend (GitHub Pages):**
```bash
cd frontend
npm run build
# Deploy dist/ folder to GitHub Pages
```

### **Backend (Your choice):**
- Azure App Service
- AWS Elastic Beanstalk
- Heroku
- DigitalOcean
- Railway
- Render

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

---

## 🗺️ **Roadmap & Future Features**

### **Completed (v2.0):** ✅
- ✅ Savings Goals tracking
- ✅ Recurring Bills management
- ✅ Loan Payment tracking
- ✅ Shopping Lists
- ✅ AI Chatbot
- ✅ Email Reminders
- ✅ Partnership sharing
- ✅ Multi-language support (4 languages)

### **Planned (v2.1):**
- [ ] Budget templates
- [ ] Savings goal milestones
- [ ] Bill payment integration
- [ ] Shopping list sharing
- [ ] Export to PDF/Excel
- [ ] Mobile app (React Native)
- [ ] Recurring transaction auto-creation
- [ ] Bank integration (Plaid)

### **Considering (v3.0):**
- [ ] Investment tracking
- [ ] Tax preparation reports
- [ ] Financial advisor AI
- [ ] Goal recommendations
- [ ] Spending insights
- [ ] Bill negotiation tips

---

## ❓ **FAQ**

**Q: Is this free to use?**  
A: Yes! Supabase offers a generous free tier.

**Q: Is my data secure?**  
A: Yes. All data is encrypted and protected by Supabase's Row Level Security.

**Q: Can I use this solo (without a partner)?**  
A: Absolutely! Partnership is optional.

**Q: Do I need the backend?**  
A: Some features work frontend-only, but backend is recommended for full functionality.

**Q: Can I customize categories?**  
A: Yes! Categories are configurable in the code.

**Q: Does it work offline?**  
A: No, it requires internet connection for database access.

**Q: Can I export my data?**  
A: Currently manual via Supabase dashboard. Auto-export coming soon!

---

## 🤝 **Contributing**

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for detailed guidelines.

---

## 📧 **Support**

Need help?
- 📖 Check [documentation](#-documentation)
- 🐛 [Open an issue](https://github.com/YOUR_USERNAME/you-me-expenses/issues)
- 💬 Start a discussion

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💖 **Acknowledgments**

Built with love for couples managing finances together.

### **Special Thanks:**
- [Supabase](https://supabase.com) - Amazing BaaS platform
- [React](https://react.dev) - Fantastic UI library
- [Vite](https://vitejs.dev) - Blazing fast build tool
- [.NET](https://dotnet.microsoft.com) - Powerful backend framework
- [Entity Framework](https://docs.microsoft.com/ef/) - Excellent ORM

---

## 👨‍💻 **Author**

Created with ❤️ by Alex Kola

---

<div align="center">

## 🌟 **Star This Project!**

If you find this helpful, please give it a star ⭐

**Paire — Finances, aligned.**

</div>

---

## 📈 **Stats**

- **Lines of Code:** 16,000+
- **API Endpoints:** 75+
- **Pages:** 14
- **Languages:** 4
- **Database Tables:** 12
- **Features:** 25+
- **Tests:** 10+
- **Documentation Files:** 40+

---

**Version 2.0.0** - Major Update with 4 New Features!  
**Last Updated:** December 2025

---

<div align="center">

**Made with ❤️ for couples managing finances together**

[Report Bug](https://github.com/alexkola94/Expenses-APP/issues) · [Request Feature](https://github.com/alexkola94/Expenses-APP/issues) · [Documentation](./docs/HOW_TO_RUN.md)

</div>

