# 🔧 Environment Variables Setup Guide

This guide explains how to configure environment variables for both frontend and backend.

---

## 📁 **Files Overview**

### **Frontend:**
- **Template:** `frontend/.env.example`
- **Your file:** `frontend/.env` (create this from template)
- **Variables:** All start with `VITE_`

### **Backend:**
- **Template:** `backend/YouAndMeExpensesAPI/appsettings.Example.json`
- **Your file:** `backend/YouAndMeExpensesAPI/appsettings.Development.json` (create this)
- **Format:** JSON configuration file

---

## 🎯 **Quick Setup**

### **Step 1: Frontend Environment**

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_BACKEND_API_URL=http://localhost:5038
```

### **Step 2: Backend Configuration**

```bash
cd backend/YouAndMeExpensesAPI
cp appsettings.Example.json appsettings.Development.json
```

Edit `appsettings.Development.json` with your credentials.

---

## 🔑 **Getting Credentials**

### **Supabase Credentials:**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → Use for `VITE_SUPABASE_URL` and `Supabase.Url`
   - **anon/public key** → Use for `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → Use for `Supabase.Key` (backend only)
5. Go to **Settings** → **Database**
   - Copy **Connection String** (use "Connection Pooling" mode)

### **Gmail App Password (For Email Reminders):**

1. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Sign in with your Google account
3. Create a new app password
4. Name it "You & Me Expenses"
5. Copy the 16-character password
6. Use this in `EmailSettings.Password`

**Note:** You need 2-Factor Authentication enabled on your Google account.

### **OpenAI API Key (For Chatbot):**

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Use this in `OpenAI.ApiKey`

**Note:** OpenAI has free trial credits, then it's pay-as-you-go.

---

## 📝 **Frontend Variables Explained**

### **Required:**

```env
# Supabase project URL
VITE_SUPABASE_URL=https://xxxxx.supabase.co

# Supabase public/anon key (safe to expose in frontend)
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Backend API URL
VITE_BACKEND_API_URL=http://localhost:5038
```

### **Optional:**

```env
# Application environment
VITE_APP_ENV=development

# Enable debug logging
VITE_DEBUG=false

# Feature toggles
VITE_ENABLE_CHATBOT=true
VITE_ENABLE_REMINDERS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PARTNERSHIP=true
```

---

## 📝 **Backend Configuration Explained**

### **Supabase Section:**

```json
"Supabase": {
  "Url": "https://xxxxx.supabase.co",
  "Key": "eyJhbGci... (SERVICE ROLE KEY - keep secret!)",
  "Schema": "public"
}
```

⚠️ **Warning:** Use service_role key, not anon key!

### **Database Connection:**

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.xxxxx;Password=your-password"
}
```

Get this from Supabase → Settings → Database → Connection String (Use "Connection Pooling" mode).

### **Email Settings:**

```json
"EmailSettings": {
  "SmtpServer": "smtp.gmail.com",
  "SmtpPort": 587,
  "SenderEmail": "your-email@gmail.com",
  "SenderName": "You & Me Expenses",
  "Username": "your-email@gmail.com",
  "Password": "your-16-char-app-password",
  "EnableSsl": true
}
```

**Required for:** Bill reminders, loan reminders, budget alerts.  
**Optional:** App works without email, just no notifications.

### **OpenAI Settings:**

```json
"OpenAI": {
  "ApiKey": "sk-your-api-key",
  "Model": "gpt-4",
  "MaxTokens": 500,
  "Temperature": 0.7
}
```

**Required for:** AI Chatbot feature.  
**Optional:** App works without chatbot.

### **CORS Settings:**

```json
"Cors": {
  "AllowedOrigins": [
    "http://localhost:5173",
    "https://your-production-domain.com"
  ]
}
```

Add your frontend URLs here.

---

## ✅ **Verification Checklist**

### **Frontend:**
- [ ] `.env` file created from `.env.example`
- [ ] Supabase URL is correct
- [ ] Supabase anon key is correct
- [ ] Backend API URL points to running backend
- [ ] No `.env` file committed to git
- [ ] Dev server restarted after changes

### **Backend:**
- [ ] `appsettings.Development.json` created
- [ ] Supabase URL is correct
- [ ] Supabase service_role key is used (not anon key)
- [ ] Database connection string is correct
- [ ] Gmail app password is set (if using email)
- [ ] OpenAI API key is set (if using chatbot)
- [ ] CORS origins include your frontend URL
- [ ] No sensitive files committed to git
- [ ] API restarted after changes

---

## 🐛 **Common Issues**

### **"Failed to fetch" errors:**
- ✅ Check backend is running (`dotnet run`)
- ✅ Check `VITE_BACKEND_API_URL` matches backend URL
- ✅ Check CORS settings in backend
- ✅ Check browser console for CORS errors

### **"Unauthorized" errors:**
- ✅ Check Supabase credentials are correct
- ✅ Check user is logged in
- ✅ Check RLS policies in Supabase

### **Email not sending:**
- ✅ Check Gmail app password (not regular password)
- ✅ Check 2FA is enabled on Google account
- ✅ Check SMTP settings are correct
- ✅ Check firewall isn't blocking port 587

### **Chatbot not working:**
- ✅ Check OpenAI API key is valid
- ✅ Check you have credits in OpenAI account
- ✅ Check API key starts with `sk-`
- ✅ Check network connection

---

## 🔒 **Security Best Practices**

### **DO:**
✅ Use different credentials for development and production  
✅ Keep `.env` and `appsettings.Development.json` in `.gitignore`  
✅ Use app-specific passwords (Gmail)  
✅ Rotate keys regularly  
✅ Use environment-specific configurations  

### **DON'T:**
❌ Commit `.env` files to git  
❌ Share your service_role key publicly  
❌ Use production credentials in development  
❌ Hardcode secrets in code  
❌ Use regular Gmail password (use app password)  

---

## 📖 **Environment File Locations**

```
You-me-Expenses/
├── frontend/
│   ├── .env.example          ← Template (commit this)
│   └── .env                  ← Your config (DO NOT commit)
│
└── backend/YouAndMeExpensesAPI/
    ├── appsettings.json              ← Base config (commit this)
    ├── appsettings.Example.json      ← Template (commit this)
    └── appsettings.Development.json  ← Your config (DO NOT commit)
```

---

## 🆘 **Need Help?**

1. **Check existing docs:**
   - [HOW_TO_RUN.md](./docs/HOW_TO_RUN.md)
   - [SETUP.md](./docs/SETUP.md)
   - [GMAIL_SETUP.md](./docs/GMAIL_SETUP.md)

2. **Common solutions:**
   - Restart both frontend and backend
   - Clear browser cache
   - Check Supabase dashboard for errors
   - Verify all credentials are correct

3. **Still stuck?**
   - Check terminal output for errors
   - Check browser console (F12)
   - Review Supabase logs
   - Open an issue on GitHub

---

## 🎯 **Quick Commands**

### **Copy & Configure Frontend:**
```bash
cd frontend
cp .env.example .env
nano .env  # or use your preferred editor
npm run dev
```

### **Copy & Configure Backend:**
```bash
cd backend/YouAndMeExpensesAPI
cp appsettings.Example.json appsettings.Development.json
# Edit with Visual Studio or your preferred editor
dotnet run
```

---

**Remember:** Environment files contain sensitive information. Never commit them to version control! 🔒

---

*Last Updated: December 4, 2025*

