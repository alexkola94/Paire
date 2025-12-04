# Quick Start: Email Reminders System

## ⚡ 5-Minute Setup

### 1. Run Database Migration (1 min)

```bash
cd supabase
supabase migration up
```

### 2. Configure Gmail (2 min)

1. Enable 2FA on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update `backend/YouAndMeExpensesAPI/appsettings.json`:

```json
{
  "EmailSettings": {
    "Username": "your-email@gmail.com",
    "Password": "your-16-char-app-password",
    "SenderEmail": "your-email@gmail.com"
  }
}
```

### 3. Start Backend API (1 min)

```bash
cd backend/YouAndMeExpensesAPI
dotnet run
```

### 4. Test Email (1 min)

```bash
curl -X POST "http://localhost:5000/api/reminders/test-email?email=your-email@gmail.com"
```

Check your inbox! ✅

---

## 📋 What Was Implemented

### Backend
- ✅ Gmail SMTP email service (MailKit)
- ✅ 4 reminder types (bills, loans, budgets, savings)
- ✅ User preference management
- ✅ Background service (daily 9 AM checks)
- ✅ 8 API endpoints

### Frontend
- ✅ Reminder Settings page
- ✅ Toggle switches for preferences
- ✅ Test email button
- ✅ Mobile responsive design

### Database
- ✅ 7 new tables
- ✅ RLS policies
- ✅ Performance indexes
- ✅ Updated transactions & loans tables

---

## 🔗 Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reminders/test-email` | POST | Send test email |
| `/api/reminders/settings` | GET | Get preferences |
| `/api/reminders/settings` | PUT | Update preferences |
| `/api/reminders/check` | POST | Manual reminder check |
| `/health` | GET | API health status |

---

## 📧 Reminder Types

1. **Bills** - 3 days before due (configurable)
2. **Loans** - 7 days before due (configurable)
3. **Budget** - When 90% spent (configurable)
4. **Savings** - Milestone achievements

---

## 🎨 Frontend Integration

Add to `frontend/src/App.jsx`:

```jsx
import ReminderSettings from './pages/ReminderSettings'

// In routes:
<Route path="/reminders" element={<ReminderSettings />} />
```

Add to navigation menu:

```jsx
<Link to="/reminders">⚙️ Reminder Settings</Link>
```

---

## 🔧 Enable Daily Auto-Reminders

Uncomment in `Program.cs` (line ~99):

```csharp
builder.Services.AddHostedService<ReminderBackgroundService>();
```

Runs daily at 9 AM automatically.

---

## 📚 Full Documentation

- **Setup Guide**: [`GMAIL_SETUP.md`](GMAIL_SETUP.md)
- **Complete Summary**: [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md)
- **Migration File**: [`supabase/migrations/20241204_enhanced_features.sql`](supabase/migrations/20241204_enhanced_features.sql)

---

## 🐛 Quick Troubleshooting

**Email not sending?**
- Check App Password is correct
- Ensure 2FA is enabled on Gmail
- Verify SMTP settings: `smtp.gmail.com:587`

**Migration failed?**
- Run manually in Supabase SQL Editor
- Check for syntax errors
- Verify Supabase connection

**API not starting?**
- Run `dotnet restore`
- Check for build errors
- Verify appsettings.json syntax

---

## ✅ Done!

Your email reminder system is ready to use! 🎉

Access:
- **API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000
- **Frontend**: Add route to access Reminder Settings page

Test it, configure your preferences, and never miss a financial deadline again!

