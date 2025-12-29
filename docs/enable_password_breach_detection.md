# Enable Password Breach Detection in Supabase

## Overview

Supabase Auth can check user passwords against the [HaveIBeenPwned](https://haveibeenpwned.com/) database to prevent users from using compromised passwords. This is a security best practice that helps protect user accounts.

## What is HaveIBeenPwned?

HaveIBeenPwned is a service that maintains a database of billions of passwords that have been exposed in data breaches. When enabled, Supabase will check new passwords against this database and reject any that have been compromised.

## How to Enable

> [!IMPORTANT]
> This setting must be enabled manually in the Supabase Dashboard. It cannot be configured via SQL migration.

### Steps

1. **Navigate to Supabase Dashboard**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open Authentication Settings**
   - Click on **Authentication** in the left sidebar
   - Click on **Policies** tab

3. **Enable Password Breach Detection**
   - Look for the setting: **"Check password against HaveIBeenPwned"**
   - Toggle the switch to **ON**
   - Save changes

### Configuration Details

- **Feature Name**: Password Breach Detection
- **Provider**: HaveIBeenPwned API (k-Anonymity model)
- **Privacy**: Passwords are checked using k-Anonymity, meaning full passwords are never sent to HaveIBeenPwned
- **Impact**: Users will not be able to set passwords that appear in known data breaches

## Testing

After enabling, test with a known compromised password:

1. Try to register a new user with password: `password123`
2. The registration should **fail** with an error message
3. Try with a strong, unique password - it should **succeed**

## Security Benefits

- ✅ Prevents users from using commonly compromised passwords
- ✅ Reduces risk of credential stuffing attacks
- ✅ Improves overall account security
- ✅ Privacy-preserving implementation (k-Anonymity)

## Additional Recommendations

Consider also enabling these security features in Supabase Auth:

1. **Minimum Password Length**: Set to at least 8-12 characters
2. **Email Confirmations**: Require email verification for new signups
3. **Rate Limiting**: Enable rate limiting on auth endpoints
4. **Session Timeout**: Configure appropriate session expiry times

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [HaveIBeenPwned About](https://haveibeenpwned.com/About)
- [k-Anonymity Password Check](https://haveibeenpwned.com/API/v3#PwnedPasswords)
