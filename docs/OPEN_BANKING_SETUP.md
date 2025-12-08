# Open Banking Integration with Enable Banking

This document describes the Open Banking integration using Enable Banking API for connecting bank accounts (Alpha Bank, Eurobank, etc.) to the application.

## Overview

The integration follows the OAuth 2.0 flow:
1. User initiates login from frontend
2. Redirect to Enable Banking authorization page
3. User authenticates with their bank
4. Enable Banking redirects back with authorization code
5. Backend exchanges code for access token
6. Backend fetches accounts, balances, and transactions
7. Data is stored in PostgreSQL via Entity Framework

## Setup Instructions

### Step 1: Register Your App in Enable Banking Dashboard

1. Go to [enablebanking.com](https://enablebanking.com) and create an account
2. Register your application with the following settings:
   - **Application Type**: Confidential
   - **Redirect URL**: `https://yourapi.com/api/open-banking/callback`
     - For local development: `http://localhost:5038/api/open-banking/callback`
   - **Scopes**: `accounts`, `details`, `transactions`

3. Save the credentials you receive:
   - `client_id`
   - `client_secret`

### Step 2: Configure appsettings.json

Update `backend/YouAndMeExpensesAPI/appsettings.json` with your Enable Banking credentials.

#### Option A: Using Client Secret (Simple)

If Enable Banking provides a simple client secret string:

```json
{
  "EnableBanking": {
    "ClientId": "your-client-id-here",
    "ClientSecret": "your-client-secret-here",
    "RedirectUri": "https://yourapi.com/api/open-banking/callback",
    "BaseUrl": "https://api.enablebanking.com",
    "AuthorizationUrl": "https://api.enablebanking.com/oauth2/authorize",
    "TokenUrl": "https://api.enablebanking.com/oauth2/token",
    "Scopes": [ "accounts", "details", "transactions" ]
  }
}
```

#### Option B: Using PEM Private Key (Recommended for Production)

If Enable Banking provides a PEM private key (for JWT client assertion):

**Option B1: Store PEM content directly in appsettings.json**

```json
{
  "EnableBanking": {
    "ClientId": "your-client-id-here",
    "PrivateKeyPem": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----",
    "KeyId": "your-key-id-here",
    "RedirectUri": "https://yourapi.com/api/open-banking/callback",
    "BaseUrl": "https://api.enablebanking.com",
    "AuthorizationUrl": "https://api.enablebanking.com/oauth2/authorize",
    "TokenUrl": "https://api.enablebanking.com/oauth2/token",
    "Scopes": [ "accounts", "details", "transactions" ]
  }
}
```

**Option B2: Store PEM in a file (More Secure)**

1. Save your PEM key to a file (e.g., `keys/enablebanking-private-key.pem`)
2. Configure the path in appsettings.json:

```json
{
  "EnableBanking": {
    "ClientId": "your-client-id-here",
    "PrivateKeyPemPath": "keys/enablebanking-private-key.pem",
    "KeyId": "your-key-id-here",
    "RedirectUri": "https://yourapi.com/api/open-banking/callback",
    "BaseUrl": "https://api.enablebanking.com",
    "AuthorizationUrl": "https://api.enablebanking.com/oauth2/authorize",
    "TokenUrl": "https://api.enablebanking.com/oauth2/token",
    "Scopes": [ "accounts", "details", "transactions" ]
  }
}
```

**Important Notes**:
- **PEM Key Format**: The service supports both PKCS#1 (`-----BEGIN RSA PRIVATE KEY-----`) and PKCS#8 (`-----BEGIN PRIVATE KEY-----`) formats
- **Key ID**: Some providers require a Key ID (kid) - set this if Enable Banking requires it
- **Security**: For production:
  - Use `PrivateKeyPemPath` instead of `PrivateKeyPem` to keep keys out of config files
  - Store keys in secure locations (not in source control)
  - Use environment variables or Azure Key Vault / AWS Secrets Manager
  - Ensure the key file has restricted permissions (read-only for the application user)
- **Priority**: If both `PrivateKeyPem`/`PrivateKeyPemPath` and `ClientSecret` are provided, the PEM key takes precedence
- **RedirectUri**: Update to match your actual API URL

### Step 3: Apply Database Migration

Run the migration to create the necessary database tables:

```bash
cd backend/YouAndMeExpensesAPI
dotnet ef database update
```

This creates two new tables:
- `bank_connections` - Stores OAuth tokens and connection info
- `bank_accounts` - Stores bank account details and balances

## API Endpoints

### 1. Initiate Login
**GET** `/api/open-banking/login`

Initiates the OAuth flow. Returns the authorization URL for frontend to redirect.

**Response:**
```json
{
  "authorizationUrl": "https://api.enablebanking.com/oauth2/authorize?..."
}
```

### 2. OAuth Callback
**GET** `/api/open-banking/callback?code=xxx&state=xxx`

Handles the callback from Enable Banking after user authentication. This endpoint:
- Exchanges authorization code for access token
- Stores bank connection in database
- Fetches and stores account information

**Response:**
```json
{
  "success": true,
  "message": "Bank account connected successfully",
  "accountsCount": 2
}
```

### 3. Get Accounts
**GET** `/api/open-banking/accounts`

Retrieves all connected bank accounts for the authenticated user.

**Response:**
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

### 4. Get Transactions
**GET** `/api/open-banking/accounts/{accountId}/transactions?fromDate=2025-01-01&toDate=2025-01-31`

Retrieves transactions for a specific account.

**Query Parameters:**
- `fromDate` (optional): Start date (ISO format)
- `toDate` (optional): End date (ISO format)

**Response:**
```json
{
  "accountId": "external-account-id",
  "transactions": [
    {
      "transactionId": "txn-123",
      "amount": -50.00,
      "currency": "EUR",
      "transactionDate": "2025-01-05T14:30:00Z",
      "valueDate": "2025-01-05T14:30:00Z",
      "description": "Grocery Store Purchase",
      "merchantName": "Supermarket ABC",
      "category": "Food",
      "transactionType": "debit"
    }
  ],
  "count": 1
}
```

### 5. Sync Accounts
**POST** `/api/open-banking/sync`

Manually triggers a sync of all accounts, balances, and transactions.

**Response:**
```json
{
  "success": true,
  "message": "Accounts synced successfully",
  "accountsSynced": 2,
  "transactionsSynced": 45
}
```

### 6. Disconnect
**DELETE** `/api/open-banking/disconnect`

Disconnects all bank connections for the current user.

**Response:**
```json
{
  "success": true,
  "message": "Bank connection disconnected"
}
```

## Frontend Integration Example

```javascript
// 1. Initiate login
const response = await fetch('/api/open-banking/login', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { authorizationUrl } = await response.json();

// 2. Redirect user to Enable Banking
window.location.href = authorizationUrl;

// 3. After callback, get accounts
const accountsResponse = await fetch('/api/open-banking/accounts', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { accounts } = await accountsResponse.json();
```

## Security Considerations

1. **Token Storage**: Access tokens and refresh tokens are stored encrypted in the database
2. **Token Refresh**: The service automatically refreshes expired tokens using refresh tokens
3. **CSRF Protection**: State parameter is used for CSRF protection in OAuth flow
4. **User Isolation**: All endpoints require authentication and only return data for the authenticated user
5. **HTTPS**: Always use HTTPS in production for OAuth callbacks

## Database Schema

### bank_connections
- `id` (UUID) - Primary key
- `user_id` (string) - User ID from Identity
- `access_token` (string) - OAuth access token
- `refresh_token` (string) - OAuth refresh token
- `token_expires_at` (datetime) - Token expiration
- `bank_name` (string) - Bank name
- `account_ids` (string[]) - Array of connected account IDs
- `is_active` (boolean) - Connection status
- `last_sync_at` (datetime) - Last sync timestamp
- `created_at`, `updated_at` - Timestamps

### bank_accounts
- `id` (UUID) - Primary key
- `user_id` (string) - User ID from Identity
- `bank_connection_id` (UUID) - Foreign key to bank_connections
- `account_id` (string) - External account ID from Enable Banking
- `iban` (string) - Account IBAN
- `account_name` (string) - Account name
- `account_type` (string) - Account type
- `currency` (string) - Currency code
- `bank_name` (string) - Bank name
- `current_balance` (decimal) - Current balance
- `last_balance_update` (datetime) - Last balance update
- `created_at`, `updated_at` - Timestamps

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200 OK` - Success
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include:
```json
{
  "error": "Error message",
  "message": "Detailed error message"
}
```

## Automatic Transaction Import

The main goal of this integration is to **automatically populate transactions and income** from bank accounts into the app, eliminating the need for manual entry.

### How It Works

1. **Connect Bank Account**: User connects their bank via OAuth
2. **Import Transactions**: Transactions are automatically imported from the bank
3. **Automatic Mapping**: 
   - Bank debits → App expenses
   - Bank credits → App income
   - Categories are automatically mapped (groceries, bills, salary, etc.)
4. **Duplicate Detection**: Prevents importing the same transaction twice
5. **Automatic Sync**: Optional background service syncs transactions every 6 hours

### Import Endpoints

#### Import All Transactions
**POST** `/api/open-banking/import-transactions?fromDate=2025-01-01&toDate=2025-01-31`

Imports transactions from all connected bank accounts.

**Response:**
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

#### Import from Specific Account
**POST** `/api/open-banking/accounts/{accountId}/import-transactions?fromDate=2025-01-01&toDate=2025-01-31`

Imports transactions from a specific bank account.

### Automatic Background Sync

To enable automatic periodic sync (every 6 hours), uncomment this line in `Program.cs`:

```csharp
builder.Services.AddHostedService<BankTransactionSyncBackgroundService>();
```

This will automatically:
- Sync transactions for all users with active bank connections
- Import new transactions since last sync
- Skip duplicates automatically
- Update account balances

### Transaction Mapping

Bank transactions are automatically mapped to app transactions:

- **Amount**: Negative amounts → expenses, Positive amounts → income
- **Category**: Automatically mapped from bank categories:
  - Groceries/Food → "Food & Groceries"
  - Restaurants → "Food & Dining"
  - Transport/Gas → "Transportation"
  - Bills/Utilities → "Bills & Utilities"
  - Salary → "Salary"
  - And more...
- **Description**: Combines merchant name and transaction description
- **Date**: Uses transaction date from bank
- **Tracking**: Marked with `isBankSynced = true` and stores `bankTransactionId` for duplicate detection

### Duplicate Detection

The system prevents duplicate imports by checking:
1. **Bank Transaction ID**: Primary check using external transaction ID
2. **Amount + Date**: Secondary check for transactions with same amount on same day

### Frontend Integration Example

```javascript
// After connecting bank account, import transactions
const importResponse = await fetch('/api/open-banking/import-transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const result = await importResponse.json();
console.log(`Imported ${result.totalImported} transactions`);
console.log(`Skipped ${result.duplicatesSkipped} duplicates`);

// Transactions are now available in the app's transaction list
const transactionsResponse = await fetch('/api/transactions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { transactions } = await transactionsResponse.json();
// Transactions include both manual and bank-synced transactions
```

## Notes

- The Enable Banking API endpoints in the service may need adjustment based on Enable Banking's actual API documentation
- Token refresh is handled automatically when tokens expire
- Account balances are updated when fetching accounts
- Transactions are fetched on-demand and can be filtered by date range
- The integration supports multiple bank accounts per user
- **Transactions are automatically categorized** based on bank transaction data
- **Duplicate detection** prevents importing the same transaction multiple times
- **Background sync** can be enabled for automatic periodic updates

## Troubleshooting

1. **"Invalid redirect_uri"**: Ensure the redirect URI in appsettings.json matches exactly what's configured in Enable Banking dashboard
2. **"Invalid client credentials"**: Verify client_id and client_secret are correct
3. **"Token expired"**: The service should auto-refresh, but if issues persist, disconnect and reconnect
4. **"No accounts found"**: Ensure the user has granted the required scopes during authorization

