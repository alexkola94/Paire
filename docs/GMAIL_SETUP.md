# Gmail SMTP Setup Guide for You & Me Expenses

This guide will help you set up Gmail SMTP for sending email reminders in the You & Me Expenses application.

## Prerequisites

- A Gmail account
- Access to Google Account settings
- Backend API running (YouAndMeExpensesAPI)

## Step 1: Enable 2-Factor Authentication on Gmail

Gmail requires 2-Factor Authentication (2FA) to generate App Passwords.

1. Go to your [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** in the left sidebar
3. Under "How you sign in to Google", find **2-Step Verification**
4. Click **Get Started** and follow the setup process
5. Verify using your phone number or authenticator app

## Step 2: Generate App Password

Once 2FA is enabled, you can create an App Password for the application.

1. Return to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", find **App passwords**
   - If you don't see this option, ensure 2FA is enabled
3. Click **App passwords**
4. You may need to sign in again
5. Under "Select app", choose **Mail**
6. Under "Select device", choose **Other (Custom name)**
7. Enter a name like: `You and Me Expenses App`
8. Click **Generate**
9. **Copy the 16-character password** (spaces will be included, you can remove them)
   - Example: `abcd efgh ijkl mnop` or `abcdefghijklmnop`
10. **IMPORTANT**: Save this password securely - you won't be able to see it again!

## Step 3: Configure Backend API

Update your `appsettings.json` file in the `backend/YouAndMeExpensesAPI` directory.

### Option A: Direct Configuration (Development Only)

**⚠️ NOT RECOMMENDED for production or version control!**

Edit `backend/YouAndMeExpensesAPI/appsettings.json`:

```json
{
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "your-email@gmail.com",
    "SenderName": "You & Me Expenses",
    "Username": "your-email@gmail.com",
    "Password": "your-app-password-here",
    "EnableSsl": true
  }
}
```

Replace:
- `your-email@gmail.com` with your actual Gmail address
- `your-app-password-here` with the 16-character App Password from Step 2

### Option B: Environment Variables (Recommended)

For better security, use environment variables:

**Windows (PowerShell):**
```powershell
$env:EMAIL_USERNAME = "your-email@gmail.com"
$env:EMAIL_PASSWORD = "your-app-password"
```

**Linux/Mac (Bash):**
```bash
export EMAIL_USERNAME="your-email@gmail.com"
export EMAIL_PASSWORD="your-app-password"
```

Then update `appsettings.json` to use environment variables:

```json
{
  "EmailSettings": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "${EMAIL_USERNAME}",
    "SenderName": "You & Me Expenses",
    "Username": "${EMAIL_USERNAME}",
    "Password": "${EMAIL_PASSWORD}",
    "EnableSsl": true
  }
}
```

### Option C: User Secrets (Recommended for Development)

Use .NET User Secrets to store sensitive data:

```bash
cd backend/YouAndMeExpensesAPI
dotnet user-secrets init
dotnet user-secrets set "EmailSettings:Username" "your-email@gmail.com"
dotnet user-secrets set "EmailSettings:Password" "your-app-password"
dotnet user-secrets set "EmailSettings:SenderEmail" "your-email@gmail.com"
```

## Step 4: Test Email Configuration

Once configured, test the email setup:

### Using API Endpoint

```bash
# Send a test email
curl -X POST "http://localhost:5000/api/reminders/test-email?email=your-test-email@gmail.com"
```

### Using Frontend (when implemented)

1. Navigate to Reminder Settings page
2. Click "Send Test Email" button
3. Check your inbox for the test email

## Step 5: Configure Reminder Preferences

After successful email setup, configure your reminder preferences:

### Via API:

```bash
# Get current settings
curl "http://localhost:5000/api/reminders/settings?userId=YOUR_USER_ID"

# Update settings
curl -X PUT "http://localhost:5000/api/reminders/settings?userId=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "emailEnabled": true,
    "billRemindersEnabled": true,
    "billReminderDays": 3,
    "loanRemindersEnabled": true,
    "loanReminderDays": 7,
    "budgetAlertsEnabled": true,
    "budgetAlertThreshold": 90,
    "savingsMilestonesEnabled": true
  }'
```

## Troubleshooting

### Issue: "Authentication failed"

**Possible causes:**
1. App Password is incorrect
   - **Solution**: Generate a new App Password and update configuration
2. 2FA is not enabled
   - **Solution**: Enable 2-Step Verification on your Google Account
3. Username/email doesn't match
   - **Solution**: Ensure both `Username` and `SenderEmail` are the same Gmail address

### Issue: "SMTP server connection failed"

**Possible causes:**
1. Firewall blocking port 587
   - **Solution**: Check firewall settings and allow outbound connections on port 587
2. Network issues
   - **Solution**: Verify internet connection and try again
3. Gmail SMTP temporarily unavailable
   - **Solution**: Wait a few minutes and retry

### Issue: "Emails not being sent"

**Possible causes:**
1. Daily sending limit reached (Gmail has limits)
   - **Solution**: Wait 24 hours or use a Google Workspace account (higher limits)
2. Email marked as spam by Gmail
   - **Solution**: Add a custom domain or use Google Workspace
3. Email service not running
   - **Solution**: Check backend logs for errors

### Issue: "Could not authenticate"

**Possible causes:**
1. "Less secure app access" is disabled
   - **Solution**: Use App Passwords instead (more secure)
2. Recent password change
   - **Solution**: Generate a new App Password

## Security Best Practices

### ✅ DO:
- Use App Passwords instead of your actual Gmail password
- Store credentials in environment variables or user secrets
- Use different App Passwords for different applications
- Revoke App Passwords when no longer needed
- Enable 2-Factor Authentication on your Gmail account
- Use a dedicated email account for application notifications

### ❌ DON'T:
- Commit credentials to version control (Git)
- Share your App Password with anyone
- Use your main Gmail password in the application
- Store passwords in plain text configuration files
- Disable 2-Factor Authentication

## Gmail Sending Limits

**Free Gmail Account:**
- 500 emails per day
- 100 recipients per email

**Google Workspace:**
- 2,000 emails per day
- 100 recipients per email

If you exceed these limits, consider:
1. Using a dedicated email service (SendGrid, Mailgun, AWS SES)
2. Upgrading to Google Workspace
3. Reducing reminder frequency

## Alternative: Using Google Workspace

If you have a Google Workspace account, the setup is similar:

1. Enable 2FA on your Workspace account
2. Generate an App Password
3. Use your workspace email: `your-name@yourdomain.com`
4. Follow the same configuration steps above

**Benefits:**
- Higher sending limits
- Custom domain email addresses
- Better deliverability
- Professional appearance

## Revoking App Passwords

If you need to revoke access:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click **App passwords**
3. Find "You and Me Expenses App"
4. Click the ❌ to revoke
5. Generate a new one if needed

## Next Steps

After successful setup:

1. ✅ Test email sending with the test endpoint
2. ✅ Run the Supabase migration to create reminder_preferences table
3. ✅ Configure your reminder preferences
4. ✅ Enable the background service for daily reminders
5. ✅ Monitor email logs for successful deliveries

## Need Help?

If you encounter issues:

1. Check the backend logs: `backend/YouAndMeExpensesAPI/logs/`
2. Verify Gmail settings are correct
3. Test with a simple curl command
4. Check [Gmail SMTP documentation](https://support.google.com/mail/answer/7126229)
5. Review [App Passwords FAQ](https://support.google.com/accounts/answer/185833)

## Additional Resources

- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Google App Passwords Help](https://support.google.com/accounts/answer/185833)
- [MailKit Documentation](https://github.com/jstedfast/MailKit)
- [2-Step Verification Setup](https://support.google.com/accounts/answer/185839)

---

**Note**: This setup uses Gmail's SMTP server for development and small-scale use. For production applications with high email volume, consider using dedicated email services like SendGrid, AWS SES, or Mailgun.

