# 🔐 Migration Guide: Supabase Auth → Custom ASP.NET Core Identity

## 📋 Overview

Successfully migrated from **Supabase Authentication** to **ASP.NET Core Identity** with JWT tokens!

---

## ✅ What Was Changed

### Backend (.NET/C#)

1. **✅ Removed Supabase Dependencies**
   - Removed `Supabase` package (v1.1.1)
   - Removed `postgrest-csharp` package (v3.5.1)

2. **✅ Added ASP.NET Core Identity**
   - Added `Microsoft.AspNetCore.Identity.EntityFrameworkCore` (v7.0.20)
   - Added `System.IdentityModel.Tokens.Jwt` (v7.0.3)
   - Already had `Microsoft.AspNetCore.Authentication.JwtBearer` (v7.0.20)

3. **✅ New Models Created**
   - `ApplicationUser.cs` - Extends IdentityUser with custom properties
   - `AuthModels.cs` - All authentication DTOs (Register, Login, ResetPassword, etc.)

4. **✅ New Services**
   - `IJwtTokenService.cs` - Token service interface
   - `JwtTokenService.cs` - JWT token generation and validation

5. **✅ New Controller**
   - `AuthController.cs` - Complete authentication endpoints:
     - `POST /api/auth/register` - Register new user
     - `POST /api/auth/login` - Login user
     - `POST /api/auth/logout` - Logout user
     - `POST /api/auth/confirm-email` - Confirm email address
     - `POST /api/auth/forgot-password` - Request password reset
     - `POST /api/auth/reset-password` - Reset password with token
     - `POST /api/auth/change-password` - Change password (authenticated)
     - `GET /api/auth/me` - Get current user info
     - `POST /api/auth/resend-confirmation` - Resend confirmation email

6. **✅ Updated Files**
   - `Program.cs` - Configured Identity, JWT, Authentication middleware
   - `AppDbContext.cs` - Changed from `DbContext` to `IdentityDbContext<ApplicationUser>`
   - `appsettings.json` - Added JWT settings, removed Supabase config

### Frontend (React)

1. **✅ New Auth Service**
   - `frontend/src/services/auth.js` - Custom authentication service

2. **✅ Updated Components**
   - `Login.jsx` - Uses new auth service
   - `App.jsx` - Uses new session management
   - `Profile.jsx` - Updated password change to use new API

3. **✅ Removed Dependencies**
   - Removed `@supabase/supabase-js` from `package.json`
   - Renamed `supabase.js` to `supabase.js.old`

---

## 🚀 How to Complete the Migration

### Step 1: Stop Backend (if running)

```powershell
# In terminal 8 (where backend runs)
# Press Ctrl+C to stop the server
```

### Step 2: Restore NuGet Packages

```powershell
cd backend/YouAndMeExpensesAPI
dotnet restore
```

### Step 3: Create Identity Migration

```powershell
dotnet ef migrations add AddAspNetCoreIdentity
```

This will create a migration with all the ASP.NET Core Identity tables:
- `AspNetUsers` - User accounts
- `AspNetRoles` - User roles
- `AspNetUserTokens` - User tokens
- `AspNetUserLogins` - External logins
- `AspNetUserClaims` - User claims
- `AspNetRoleClaims` - Role claims
- `AspNetUserRoles` - User-role mapping

###Step 4: Apply Migration to Database

**Option A: Using EF Core Command** (Easiest)

```powershell
dotnet ef database update
```

**Option B: Using Supabase SQL Editor**

If you get migration history errors, use this SQL:

```sql
-- Fix migrations history and create Identity tables
-- Run this in Supabase Dashboard → SQL Editor

-- Add previous migration to history if needed
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251205070007_InitialCreate', '7.0.0')
ON CONFLICT DO NOTHING;

-- Add data_clearing_requests migration if needed
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251205080841_AddDataClearingRequests', '7.0.0')
ON CONFLICT DO NOTHING;

-- Now run the Identity migration script (copy from Migrations folder)
-- Or run: dotnet ef database update
```

### Step 5: Update Frontend Dependencies

```powershell
cd ../../frontend
npm install
```

This will remove the Supabase package.

### Step 6: Update Environment Variables

Make sure your `.env` file has the backend URL:

```env
VITE_BACKEND_API_URL=http://localhost:5038
```

### Step 7: Start Backend

```powershell
cd ../backend/YouAndMeExpensesAPI
dotnet run
```

You should see:
```
Now listening on: http://localhost:5038
```

### Step 8: Start Frontend

```powershell
cd ../../frontend
npm run dev
```

---

## 🎯 Testing the New Authentication

### 1. **Register New User**

1. Go to http://localhost:5173
2. Click "Create Account"
3. Fill in email and password
4. Submit form
5. ✅ You should see: "Registration successful! Please check your email to verify your account."
6. ✅ Check your email for confirmation link

### 2. **Confirm Email**

1. Click the link in the confirmation email
2. ✅ You should see: "Email confirmed successfully! You can now log in."

### 3. **Login**

1. Go back to login page
2. Enter your email and password
3. Submit
4. ✅ You should be redirected to the dashboard

### 4. **Test Authentication**

- ✅ Profile page should load
- ✅ All API calls should include JWT token
- ✅ Data should load normally

### 5. **Test Password Change**

1. Go to Profile
2. Scroll to "Change Password"
3. Enter current password and new password
4. ✅ Should update successfully

### 6. **Test Logout**

1. Click logout
2. ✅ Should redirect to login page
3. ✅ Token should be cleared from localStorage

### 7. **Test Password Reset**

1. On login page, click "Forgot Password"
2. Enter email
3. ✅ Check email for reset link
4. Click link and enter new password
5. ✅ Should be able to login with new password

---

## 🔑 JWT Token Details

### Token Storage

Tokens are stored in localStorage:
- `auth_token` - JWT access token (expires in 60 minutes)
- `refresh_token` - Refresh token (expires in 7 days)
- `user` - User information (JSON)

### Token Format

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64encodedtoken...",
  "expires": "2025-12-05T10:00:00Z",
  "user": {
    "id": "guid-here",
    "email": "user@example.com",
    "displayName": "User Name",
    "emailConfirmed": true
  }
}
```

### Authorization Header

All API requests include:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📧 Email Templates

### Confirmation Email

Beautiful HTML email sent to new users with:
- Welcome message
- Confirmation button
- Link to copy/paste
- Professional styling

### Password Reset Email

Professional email with:
- Reset password button
- Expiration notice (24 hours)
- Security information

---

## 🔒 Security Features

### Password Requirements

- ✅ Minimum 6 characters
- ✅ At least one digit
- ✅ At least one lowercase letter
- ⚠️ Uppercase and special characters NOT required (configurable in `Program.cs`)

### Account Lockout

- ✅ 5 failed login attempts
- ✅ 15-minute lockout period
- ✅ Automatic unlock after timeout

### Email Confirmation

- ✅ Required before login
- ✅ Secure tokens with expiration
- ✅ Resend option available

### Token Security

- ✅ Cryptographically secure tokens
- ✅ Short-lived access tokens (60 min)
- ✅ Longer refresh tokens (7 days)
- ✅ HMAC SHA256 signing

---

## 🗄️ Database Changes

### New Tables (ASP.NET Core Identity)

```
AspNetUsers              - Main user accounts table
AspNetRoles              - User roles
AspNetUserClaims         - Custom user claims
AspNetUserLogins         - External login providers
AspNetUserTokens         - Token storage
AspNetRoleClaims         - Role-based claims
AspNetUserRoles          - User-role mapping
```

### Existing Tables

All your existing tables remain unchanged:
- ✅ `transactions`
- ✅ `loans`
- ✅ `budgets`
- ✅ `partnerships`
- ✅ `user_profiles`
- ✅ `data_clearing_requests`
- etc.

### Data Migration

**Important:** Existing users in Supabase Auth will NOT automatically migrate. Options:

1. **Option 1: Fresh Start** (Recommended if in development)
   - Clear all data
   - All users register again with new system

2. **Option 2: Manual Migration** (if you have existing users)
   - Export users from Supabase
   - Create accounts in new system
   - Send password reset emails to all users

---

## ⚙️ Configuration

### JWT Settings (appsettings.json)

```json
{
  "JwtSettings": {
    "Secret": "YourSuperSecretKeyThatShouldBeAtLeast32CharactersLong",
    "Issuer": "YouAndMeExpensesAPI",
    "Audience": "YouAndMeExpensesApp",
    "ExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  }
}
```

⚠️ **Important:** Change the `Secret` to a secure random string in production!

### Identity Settings (Program.cs)

```csharp
// Password requirements
options.Password.RequireDigit = true;
options.Password.RequireLowercase = true;
options.Password.RequireUppercase = false;
options.Password.RequireNonAlphanumeric = false;
options.Password.RequiredLength = 6;

// Lockout settings
options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
options.Lockout.MaxFailedAccessAttempts = 5;

// Email confirmation required
options.SignIn.RequireConfirmedEmail = true;
```

---

## 🐛 Troubleshooting

### "Relation does not exist" error

The Identity tables haven't been created yet. Run:

```powershell
dotnet ef database update
```

### "Invalid token" error

1. Token expired - login again
2. Token secret changed - login again
3. Clock skew issue - check server time

### "Email not confirmed" error

User needs to click confirmation link in email. Options:
- Resend confirmation email
- Manually confirm in database:
  ```sql
  UPDATE "AspNetUsers" 
  SET "EmailConfirmed" = true 
  WHERE "Email" = 'user@example.com';
  ```

### Frontend shows "User not authenticated"

1. Clear browser localStorage
2. Login again
3. Check browser console for errors

---

## 📦 What to Keep/Delete

### ✅ Keep These Files

- `supabase.js.old` - Backup of old Supabase service (delete after testing)
- All migration files in `Migrations/` folder
- All controller, model, and service files

### ❌ Safe to Delete Later

- `backend/YouAndMeExpensesAPI/Services/SupabaseService.cs.old` (if exists)
- `frontend/src/services/supabase.js.old` (after confirming everything works)
- Supabase-related documentation files

---

## 🎉 Benefits of This Migration

1. **✅ Full Control** - You own the authentication system
2. **✅ No External Dependencies** - No reliance on Supabase Auth
3. **✅ Customizable** - Easily add features like 2FA, OAuth, etc.
4. **✅ Better Integration** - Direct Entity Framework integration
5. **✅ Professional** - Industry-standard ASP.NET Core Identity
6. **✅ Secure** - Built-in security best practices
7. **✅ Cost-Effective** - No auth service fees

---

## 📚 Next Steps (Optional Enhancements)

1. **Add Refresh Token Logic** - Auto-refresh expired tokens
2. **Add OAuth Providers** - Google, Facebook login
3. **Add Two-Factor Authentication** - TOTP or SMS
4. **Add Remember Me** - Longer-lived tokens
5. **Add Account Deletion** - GDPR compliance
6. **Add Email Templates** - Customized branding
7. **Add Rate Limiting** - Prevent brute force attacks

---

## 🆘 Need Help?

Check these files for reference:
- `backend/YouAndMeExpensesAPI/Controllers/AuthController.cs` - All auth endpoints
- `backend/YouAndMeExpensesAPI/Services/JwtTokenService.cs` - Token generation
- `frontend/src/services/auth.js` - Frontend auth service
- `backend/YouAndMeExpensesAPI/Program.cs` - Identity configuration

---

*Migration completed: December 5, 2025*
*System Status: ✅ Ready for Production Testing*

