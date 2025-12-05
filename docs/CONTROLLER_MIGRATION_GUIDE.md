# 🔄 Controller Migration Guide: Using New Identity System

## 📋 Overview

All controllers need to be updated to use the new ASP.NET Core Identity authentication system with JWT tokens.

---

## ✅ What Needs to Change

### Before (Old Supabase Pattern)
```csharp
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<Transaction>>> GetTransactions(
        [FromHeader(Name = "X-User-Id")] string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "User ID is required" });
        }
        
        var transactions = await _service.GetTransactionsAsync(userId);
        return Ok(transactions);
    }
}
```

### After (New Identity Pattern)
```csharp
[Authorize]  // ← Add this attribute
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : BaseApiController  // ← Inherit from BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<List<Transaction>>> GetTransactions()  // ← Remove userId parameter
    {
        var (userId, error) = GetAuthenticatedUser();  // ← Get from JWT claims
        if (error != null) return error;
        
        var transactions = await _service.GetTransactionsAsync(userId!);
        return Ok(transactions);
    }
}
```

---

## 🔧 Step-by-Step Migration Pattern

### 1. Update Controller Declaration

**Add:**
- `using Microsoft.AspNetCore.Authorization;`
- `[Authorize]` attribute on the class
- Change `ControllerBase` to `BaseApiController`

```csharp
using Microsoft.AspNetCore.Authorization;  // ← Add
using Microsoft.AspNetCore.Mvc;

[Authorize]  // ← Add
[ApiController]
[Route("api/[controller]")]
public class YourController : BaseApiController  // ← Change from ControllerBase
{
    // ...
}
```

### 2. Remove userId Parameters

**Find and replace:**
- `[FromHeader(Name = "X-User-Id")] string userId` → Remove parameter
- `[FromQuery] string userId` → Remove parameter  
- Any manual userId validation → Remove

### 3. Get User ID from JWT

**At the start of each method, add:**

```csharp
var (userId, error) = GetAuthenticatedUser();
if (error != null) return error;
```

This replaces:
```csharp
if (string.IsNullOrEmpty(userId))
{
    return Unauthorized(new { message = "User ID is required" });
}
```

---

## 📝 Controllers to Update

### ✅ Already Updated
- [x] `AuthController.cs` - Already uses Identity
- [x] `TransactionsController.cs` - Example updated (partial)
- [x] `BaseApiController.cs` - Helper base class

### ⚠️ Need to Update

1. **TransactionsController.cs** (Partially done - finish remaining methods)
   - GetTransactions ✅
   - GetTransaction
   - CreateTransaction
   - UpdateTransaction
   - DeleteTransaction
   - GetRecentTransactions

2. **LoansController.cs**
   - GetLoans
   - GetLoan  
   - CreateLoan
   - UpdateLoan
   - DeleteLoan

3. **BudgetsController.cs**
   - GetBudgets
   - GetBudget
   - CreateBudget
   - UpdateBudget
   - DeleteBudget

4. **SavingsGoalsController.cs**
   - GetSavingsGoals
   - GetSavingsGoal
   - CreateSavingsGoal
   - UpdateSavingsGoal
   - DeleteSavingsGoal

5. **RecurringBillsController.cs**
   - GetRecurringBills
   - CreateRecurringBill
   - UpdateRecurringBill
   - DeleteRecurringBill

6. **ShoppingListsController.cs**
   - GetShoppingLists
   - CreateShoppingList
   - AddItem
   - UpdateItem
   - DeleteItem

7. **LoanPaymentsController.cs**
   - GetLoanPayments
   - CreateLoanPayment
   - DeleteLoanPayment

8. **RemindersController.cs**
   - GetReminderPreferences
   - UpdateReminderPreferences
   - CreateReminderPreferences

9. **AnalyticsController.cs**
   - GetAnalytics
   - GetCategoryBreakdown
   - GetMonthlyComparison

10. **ChatbotController.cs**
    - PostQuery

11. **DataClearingController.cs**
    - InitiateDataClearing
    - GetStatus
    - CancelRequest

12. **SystemController.cs**
    - ClearAllData (if using authentication)

---

## 🎯 Quick Reference: Method Updates

### Pattern for GET endpoints

**Before:**
```csharp
[HttpGet]
public async Task<ActionResult<T>> GetSomething([FromQuery] string userId)
{
    if (string.IsNullOrEmpty(userId))
        return Unauthorized();
    // ...
}
```

**After:**
```csharp
[HttpGet]
public async Task<ActionResult<T>> GetSomething()
{
    var (userId, error) = GetAuthenticatedUser();
    if (error != null) return error;
    // ...
}
```

### Pattern for POST endpoints

**Before:**
```csharp
[HttpPost]
public async Task<ActionResult<T>> CreateSomething(
    [FromQuery] string userId, 
    [FromBody] CreateDto dto)
{
    if (string.IsNullOrEmpty(userId))
        return Unauthorized();
    // ...
}
```

**After:**
```csharp
[HttpPost]
public async Task<ActionResult<T>> CreateSomething([FromBody] CreateDto dto)
{
    var (userId, error) = GetAuthenticatedUser();
    if (error != null) return error;
    // ...
}
```

### Pattern for DELETE endpoints

**Before:**
```csharp
[HttpDelete("{id}")]
public async Task<ActionResult> DeleteSomething(int id, [FromQuery] string userId)
{
    if (string.IsNullOrEmpty(userId))
        return Unauthorized();
    // ...
}
```

**After:**
```csharp
[HttpDelete("{id}")]
public async Task<ActionResult> DeleteSomething(int id)
{
    var (userId, error) = GetAuthenticatedUser();
    if (error != null) return error;
    // ...
}
```

---

## 🔍 Find & Replace Tips

Use these regex patterns in your IDE:

### Find userId parameters:
```regex
\[From(Header|Query)\(.*?\)\]\s*string\s+userId
```

### Find userId validation:
```regex
if\s*\(string\.IsNullOrEmpty\(userId\)\)\s*{[\s\S]*?return\s+Unauthorized
```

---

## ⚡ Automated Migration Script

Here's a PowerShell script to help update controllers:

```powershell
# Navigate to controllers directory
cd backend\YouAndMeExpensesAPI\Controllers

# List all controllers that need updating
$controllers = @(
    "TransactionsController.cs",
    "LoansController.cs", 
    "BudgetsController.cs",
    "SavingsGoalsController.cs",
    "RecurringBillsController.cs",
    "ShoppingListsController.cs",
    "LoanPaymentsController.cs",
    "RemindersController.cs",
    "AnalyticsController.cs",
    "ChatbotController.cs",
    "DataClearingController.cs"
)

foreach ($controller in $controllers) {
    Write-Host "Updating $controller..." -ForegroundColor Yellow
    
    $content = Get-Content $controller -Raw
    
    # Add Authorization using statement if not present
    if ($content -notmatch "using Microsoft\.AspNetCore\.Authorization") {
        $content = $content -replace "(using Microsoft\.AspNetCore\.Mvc;)", 
            "using Microsoft.AspNetCore.Authorization;`n`$1"
    }
    
    # Add [Authorize] attribute if not present
    if ($content -notmatch "\[Authorize\]") {
        $content = $content -replace "(\[ApiController\])", "[Authorize]`n    `$1"
    }
    
    # Change ControllerBase to BaseApiController
    $content = $content -replace ": ControllerBase", ": BaseApiController"
    
    # Save
    $content | Set-Content $controller -NoNewline
    
    Write-Host "✓ Updated $controller" -ForegroundColor Green
}

Write-Host "`nDone! Please review changes and manually update method signatures." -ForegroundColor Cyan
```

---

## 🧪 Testing After Migration

### 1. Test Authentication

```bash
# Should return 401 Unauthorized
curl http://localhost:5038/api/transactions

# Should work with valid token
curl http://localhost:5038/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test Each Endpoint

Create a test script:

```javascript
// test-auth.js
const API_URL = 'http://localhost:5038';
let token = '';

// 1. Login
async function login() {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  const data = await response.json();
  token = data.token;
  console.log('✓ Logged in');
}

// 2. Test endpoint
async function testTransactions() {
  const response = await fetch(`${API_URL}/api/transactions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✓ Transactions:', response.status);
}

// Run tests
login().then(testTransactions);
```

---

## 🐛 Common Issues & Fixes

### Issue: "User not authenticated" error

**Cause:** JWT token not being sent or invalid

**Fix:**
- Ensure frontend sends `Authorization: Bearer {token}` header
- Check token hasn't expired
- Verify JWT secret matches in frontend and backend

### Issue: Controller still expects userId parameter

**Cause:** Method signature not updated

**Fix:**
- Remove `[FromQuery] string userId` or `[FromHeader] string userId`
- Add `var (userId, error) = GetAuthenticatedUser();`

### Issue: Build errors after changes

**Cause:** Missing using statements or syntax errors

**Fix:**
```csharp
using Microsoft.AspNetCore.Authorization;  // Add if missing
```

---

## 📦 Frontend Changes Needed

Update API calls to remove userId parameter:

### Before:
```javascript
fetch(`${API_URL}/api/transactions?userId=${user.id}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-User-Id': user.id
  }
})
```

### After:
```javascript
fetch(`${API_URL}/api/transactions`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

The userId is automatically extracted from the JWT token!

---

## ✅ Verification Checklist

After updating all controllers:

- [ ] All controllers inherit from `BaseApiController`
- [ ] All controllers have `[Authorize]` attribute
- [ ] No controllers accept userId from query/header parameters
- [ ] All methods use `GetAuthenticatedUser()` helper
- [ ] Project builds successfully (`dotnet build`)
- [ ] All endpoints return 401 without token
- [ ] All endpoints work with valid JWT token
- [ ] Frontend updated to not send userId
- [ ] Integration tests pass

---

## 🎉 Benefits

After migration:
- ✅ **Secure** - User ID cannot be spoofed
- ✅ **Clean** - No userId parameters cluttering API
- ✅ **Standard** - Using industry-standard JWT authentication
- ✅ **Maintainable** - Centralized auth logic in BaseApiController
- ✅ **Scalable** - Easy to add role-based authorization later

---

*Last Updated: December 5, 2025*

