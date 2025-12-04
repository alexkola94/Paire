# 🔐 Environment Variables Templates

Copy the templates below to create your environment files.

---

## 📱 **Frontend .env Template**

**File Location:** `frontend/.env`

**How to create:**
```bash
cd frontend
# Create a new file called .env and paste the content below
```

**Template Content:**

```env
# ================================
# FRONTEND ENVIRONMENT VARIABLES
# You & Me Expenses Application
# ================================

# ================================
# Supabase Configuration (REQUIRED)
# ================================
# Get these from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# ================================
# Backend API Configuration (REQUIRED)
# ================================
# Local development
VITE_BACKEND_API_URL=http://localhost:5038

# Production (update when deploying)
# VITE_BACKEND_API_URL=https://your-api-domain.com

# ================================
# Optional Settings
# ================================
VITE_APP_ENV=development
VITE_DEBUG=false
```

---

## 🖥️ **Backend appsettings.Development.json Template**

**File Location:** `backend/YouAndMeExpensesAPI/appsettings.Development.json`

**How to create:**
```bash
cd backend/YouAndMeExpensesAPI
# Create a new file called appsettings.Development.json and paste the content below
```

**Template Content:**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "AllowedHosts": "*",
  
  "Supabase": {
    "Url": "https://your-project.supabase.co",
    "Key": "your-supabase-service-role-key-here"
  },
  
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.xxxxx;Password=your-password"
  },
  
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "your-email@gmail.com",
    "SenderName": "You & Me Expenses",
    "Username": "your-email@gmail.com",
    "Password": "your-gmail-app-password-here",
    "EnableSsl": true
  },
  
  "OpenAI": {
    "ApiKey": "sk-your-openai-api-key-here",
    "Model": "gpt-4",
    "MaxTokens": 500,
    "Temperature": 0.7
  },
  
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000"
    ]
  }
}
```

---

## 📋 **Configuration Steps**

### **1. Get Supabase Credentials**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → `VITE_SUPABASE_URL` and `Supabase.Url`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY` (frontend only)
   - **service_role key** → `Supabase.Key` (backend only - keep secret!)

5. Navigate to **Settings** → **Database**
   - Copy **Connection String** (use "Connection Pooling" mode)
   - Use for `ConnectionStrings.DefaultConnection`

### **2. Setup Gmail (Optional - for email notifications)**

1. Enable 2-Factor Authentication on your Google account
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create app password named "You & Me Expenses"
4. Copy the 16-character password
5. Use in `EmailSettings.Password`

**Required for:** Bill reminders, budget alerts, loan notifications  
**Optional:** App works fine without email features

### **3. Setup OpenAI (Optional - for chatbot)**

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create account or sign in
3. Create new API key
4. Copy the key (starts with `sk-`)
5. Use in `OpenAI.ApiKey`

**Required for:** AI Financial Chatbot  
**Optional:** App works fine without chatbot

---

## ✅ **Verification**

### **Check Frontend Config:**

```bash
cd frontend
cat .env  # Linux/Mac
type .env  # Windows

# Should show your actual values (not template text)
```

### **Check Backend Config:**

```bash
cd backend/YouAndMeExpensesAPI
cat appsettings.Development.json  # Linux/Mac
type appsettings.Development.json  # Windows

# Should show your actual values
```

### **Test Connection:**

```bash
# Start backend
cd backend/YouAndMeExpensesAPI
dotnet run

# In new terminal, start frontend
cd frontend
npm run dev

# Open browser to http://localhost:5173
# Try logging in - if successful, configuration is correct!
```

---

## 🚨 **Security Warnings**

### **CRITICAL - Never commit these files:**
- ❌ `frontend/.env`
- ❌ `backend/YouAndMeExpensesAPI/appsettings.Development.json`
- ❌ `backend/YouAndMeExpensesAPI/appsettings.Production.json`

### **Safe to commit:**
- ✅ `frontend/.env.example`
- ✅ `backend/YouAndMeExpensesAPI/appsettings.Example.json`
- ✅ `backend/YouAndMeExpensesAPI/appsettings.json` (no secrets)

### **Key Security Rules:**
1. **Service Role Key** is admin-level - never expose it
2. **Anon Key** is safe for frontend (designed for public use)
3. **Gmail App Password** is app-specific - never use regular password
4. **OpenAI Key** has billing attached - protect it
5. **Always use HTTPS** in production

---

## 🔄 **Updating Configuration**

### **When you change .env:**
```bash
# Frontend requires dev server restart
npm run dev
```

### **When you change appsettings:**
```bash
# Backend requires restart
dotnet run
```

### **Best Practice:**
- Keep development and production configs separate
- Use environment-specific files
- Document any custom variables
- Test after every change

---

## 📞 **Troubleshooting**

### **Problem: "Supabase is not defined"**
**Solution:** Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly

### **Problem: "CORS error"**
**Solution:** Add your frontend URL to `Cors.AllowedOrigins` in backend config

### **Problem: "Email not sending"**
**Solution:** 
- Verify Gmail app password (not regular password)
- Check 2FA is enabled
- Verify SMTP settings
- Check email in backend logs

### **Problem: "Chatbot returns errors"**
**Solution:**
- Verify OpenAI API key
- Check you have credits
- Check API quota limits
- Review backend logs

### **Problem: "Database connection failed"**
**Solution:**
- Check connection string format
- Verify Supabase project is running
- Check database password
- Use "Connection Pooling" mode from Supabase

---

## 📚 **Related Documentation**

- [HOW_TO_RUN.md](./HOW_TO_RUN.md) - Complete setup guide
- [GMAIL_SETUP.md](./GMAIL_SETUP.md) - Detailed Gmail setup
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase configuration
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment

---

**Remember:** Keep your secrets secret! 🔒  
**Never commit `.env` or `appsettings.Development.json` to git!**

---

*Last Updated: December 4, 2025*

