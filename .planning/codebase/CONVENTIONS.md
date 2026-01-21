# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- C# source files use PascalCase matching class name: `TransactionsService.cs`, `TransactionsController.cs`
- DTO files group related DTOs in single files: `TransactionDTOs.cs`, `TravelDTOs.cs`
- Test files follow pattern: `[ClassName]Tests.cs` (e.g., `EmailServiceTests.cs`, `RemindersControllerTests.cs`)

**Classes and Interfaces:**
- Service interfaces start with `I`: `ITransactionsService`, `IBudgetService`, `IEmailService`
- Service implementations drop the `I`: `TransactionsService`, `BudgetService`, `EmailService`
- Controllers use full name: `TransactionsController`, `RemindersController`, `BaseApiController`
- DTOs use descriptive suffixes: `CreateTransactionRequest`, `TransactionWithProfileDto`, `TransactionsPageDto`
- Model classes use entity names: `Transaction`, `Budget`, `Partnership`, `EmailSettings`, `ReminderPreferences`

**Methods and Properties:**
- Async methods always end with `Async`: `GetTransactionsAsync()`, `CreateTransactionAsync()`, `UpdateBudgetAsync()`
- Getter methods use `Get` prefix: `GetTransactionsAsync()`, `GetTransactionAsync()`, `GetAuthenticatedUser()`
- Boolean properties use descriptive flags: `IsRecurring`, `IsAuthenticated()`, `IsActive`, `EnableSsl`
- Private fields use camelCase with leading underscore: `_dbContext`, `_logger`, `_storageService`, `_transactionsService`
- Public properties use PascalCase: `Id`, `Type`, `Amount`, `Category`, `CreatedAt`, `UpdatedAt`

**Constants and Enums:**
- Constants in files: used inline with descriptive naming
- Enum types: `ReminderType`, `DateTimeKind`, `EmailSettings`, `ReminderPreferences`

## Code Style

**Formatting:**
- EditorConfig enforces: 4-space indentation for C# files
- Newline: LF (Unix-style)
- File endings: newline required
- Charset: UTF-8

**Linting:**
- No StyleCop or custom linting rules detected
- Nullable reference types enabled in csproj: `<Nullable>enable</Nullable>`
- Implicit usings enabled: `<ImplicitUsings>enable</ImplicitUsings>`

**Namespace Organization:**
- Controllers: `YouAndMeExpensesAPI.Controllers`
- Services: `YouAndMeExpensesAPI.Services`
- Models: `YouAndMeExpensesAPI.Models`
- DTOs: `YouAndMeExpensesAPI.DTOs`
- Data: `YouAndMeExpensesAPI.Data`

## Import Organization

**Order:**
1. System namespaces: `using System;`, `using System.ComponentModel.DataAnnotations;`
2. Microsoft namespaces: `using Microsoft.AspNetCore.Mvc;`, `using Microsoft.EntityFrameworkCore;`
3. Third-party: `using FluentAssertions;`, `using Moq;`
4. Project namespaces: `using YouAndMeExpensesAPI.Services;`, `using YouAndMeExpensesAPI.Models;`

**Path Aliases:**
Not detected in codebase.

## Error Handling

**Patterns:**
- Controllers catch exceptions at endpoint level using try-catch blocks
- Services catch exceptions and log, often swallowing exceptions to prevent cascading failures
- Specific exception types caught first: `ArgumentException`, `UnauthorizedAccessException`, `DbUpdateException`
- Generic `Exception` catch at end for unknown errors

**Example from `TransactionsController.cs` (lines 44-72):**
```csharp
try
{
    var result = await _transactionsService.GetTransactionsAsync(
        userId, type, startDate, endDate, page, pageSize, search);
    return Ok(result.Items);
}
catch (ArgumentException ex)
{
    return BadRequest(new { message = ex.Message });
}
catch (Exception ex)
{
    _logger.LogError(ex, "Error getting transactions for user: {UserId}", userId);
    return StatusCode(500, new { message = "Error retrieving transactions", error = ex.Message });
}
```

**Authorization Pattern:**
- Controllers inherit from `BaseApiController` for common auth helpers
- Each endpoint calls `GetAuthenticatedUser()` which returns tuple: `(Guid userId, IActionResult? error)`
- If error is not null, immediately return unauthorized: `if (error != null) return error;`

**File Upload Validation:**
```csharp
// From TransactionsService.UploadReceiptAsync() (lines 368-391)
var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

if (!allowedExtensions.Contains(extension))
{
    throw new ArgumentException("Only image files are allowed");
}

if (file.Length > 5 * 1024 * 1024)
{
    throw new ArgumentException("File size must be less than 5MB");
}
```

## Logging

**Framework:** Microsoft.Extensions.Logging (ILogger<T>)

**Patterns:**
- Injected via constructor: `private readonly ILogger<ClassName> _logger;`
- Structured logging with placeholders: `_logger.LogError(ex, "Error getting transactions for user: {UserId}", userId);`
- Log levels used: `LogError`, `LogWarning`, `LogInformation`
- Exception logged with structured fields: `_logger.LogError(ex, "message", userId, otherId)`

**Example from `TransactionsService.cs` (lines 70-71):**
```csharp
_logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
_logger.LogInformation("Created student {StudentId}", student.Id); // style pattern

// From BudgetService.cs (line 103) - inconsistent pattern:
_logger.LogInformation($"Updated budget {budget.Id} ({budget.Category}): Added {amount}. New Spent: {budget.SpentAmount}");
```

**Issue:** Some log statements use string interpolation (`$"..."`) instead of structured logging placeholders. Prefer structured logging.

## Comments

**When to Comment:**
- XML documentation comments on public classes and methods: `/// <summary>`, `/// <param>`, `/// <returns>`
- Inline comments for complex logic or non-obvious decisions
- No TODOs or FIXMEs actively maintained (found only in 2 files)

**XMLDoc/JSDoc:**
- Standard on all public controllers, services, and DTOs
- Example from `TransactionsController.cs` (lines 8-11):
```csharp
/// <summary>
/// API controller for managing transactions (expenses and income).
/// All endpoints require authentication via JWT token.
/// Business logic is delegated to <see cref="ITransactionsService"/>.
/// </summary>
```

- DTO example from `CreateTransactionRequest` (lines 6-8):
```csharp
/// <summary>
/// DTO for creating a new transaction
/// Accepts date as string to handle frontend date format.
/// </summary>
```

## Function Design

**Size:** Service methods range 15-80 lines; controllers 5-30 lines. Longer methods extract helper functions (e.g., `NormalizeDates`, `GetUserAndPartnerIdsAsync`).

**Parameters:**
- Controllers accept `[FromQuery]` or `[FromBody]` attributes
- Services receive Guid userId and domain objects/DTOs
- Methods with multiple optional filters: use individual parameters, not parameter objects

**Return Values:**
- Controllers return `IActionResult` or `ActionResult<T>`
- Services return domain models or DTOs, null-checked by caller
- Async operations return `Task<T>` or `Task`

**Example from `TransactionsService.cs` (lines 143-230):**
```csharp
public async Task<TransactionsPageDto> GetTransactionsAsync(
    Guid userId,
    string? type,
    DateTime? startDate,
    DateTime? endDate,
    int? page,
    int? pageSize,
    string? search)
{
    // Implementation with multiple optional parameters
    // Returns structured DTO with pagination info
}
```

## Module Design

**Exports:**
- Services expose public interfaces (ITransactionsService, IBudgetService)
- Controllers public with [Route] and [HttpMethod] attributes
- Models marked with [Table] and [Column] for EF Core mapping

**Barrel Files:**
Not used; each service/model in separate file.

## Validation

**Data Annotations:**
- Applied to DTOs: `[Required]`, `[Range]`, `[StringLength]`
- Example from `CreateTransactionRequest` (lines 11-24):
```csharp
[Required]
public string Type { get; set; } = string.Empty;

[Required]
[Range(0.01, double.MaxValue, ErrorMessage = "Amount must be greater than zero")]
public decimal Amount { get; set; }
```

**Model State Validation:**
- Controllers check `ModelState.IsValid` before proceeding
- Invalid model state returns BadRequest with error details

**Business Logic Validation:**
- Services validate entity existence (null checks)
- Authorization checks in service methods: `GetUserAndPartnerIdsAsync()` to verify ownership
- Date normalization to UTC in service layer

## Dependency Injection

**Pattern:**
- Constructor injection exclusively; no service locator anti-pattern
- Dependencies declared as private readonly fields
- Injected via constructor with null-coalescing guards

**Example from `TransactionsService.cs` (lines 15-36):**
```csharp
private readonly AppDbContext _dbContext;
private readonly IStorageService _storageService;
private readonly IAchievementService _achievementService;
private readonly IBudgetService _budgetService;
private readonly IBankStatementImportService _importService;
private readonly ILogger<TransactionsService> _logger;

public TransactionsService(
    AppDbContext dbContext,
    IStorageService storageService,
    IAchievementService achievementService,
    IBudgetService budgetService,
    IBankStatementImportService importService,
    ILogger<TransactionsService> logger)
{
    _dbContext = dbContext;
    _storageService = storageService;
    // ... assign all dependencies
}
```

## Async/Await

**Best Practices:**
- Async methods always use `await` for I/O operations
- Database queries: `await _dbContext.Transactions.ToListAsync()`
- No `.Result` or `.Wait()` blocking calls detected
- `async Task` used for void-like operations; `async Task<T>` for return values

**Example from `TransactionsService.cs` (lines 232-237):**
```csharp
public async Task<Transaction?> GetTransactionAsync(Guid userId, Guid id)
{
    return await _dbContext.Transactions
        .AsNoTracking()
        .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId.ToString());
}
```

## Entity Framework Patterns

**AsNoTracking:**
- Used for read-only queries: `_dbContext.Transactions.AsNoTracking().Where(...)`
- Improves performance when change tracking not needed

**Date Handling:**
- UTC normalization enforced: `DateTime.UtcNow`, `date.ToUniversalTime()`
- Unspecified kind handled: `DateTime.SpecifyKind(date, DateTimeKind.Utc)`
- Range queries filter with `>=` and `<=` on UTC dates

**Pagination:**
- Pattern: `Skip((page - 1) * pageSize).Take(pageSize)`
- Count query separate: `await query.CountAsync()` then skip/take

---

*Convention analysis: 2026-01-21*
