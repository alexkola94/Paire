# Two-Factor Authentication (2FA) Implementation

## Overview

Your app now includes **TOTP-based Two-Factor Authentication (2FA)** for enhanced security. This implementation uses industry-standard Time-based One-Time Passwords (TOTP), compatible with popular authenticator apps like:

- 🔐 Google Authenticator
- 🔐 Microsoft Authenticator  
- 🔐 Authy
- 🔐 1Password
- 🔐 Any RFC 6238 compliant authenticator

---

## 🚀 Features Implemented

### Backend (.NET 7)

✅ **NuGet Packages Added:**
- `Otp.NET` v1.4.0 - TOTP generation and verification
- `QRCoder` v1.6.0 - QR code generation

✅ **Database Changes:**
- New fields in `ApplicationUser`:
  - `TwoFactorSecret` - Base32 encoded TOTP secret
  - `BackupCodes` - JSON array of hashed recovery codes

✅ **New API Endpoints:**
```
POST /api/auth/2fa/setup              - Initialize 2FA setup (returns QR code)
POST /api/auth/2fa/enable             - Verify and enable 2FA
POST /api/auth/2fa/disable            - Disable 2FA (requires password)
POST /api/auth/2fa/verify             - Verify 2FA code during login
POST /api/auth/2fa/verify-backup      - Verify backup code during login
POST /api/auth/2fa/regenerate-backup-codes - Generate new backup codes
GET  /api/auth/2fa/status             - Check 2FA status
```

✅ **Enhanced Login Flow:**
- Password verification returns temp token if 2FA enabled
- Separate 2FA verification step required
- Support for backup codes

### Frontend (React)

✅ **New Components:**
- `TwoFactorSetup.jsx` - 2FA configuration in Profile page
- `TwoFactorVerification.jsx` - Login verification screen

✅ **NPM Packages Added:**
- `qrcode.react` - QR code display
- `react-otp-input` - User-friendly OTP input

✅ **Responsive Design:**
- Mobile-friendly OTP input
- Tablet and desktop optimized layouts
- Smooth animations and transitions

✅ **Complete Translations:**
- English translations added to `en.json`

---

## 📖 User Guide

### For Users: How to Enable 2FA

1. **Navigate to Profile Page**
   - Click on your profile icon
   - Scroll to "Two-Factor Authentication" section

2. **Start Setup**
   - Click "Enable 2FA" button
   - A QR code will appear

3. **Scan QR Code**
   - Open your authenticator app
   - Scan the QR code OR enter the manual key shown below it
   - Your app will start generating 6-digit codes

4. **Verify Setup**
   - Enter the current 6-digit code from your authenticator app
   - Click "Verify & Enable"

5. **Save Backup Codes**
   - **IMPORTANT:** You'll receive 10 backup recovery codes
   - Download or copy these codes to a safe place
   - Each code can only be used once
   - These are your only way to access your account if you lose your authenticator device

### For Users: How to Login with 2FA

1. **Enter Email & Password**
   - Login normally with your credentials

2. **Enter 2FA Code**
   - After password verification, you'll see the 2FA screen
   - Open your authenticator app
   - Enter the current 6-digit code
   - Click "Verify"

3. **Using Backup Code (Lost Device)**
   - If you lost your authenticator device, click "Use Backup Code"
   - Enter one of your saved backup recovery codes
   - **Note:** Each backup code can only be used once

### For Users: How to Disable 2FA

1. **Go to Profile Page**
   - Navigate to "Two-Factor Authentication" section

2. **Click "Disable 2FA"**
   - Enter your password to confirm
   - Click "Yes, Disable 2FA"

---

## 🔧 Developer Guide

### Database Migration

After pulling these changes, run the migration:

```bash
cd backend/YouAndMeExpensesAPI
dotnet ef database update
```

This adds the `TwoFactorSecret` and `BackupCodes` columns to the `AspNetUsers` table.

### Backend Architecture

#### 2FA Service (`TwoFactorAuthService.cs`)

**Key Methods:**
```csharp
// Generate new TOTP secret (Base32 encoded)
string GenerateSecret()

// Create QR code image (data URI)
string GenerateQrCode(string email, string secret, string issuer)

// Verify 6-digit TOTP code (allows ±1 time window for drift)
bool VerifyCode(string secret, string code)

// Generate 10 backup codes (16 chars each, formatted XXXX-XXXX)
List<string> GenerateBackupCodes(int count = 10)

// Hash backup code using SHA256
string HashBackupCode(string code)

// Verify backup code against hashed list
bool VerifyBackupCode(string code, List<string> hashedCodes)
```

#### Security Features

✅ **Time Window Tolerance:** Allows ±30 seconds for clock drift  
✅ **Secure Secret Generation:** 160-bit random keys  
✅ **Backup Code Hashing:** SHA256 for secure storage  
✅ **Password Confirmation:** Required for disabling 2FA  
✅ **Temporary Tokens:** 5-minute validity for login flow  

### Frontend Integration

#### Using TwoFactorSetup Component

Add to your Profile page:

```jsx
import TwoFactorSetup from '../components/TwoFactorSetup';

// In your Profile component
const [user, setUser] = useState(null);

<TwoFactorSetup 
  isEnabled={user?.twoFactorEnabled || false}
  onStatusChange={(enabled) => {
    // Update user state
    setUser(prev => ({ ...prev, twoFactorEnabled: enabled }));
  }}
/>
```

#### Using TwoFactorVerification Component

Update your Login page:

```jsx
import TwoFactorVerification from '../components/TwoFactorVerification';

const [requires2FA, setRequires2FA] = useState(false);
const [tempToken, setTempToken] = useState('');
const [email, setEmail] = useState('');

// After password verification
if (loginResponse.requiresTwoFactor) {
  setRequires2FA(true);
  setTempToken(loginResponse.tempToken);
  setEmail(formData.email);
}

// Render verification screen
{requires2FA && (
  <TwoFactorVerification
    email={email}
    tempToken={tempToken}
    onSuccess={(authData) => {
      // Login successful, redirect to dashboard
      localStorage.setItem('token', authData.token);
      navigate('/dashboard');
    }}
    onCancel={() => {
      setRequires2FA(false);
      setTempToken('');
    }}
  />
)}
```

---

## 🔒 Security Considerations

### Best Practices Implemented

✅ **TOTP Standard (RFC 6238):** Industry-standard algorithm  
✅ **QR Code Security:** Secret never leaves server unencrypted  
✅ **Backup Codes:** Hashed with SHA256, never stored in plain text  
✅ **Rate Limiting:** Consider adding to prevent brute force  
✅ **Audit Logging:** Login attempts are logged  
✅ **Time Synchronization:** Server time used for TOTP validation  

### Recommendations

1. **Enable HTTPS:** Always use TLS in production
2. **Rate Limiting:** Add rate limiting to 2FA verification endpoints
3. **Session Management:** Invalidate sessions on 2FA status change
4. **Email Notifications:** Notify users when 2FA is enabled/disabled
5. **Recovery Flow:** Implement account recovery for lost 2FA devices

---

## 🧪 Testing Guide

### Manual Testing Steps

1. **Setup Flow:**
   ```
   ✓ User can access 2FA setup in Profile
   ✓ QR code displays correctly
   ✓ Manual entry key is shown
   ✓ Invalid code shows error
   ✓ Valid code enables 2FA
   ✓ Backup codes are displayed
   ✓ Backup codes can be downloaded
   ```

2. **Login Flow:**
   ```
   ✓ User with 2FA enabled sees verification screen
   ✓ Valid 6-digit code allows login
   ✓ Invalid code shows error
   ✓ Can switch to backup code entry
   ✓ Valid backup code allows login
   ✓ Used backup code is removed
   ```

3. **Disable Flow:**
   ```
   ✓ Requires password confirmation
   ✓ Invalid password shows error
   ✓ Successfully disables 2FA
   ✓ Can login without 2FA after disable
   ```

### Test Accounts

For testing, you can use these authenticator apps:
- **Google Authenticator** (Mobile: iOS/Android)
- **Microsoft Authenticator** (Mobile: iOS/Android)
- **Authy** (Mobile + Desktop)

---

## 🐛 Troubleshooting

### Common Issues

**Q: "Invalid verification code" error**  
A: Check that your server time is synchronized (TOTP requires accurate time). Time drift of more than 30 seconds will cause issues.

**Q: QR code not displaying**  
A: Ensure the `QRCoder` package is properly installed and the response is correctly formatted as a data URI.

**Q: Backup codes don't work**  
A: Verify that codes are being hashed consistently and check for case sensitivity issues.

**Q: 2FA fields not in database**  
A: Run the database migration: `dotnet ef database update`

---

## 📊 Database Schema

```sql
-- New columns in AspNetUsers table
ALTER TABLE AspNetUsers 
ADD TwoFactorSecret NVARCHAR(MAX) NULL,
    BackupCodes NVARCHAR(MAX) NULL;
```

**Note:** `TwoFactorEnabled` already exists in ASP.NET Identity's `IdentityUser` class.

---

## 🎨 Styling

The 2FA components use your existing CSS variables for theming:
- `--primary-color`
- `--card-bg`
- `--text-primary`
- `--text-secondary`
- `--error-color`
- `--success-color`

All components are fully responsive with smooth transitions.

---

## 📝 API Examples

### Enable 2FA

```bash
# 1. Setup (get QR code)
curl -X POST http://localhost:5000/api/auth/2fa/setup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCodeUrl": "data:image/png;base64,...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}

# 2. Verify and enable
curl -X POST http://localhost:5000/api/auth/2fa/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# Response:
{
  "codes": [
    "A1B2C3D4-E5F6G7H8",
    "I9J0K1L2-M3N4O5P6",
    ...
  ],
  "message": "Two-factor authentication enabled successfully!"
}
```

### Login with 2FA

```bash
# 1. Login (password)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response (2FA required):
{
  "requiresTwoFactor": true,
  "tempToken": "TEMP_TOKEN_HERE",
  "message": "Two-factor authentication required"
}

# 2. Verify 2FA
curl -X POST http://localhost:5000/api/auth/2fa/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "tempToken": "TEMP_TOKEN_HERE"
  }'

# Response (success):
{
  "token": "JWT_TOKEN",
  "refreshToken": "REFRESH_TOKEN",
  "expires": "2024-12-06T12:00:00Z",
  "user": { ... }
}
```

---

## 🎉 Summary

Your Expenses app now has enterprise-grade two-factor authentication! This feature:
- ✅ **Protects sensitive financial data** with an additional security layer
- ✅ **Works offline** - no SMS or internet required after setup
- ✅ **Compatible** with all major authenticator apps
- ✅ **User-friendly** with QR codes and backup codes
- ✅ **Free** - no external API dependencies or costs

Users can now secure their accounts, especially important for financial applications handling sensitive transaction data, loans, and partnership information.

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the browser console for frontend errors
3. Check backend logs for API errors
4. Verify database migration was applied

Enjoy your enhanced security! 🔒✨

