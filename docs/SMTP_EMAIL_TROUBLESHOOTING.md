# SMTP Email Configuration Troubleshooting

## Problem: Emails Not Sending

If emails are not being sent (registration confirmations, password resets, etc.), check your SMTP configuration in Render.com.

---

## Step 1: Verify Environment Variables in Render.com

Go to [Render Dashboard](https://dashboard.render.com) → Your Service → **Environment** tab

### Required Environment Variables:

```bash
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=your-email@gmail.com
EmailSettings__SenderName=Paire
EmailSettings__Username=your-email@gmail.com
EmailSettings__Password=xxxx xxxx xxxx xxxx
EmailSettings__EnableSsl=true
```

**⚠️ Important:**
- Use **double underscores** (`__`) between `EmailSettings` and the property name
- `Password` must be a **Gmail App Password**, not your regular Gmail password
- All values are **case-sensitive**

---

## Step 2: Get Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Factor Authentication** (if not already enabled)
3. Go to **App Passwords** section
4. Click **Generate** new app password
5. Select app: **Mail**
6. Select device: **Other (Custom name)** → Enter "Paire API"
7. Click **Generate**
8. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)
9. Use this password in `EmailSettings__Password` (you can include or remove spaces)

---

## Step 3: Check Render Logs

After setting environment variables, check Render logs for:

### ✅ Success Message:
```
✅ Email settings configured: Server=smtp.gmail.com, Port=587, From=your-email@gmail.com
```

### ❌ Error Messages:

**Missing Configuration:**
```
⚠️ Email settings are incomplete. Missing: SmtpServer, Username, Password
```

**Connection Timeout:**
```
❌ SMTP connection timeout when sending email to user@example.com
```

**Authentication Failed:**
```
❌ SMTP authentication failed. Check: 1) Username is correct, 2) Password is a Gmail App Password
```

---

## Step 4: Common Issues and Fixes

### Issue 1: "Email settings are incomplete"

**Cause:** Environment variables not set or incorrectly named.

**Fix:**
- Verify variable names use double underscores: `EmailSettings__SmtpServer` (not `EmailSettings_SmtpServer`)
- Check all required variables are set
- Redeploy service after adding variables

### Issue 2: "SMTP connection timeout"

**Cause:** Cannot connect to Gmail SMTP server.

**Possible Reasons:**
- Wrong SMTP server address
- Wrong port number
- Firewall blocking outbound connections
- Network issues

**Fix:**
- Verify `EmailSettings__SmtpServer=smtp.gmail.com` (exact spelling)
- Verify `EmailSettings__SmtpPort=587` (for TLS) or `465` (for SSL)
- Check Render.com allows outbound SMTP connections (should be enabled by default)

### Issue 3: "SMTP authentication failed"

**Cause:** Wrong credentials.

**Possible Reasons:**
- Using regular Gmail password instead of App Password
- Wrong username
- 2FA not enabled on Gmail account

**Fix:**
- Generate a new Gmail App Password (see Step 2)
- Verify `EmailSettings__Username` matches your Gmail address exactly
- Ensure 2FA is enabled on your Gmail account

### Issue 4: "Cannot access a disposed object" (UserManager)

**Cause:** This is a code issue, not SMTP configuration.

**Status:** ✅ Already fixed in latest code

---

## Step 5: Test Email Configuration

After configuring, test by:

1. **Register a new user** - Should receive confirmation email
2. **Request password reset** - Should receive reset email
3. **Check Render logs** - Look for email sending attempts and results

---

## Alternative: Use Different SMTP Provider

If Gmail doesn't work, you can use other SMTP providers:

### Outlook/Hotmail:
```bash
EmailSettings__SmtpServer=smtp-mail.outlook.com
EmailSettings__SmtpPort=587
EmailSettings__EnableSsl=true
```

### SendGrid:
```bash
EmailSettings__SmtpServer=smtp.sendgrid.net
EmailSettings__SmtpPort=587
EmailSettings__Username=apikey
EmailSettings__Password=your_sendgrid_api_key
```

### Mailgun:
```bash
EmailSettings__SmtpServer=smtp.mailgun.org
EmailSettings__SmtpPort=587
EmailSettings__Username=your_mailgun_username
EmailSettings__Password=your_mailgun_password
```

---

## Quick Checklist

- [ ] All 7 email environment variables are set in Render.com
- [ ] Variable names use double underscores (`EmailSettings__SmtpServer`)
- [ ] Gmail App Password is generated (not regular password)
- [ ] 2FA is enabled on Gmail account
- [ ] Service has been redeployed after adding variables
- [ ] Render logs show "✅ Email settings configured"
- [ ] Test registration to verify emails are sent

---

## Still Not Working?

1. **Check Render Logs:**
   - Look for email-related error messages
   - Check if email service is being called
   - Verify configuration is loaded

2. **Verify Environment Variables:**
   - Render Dashboard → Environment tab
   - Check for typos in variable names
   - Ensure values don't have extra spaces

3. **Test SMTP Connection:**
   - Try a different email provider
   - Verify SMTP server and port are correct
   - Check if firewall is blocking connections

4. **Check Email Service Logs:**
   - Look for detailed error messages
   - Check exception types (timeout, auth, etc.)

---

## Related Documentation

- [Production Deployment Plan](./PRODUCTION_DEPLOYMENT_PLAN.md)
- [Backend 500 Error Troubleshooting](./BACKEND_500_ERROR_TROUBLESHOOTING.md)

