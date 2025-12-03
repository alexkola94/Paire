# 💑 You & Me Expenses

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![.NET](https://img.shields.io/badge/.NET-8.0-512bd4.svg)

**A modern, secure expense tracking web application for couples to manage their finances together.**

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

### 💰 Financial Management
- **Expense Tracking** - Record and categorize all your expenses
- **Income Tracking** - Track all sources of income
- **Loan Management** - Keep track of money lent or borrowed
- **Financial Dashboard** - Visual overview of your finances
- **Monthly Summaries** - See your financial health at a glance

### 📱 User Experience
- **Mobile-First Design** - Optimized for phones, tablets, and desktops
- **Smooth Animations** - Beautiful transitions and interactions
- **Intuitive Interface** - Clean and easy to use
- **Dark Theme Compatible** - Easy on the eyes with soft colors

### 🔐 Security & Privacy
- **Secure Authentication** - Strong password requirements
- **Row Level Security** - Your data is completely private
- **Encrypted Storage** - All data encrypted at rest
- **HTTPS Only** - Secure connections everywhere

### 🌍 Additional Features
- **Multi-language Support** - English, Spanish, French (more coming!)
- **File Attachments** - Upload receipts and documents
- **Real-time Sync** - Changes appear instantly
- **Export Data** - Download your financial data anytime

## 🚀 Quick Start

### ⚡ Fast Track (5 minutes)

```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Setup Supabase (follow prompts at supabase.com)
# 3. Configure .env file with your Supabase credentials
# 4. Run the app
npm run dev
```

**👉 For complete step-by-step instructions: [HOW_TO_RUN.md](./HOW_TO_RUN.md)**

### 📖 Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[HOW_TO_RUN.md](./HOW_TO_RUN.md)** | 🚀 Complete setup & testing guide | **Start here!** |
| [QUICKSTART.md](./QUICKSTART.md) | ⚡ 5-minute quick start | Need fast setup |
| [SETUP.md](./SETUP.md) | 📚 Detailed setup guide | Need more details |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 🌐 Deploy to production | Going live |
| [TESTING_COMPLETE.md](./TESTING_COMPLETE.md) | 🧪 Testing guide | Running tests |
| [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) | 🗺️ Future features | Planning ahead |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 🤝 Development guide | Contributing |

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern UI library
- **React Router** - Client-side routing
- **Vite** - Lightning-fast build tool
- **Supabase Client** - Database & auth
- **i18next** - Internationalization
- **date-fns** - Date utilities
- **React Icons** - Beautiful icons

### Backend (Optional)
- **.NET 8** - High-performance API
- **Supabase SDK** - Database integration
- **JWT Authentication** - Secure tokens

### Database & Storage
- **PostgreSQL** - via Supabase
- **Supabase Storage** - File uploads
- **Row Level Security** - Data privacy

### Hosting
- **GitHub Pages** - Frontend hosting (free!)
- **Supabase** - Backend services (free tier)

## 📁 Project Structure

```
You&me_Expenses/
├── 📁 frontend/              React application
│   ├── 📁 src/
│   │   ├── 📁 components/    Reusable UI components
│   │   ├── 📁 pages/         Page components
│   │   ├── 📁 services/      API & Supabase services
│   │   ├── 📁 i18n/          Translations
│   │   ├── 📁 styles/        Global CSS
│   │   ├── App.jsx          Main app component
│   │   └── main.jsx         Entry point
│   └── 📁 public/            Static assets
├── 📁 backend/              .NET API (optional)
│   ├── 📁 Controllers/       API endpoints
│   ├── 📁 Models/           Data models
│   └── Program.cs          API entry point
├── 📁 supabase/             Database config
│   ├── schema.sql          Database schema
│   └── README.md           Setup guide
├── 📄 README.md            You are here!
├── 📄 SETUP.md             Detailed setup guide
├── 📄 DEPLOYMENT.md        Deployment instructions
└── 📄 CONTRIBUTING.md      How to contribute
```

## 📸 Screenshots

<div align="center">

### 🖥️ Desktop View
![Dashboard](https://via.placeholder.com/800x450/9b87f5/ffffff?text=Dashboard+View)

### 📱 Mobile View
![Mobile](https://via.placeholder.com/375x667/b5a3f7/ffffff?text=Mobile+View)

</div>

## 🎨 Design Philosophy

Our design prioritizes:
- **Simplicity** - Clean, uncluttered interface
- **Usability** - Intuitive navigation and interactions
- **Accessibility** - Easy to use for everyone
- **Performance** - Fast loading and smooth animations
- **Responsiveness** - Works beautifully on any device

### Color Palette
- **Primary**: Soft purple (`#9b87f5`) - Calming and modern
- **Success**: Light green - For income and positive actions
- **Error**: Soft red - For expenses and warnings
- **Background**: Off-white (`#fafafa`) - Easy on the eyes

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide for local development
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - How to deploy to production
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guidelines for contributing
- **[supabase/README.md](./supabase/README.md)** - Database setup guide
- **[backend/README.md](./backend/README.md)** - Backend API documentation

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development

```bash
# Install dependencies
cd frontend && npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🐛 Known Issues

None at the moment! 🎉

Found a bug? [Open an issue](https://github.com/YOUR_USERNAME/you-me-expenses/issues)

## 🗺️ Roadmap

Future features we're considering:
- [ ] Budget planning and alerts
- [ ] Recurring transactions
- [ ] Financial reports and charts
- [ ] Export to CSV/PDF
- [ ] Split expenses between partners
- [ ] Categories customization
- [ ] Dark mode
- [ ] Mobile app (React Native)

## ❓ FAQ

**Q: Is this free to use?**
A: Yes! Both Supabase and GitHub Pages offer free tiers.

**Q: Is my data secure?**
A: Yes. Your data is encrypted and protected by Supabase's Row Level Security.

**Q: Can I use this for business?**
A: This is designed for personal use by couples, but feel free to adapt it!

**Q: Do I need the backend?**
A: No! The app works perfectly with Supabase directly from the frontend.

**Q: Can I customize it?**
A: Absolutely! The code is well-documented and easy to modify.

## 📧 Support

Need help? 
- Check the [documentation](#-documentation)
- Open an [issue](https://github.com/YOUR_USERNAME/you-me-expenses/issues)
- Review existing issues and discussions

## 📄 License

Private - For personal use only

## 💖 Acknowledgments

Built with love for couples who want to manage their finances together.

Special thanks to:
- [Supabase](https://supabase.com) - Amazing backend platform
- [React](https://react.dev) - Fantastic UI library
- [Vite](https://vitejs.dev) - Blazing fast build tool
- [GitHub](https://github.com) - Free hosting for everyone

## 👥 Authors

Created with ❤️ by [Your Name]

---

<div align="center">

**⭐ If you find this project helpful, please give it a star!**

Made with ❤️ for managing finances together

</div>

