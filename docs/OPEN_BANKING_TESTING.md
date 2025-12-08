# Open Banking Testing Guide

This guide will help you test the Enable Banking integration step by step.

## Prerequisites

1. ✅ Backend API is running on `http://localhost:5038`
2. ✅ PEM key is saved at `privatePem/5fee7084-3641-479f-9181-e91f4db39f86.pem`
3. ✅ Database migrations are applied
4. ✅ You have a valid JWT token (logged in user)

## Step 1: Verify Configuration

### Check PEM Key File Exists

```powershell
Test-Path "privatePem/5fee7084-3641-479f-9181-e91f4db39f86.pem"
# Should return: True
```

### Verify appsettings.json

Make sure your `appsettings.json` has:
- ✅ `ClientId`: Your Enable Banking client ID
- ✅ `PrivateKeyPemPath`: Path to PEM file
- ✅ `RedirectUri`: Must match Enable Banking dashboard settings

**Important**: Update `RedirectUri` for local testing:
```json
"RedirectUri": "http://localhost:5038/api/open-banking/callback"
```

## Step 2: Test PEM Key Loading

### Option A: Using Swagger UI

1. Start the backend: `dotnet run`
2. Open Swagger UI: `http://localhost:5038` (or `http://localhost:5000`)
3. Find the `/api/open-banking/login` endpoint
4. Click "Try it out"
5. Click "Execute"

**Expected Response:**
```json
{
  "authorizationUrl": "https://api.enablebanking.com/oauth2/authorize?client_id=..."
}
```

**If you get an error about PEM key:**
- Check the file path is correct
- Verify the PEM file format (should start with `-----BEGIN PRIVATE KEY-----`)
- Check file permissions

### Option B: Using PowerShell/curl

```powershell
# First, get a JWT token (login first)
$token = "your-jwt-token-here"

# Test login endpoint
$response = Invoke-RestMethod -Uri "http://localhost:5038/api/open-banking/login" `
    -Method GET `
    -Headers @{ "Authorization" = "Bearer $token" }

Write-Host "Authorization URL: $($response.authorizationUrl)"
```

## Step 3: Test OAuth Flow

### 3.1 Get Authorization URL

**Request:**
```http
GET http://localhost:5038/api/open-banking/login
Authorization: Bearer {your-jwt-token}
```

**Expected Response:**
```json
{
  "authorizationUrl": "https://api.enablebanking.com/oauth2/authorize?client_id=5fee7084-3641-479f-9181-e91f4db39f86&redirect_uri=http://localhost:5038/api/open-banking/callback&response_type=code&scope=accounts details transactions&state=..."
}
```

**What to check:**
- ✅ URL contains your `client_id`
- ✅ `redirect_uri` matches your config
- ✅ `scope` includes `accounts`, `details`, `transactions`
- ✅ `state` parameter is present (for CSRF protection)

### 3.2 Test Authorization (Manual)

1. Copy the `authorizationUrl` from the response
2. Open it in your browser
3. You should be redirected to Enable Banking login page
4. Log in with your bank credentials (Alpha Bank, Eurobank, etc.)
5. After authentication, Enable Banking will redirect to your callback URL

**Note**: For local testing, you may need to use a tool like ngrok to expose your localhost, or update Enable Banking dashboard to allow `http://localhost:5038` as redirect URI.

### 3.3 Test Callback (Simulated)

Since the callback requires Enable Banking to redirect, you can test it manually:

**Request:**
```http
GET http://localhost:5038/api/open-banking/callback?code={authorization_code}&state={state}
Authorization: Bearer {your-jwt-token}
```

**What happens:**
1. Backend exchanges `code` for `access_token` using PEM key
2. Stores bank connection in database
3. Fetches accounts from Enable Banking
4. Returns success response

**Expected Response:**
```json
{
  "success": true,
  "message": "Bank account connected successfully",
  "accountsCount": 2
}
```

## Step 4: Test Account Retrieval

### 4.1 Get Connected Accounts

**Request:**
```http
GET http://localhost:5038/api/open-banking/accounts
Authorization: Bearer {your-jwt-token}
```

**Expected Response:**
```json
{
  "accounts": [
    {
      "id": "guid",
      "accountId": "external-account-id",
      "iban": "GR...",
      "accountName": "Savings Account",
      "accountType": "savings",
      "currency": "EUR",
      "bankName": "Alpha Bank",
      "currentBalance": 1500.00,
      "lastBalanceUpdate": "2025-01-07T10:30:00Z"
    }
  ]
}
```

**What to check:**
- ✅ Accounts are returned
- ✅ Balances are fetched and updated
- ✅ Account details are correct

## Step 5: Test Transaction Import

### 5.1 Import Transactions

**Request:**
```http
POST http://localhost:5038/api/open-banking/import-transactions?fromDate=2025-01-01&toDate=2025-01-31
Authorization: Bearer {your-jwt-token}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Transactions imported successfully",
  "totalImported": 45,
  "duplicatesSkipped": 3,
  "errors": 0,
  "errorMessages": [],
  "lastTransactionDate": "2025-01-07T14:30:00Z"
}
```

**What to check:**
- ✅ Transactions are imported
- ✅ Duplicates are detected and skipped
- ✅ No errors occurred

### 5.2 Verify Transactions in Database

Check that transactions appear in your app:

**Request:**
```http
GET http://localhost:5038/api/transactions
Authorization: Bearer {your-jwt-token}
```

**Look for:**
- Transactions with `isBankSynced: true`
- Transactions with `bankTransactionId` populated
- Correct mapping: debits → expenses, credits → income
- Automatic categorization

## Step 6: Test Transaction Sync

### 6.1 Sync All Accounts

**Request:**
```http
POST http://localhost:5038/api/open-banking/sync
Authorization: Bearer {your-jwt-token}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Accounts synced successfully",
  "accountsSynced": 2,
  "transactionsSynced": 45
}
```

## Step 7: Test Error Handling

### 7.1 Test Without Authentication

**Request:**
```http
GET http://localhost:5038/api/open-banking/login
```

**Expected Response:**
```json
{
  "error": "User not authenticated"
}
```

### 7.2 Test Invalid Callback

**Request:**
```http
GET http://localhost:5038/api/open-banking/callback?error=access_denied
Authorization: Bearer {your-jwt-token}
```

**Expected Response:**
```json
{
  "error": "Authorization failed",
  "details": "access_denied"
}
```

## Step 8: Using Swagger UI (Easiest Method)

1. **Start the backend:**
   ```powershell
   cd backend/YouAndMeExpensesAPI
   dotnet run
   ```

2. **Open Swagger UI:**
   - Navigate to: `http://localhost:5038` or `http://localhost:5000`
   - You should see the Swagger documentation

3. **Authorize:**
   - Click the "Authorize" button (🔒) at the top
   - Enter: `Bearer {your-jwt-token}`
   - Click "Authorize"

4. **Test Endpoints:**
   - Expand `/api/open-banking/login`
   - Click "Try it out"
   - Click "Execute"
   - Check the response

## Step 9: Using Postman

### 9.1 Create Collection

1. Create a new Postman collection: "Open Banking Tests"
2. Set collection variable: `baseUrl = http://localhost:5038`
3. Set collection variable: `token = {your-jwt-token}`

### 9.2 Create Requests

**Request 1: Get Authorization URL**
```
GET {{baseUrl}}/api/open-banking/login
Headers:
  Authorization: Bearer {{token}}
```

**Request 2: Get Accounts**
```
GET {{baseUrl}}/api/open-banking/accounts
Headers:
  Authorization: Bearer {{token}}
```

**Request 3: Import Transactions**
```
POST {{baseUrl}}/api/open-banking/import-transactions?fromDate=2025-01-01&toDate=2025-01-31
Headers:
  Authorization: Bearer {{token}}
```

## Step 10: Verify Database

### Check Bank Connections

```sql
SELECT * FROM bank_connections WHERE is_active = true;
```

**What to check:**
- ✅ `access_token` is stored (encrypted)
- ✅ `refresh_token` is stored
- ✅ `token_expires_at` is set
- ✅ `last_sync_at` is updated

### Check Bank Accounts

```sql
SELECT * FROM bank_accounts;
```

**What to check:**
- ✅ Accounts are stored
- ✅ `current_balance` is updated
- ✅ `bank_connection_id` links to connection

### Check Imported Transactions

```sql
SELECT * FROM transactions WHERE is_bank_synced = true;
```

**What to check:**
- ✅ Transactions have `bank_transaction_id`
- ✅ Transactions have `bank_account_id`
- ✅ Categories are auto-mapped
- ✅ Types are correct (expense/income)

## Troubleshooting

### Issue: "Private key file not found"

**Solution:**
- Check file path in `appsettings.json`
- Verify file exists: `Test-Path "privatePem/5fee7084-3641-479f-9181-e91f4db39f86.pem"`
- Use relative path from project root

### Issue: "Failed to load private key from PEM format"

**Solution:**
- Verify PEM format (should start with `-----BEGIN PRIVATE KEY-----`)
- Check for extra whitespace or line breaks
- Ensure file encoding is UTF-8

### Issue: "Invalid redirect_uri"

**Solution:**
- Update `RedirectUri` in `appsettings.json` to match Enable Banking dashboard
- For local testing: `http://localhost:5038/api/open-banking/callback`
- Ensure Enable Banking dashboard allows this redirect URI

### Issue: "Failed to exchange authorization code"

**Solution:**
- Check PEM key is correct
- Verify `ClientId` matches Enable Banking dashboard
- Check Enable Banking API logs for detailed error

### Issue: "No active bank connection found"

**Solution:**
- Complete OAuth flow first (login → callback)
- Check `bank_connections` table in database
- Verify `is_active = true`

## Quick Test Script

Save this as `test-open-banking.ps1`:

```powershell
# Configuration
$baseUrl = "http://localhost:5038"
$token = "YOUR_JWT_TOKEN_HERE"

# Test 1: Get Authorization URL
Write-Host "`n=== Test 1: Get Authorization URL ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/open-banking/login" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" }
    Write-Host "✅ Success! Authorization URL: $($response.authorizationUrl)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get Accounts (requires connected bank)
Write-Host "`n=== Test 2: Get Accounts ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/open-banking/accounts" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" }
    Write-Host "✅ Success! Found $($response.accounts.Count) accounts" -ForegroundColor Green
    $response.accounts | ForEach-Object {
        Write-Host "  - $($_.accountName): $($_.currentBalance) $($_.currency)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   (This is expected if no bank is connected yet)" -ForegroundColor Gray
}

# Test 3: Import Transactions (requires connected bank)
Write-Host "`n=== Test 3: Import Transactions ===" -ForegroundColor Cyan
try {
    $fromDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
    $toDate = (Get-Date).ToString("yyyy-MM-dd")
    $response = Invoke-RestMethod -Uri "$baseUrl/api/open-banking/import-transactions?fromDate=$fromDate&toDate=$toDate" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer $token" }
    Write-Host "✅ Success! Imported $($response.totalImported) transactions" -ForegroundColor Green
    Write-Host "   Skipped $($response.duplicatesSkipped) duplicates" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   (This is expected if no bank is connected yet)" -ForegroundColor Gray
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
```

**Usage:**
```powershell
# Edit the script and set your JWT token
.\test-open-banking.ps1
```

## Success Criteria

✅ **Configuration:**
- PEM key loads without errors
- Configuration is valid

✅ **OAuth Flow:**
- Authorization URL is generated
- Callback processes successfully
- Access token is stored

✅ **Data Retrieval:**
- Accounts are fetched
- Balances are updated
- Transactions are imported

✅ **Data Storage:**
- Bank connections saved to database
- Accounts stored correctly
- Transactions appear in app

✅ **Error Handling:**
- Invalid requests return proper errors
- Authentication is enforced
- Duplicate transactions are skipped

## Next Steps

Once testing is complete:
1. ✅ Update `RedirectUri` for production
2. ✅ Enable background sync service (optional)
3. ✅ Test with real bank accounts
4. ✅ Monitor logs for any issues
5. ✅ Set up error alerts

