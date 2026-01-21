# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

### File Storage Implementation Incomplete

**Issue:** Storage service methods throw `NotImplementedException` - Supabase Storage was removed but not replaced with alternative implementation.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/EntityFrameworkDataService.cs` (lines 283-301)

**Impact:**
- Receipt uploads completely broken (lines 286-293)
- Receipt deletions completely broken (lines 295-301)
- Any feature depending on file attachments fails at runtime
- Critical for financial transactions with receipts and travel documents

**Fix approach:**
1. Choose storage backend (local filesystem, AWS S3, or Azure Blob Storage)
2. Implement `ISupabaseService.UploadReceiptAsync()` with actual file handling
3. Implement `ISupabaseService.DeleteReceiptAsync()` with file cleanup
4. Add tests for upload/delete operations
5. Document storage configuration in README

**Priority:** CRITICAL - Blocks core functionality

---

### Blocking Async Operation in SupabaseStorageService

**Issue:** `.Wait()` call on async operation blocks threads and can cause deadlocks.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/SupabaseStorageService.cs` (line 34)

**Pattern:**
```csharp
_supabaseClient.InitializeAsync().Wait(); // Blocking call
```

**Impact:**
- Thread pool starvation under load
- Potential deadlocks
- Poor async/await patterns
- Reduced scalability

**Fix approach:**
1. Make constructor async or initialize differently
2. Use proper async initialization pattern
3. Consider factory pattern for async dependency creation

**Priority:** HIGH - Performance/scalability risk

---

### Repetitive DateTime Handling Code

**Issue:** Identical UTC datetime conversion logic duplicated across `Create` and `Update` methods for multiple entity types.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/EntityFrameworkDataService.cs` (lines 42-108)

**Pattern:** ~30 lines of repetitive code for:
- `CreateTransactionAsync()` (lines 42-75)
- `UpdateTransactionAsync()` (lines 77-108)
- Similar patterns for Loans

**Impact:**
- Code maintainability issues
- Higher bug risk when updating datetime logic
- Violates DRY principle
- Makes testing harder

**Fix approach:**
1. Extract to helper method: `NormalizeDateTimeUtc(DateTime? value)`
2. Create reusable extension method: `DateTime.ToUtcIfNeeded()`
3. Add tests for datetime normalization

**Priority:** MEDIUM - Maintainability issue

---

## Monolithic Components

### ChatbotService - Massive Single Class

**Issue:** ChatbotService is 6,369 lines - far exceeds recommended service size (~300-500 lines per file).

**Files:**
- `backend/YouAndMeExpensesAPI/Services/ChatbotService.cs`

**Responsibilities in single file:**
- Query pattern matching (lines 32-150+ patterns)
- Spending analysis queries (multiple methods)
- Income analysis queries
- Balance/savings queries
- Comparison queries
- Category analysis
- Trend analysis
- Budget notifications
- Currency conversion
- Multiple language handling

**Impact:**
- Difficult to test individual features
- Hard to maintain and debug
- Slow to navigate and modify
- Violates Single Responsibility Principle
- Testing is expensive (6K+ lines to load per test)

**Fix approach:**
1. Split into logical services:
   - `SpendingAnalysisService` - spending queries
   - `IncomeAnalysisService` - income queries
   - `CurrencyConversionService` - currency operations
   - `BudgetNotificationService` - budget alerts
   - `ChatbotQueryDispatcher` - route queries to appropriate service
2. Extract query pattern dictionaries to separate configuration
3. Share common language/localization utilities
4. Create integration tests for query routing

**Priority:** MEDIUM - Maintainability and testability concern

---

## Known Issues

### GreeceEconomicDataService - Large File

**Issue:** GreeceEconomicDataService is 1,223 lines.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/GreeceEconomicDataService.cs`

**Impact:**
- Handles complex API data transformation
- Difficult to modify without side effects
- Testing is expensive
- Single point of failure for Greece data features

**Fix approach:**
1. Extract data transformation logic to separate mapper classes
2. Split API calls from business logic
3. Create parser services for each data type
4. Add comprehensive unit tests per transformation

**Priority:** LOW - Feature works but maintainability issue

---

## Performance Bottlenecks

### No Pagination Enforcement on Large Queries

**Issue:** Database queries can return unbounded result sets if pagination not properly enforced.

**Files:**
- Multiple controllers and services across application

**Pattern:** Controllers accept optional `page` and `pageSize` parameters but some queries may bypass pagination.

**Cause:**
- No centralized validation of pagination parameters
- No default page size enforcement at middleware level
- Could load entire transaction/loan tables into memory

**Improvement path:**
1. Create pagination validator service
2. Add middleware to enforce default pagination limits
3. Add warning logs when large result sets returned
4. Set reasonable defaults (e.g., max 500 items per page)
5. Add database indexes on frequently filtered columns

**Priority:** HIGH - Could cause memory spikes and OOM errors

---

### Missing Database Indexes on Frequently Queried Columns

**Issue:** Not all frequently-filtered columns have indexes.

**Files:**
- `backend/YouAndMeExpensesAPI/Data/AppDbContext.cs` (configurations)

**Pattern:** Indexes exist for `UserId`, `Date`, `Type` on transactions, but some related queries may lack indexes:
- Partnership queries on both `User1Id` AND `User2Id`
- Category filtering on transactions
- Date range queries without composite indexes

**Impact:**
- Full table scans on large datasets
- Slow response times for filters
- High CPU usage on database server

**Improvement path:**
1. Profile slow queries with EXPLAIN ANALYZE
2. Add composite indexes for common filter combinations
3. Add partial indexes for status/state queries
4. Monitor query performance with Application Insights

**Priority:** MEDIUM - Performance issue under load

---

### DateTime.Now vs DateTime.UtcNow Inconsistency

**Issue:** Code uses both `DateTime.Now` and `DateTime.UtcNow`, causing potential timezone issues.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/ChatbotService.cs` (line 6302: `DateTime.Now`)
- Various other services use `DateTime.UtcNow`

**Impact:**
- Timestamps depend on server timezone
- Inconsistent behavior across deployments
- Incorrect calculations in time-based queries
- Multi-timezone tracking issues

**Fix approach:**
1. Standardize on `DateTime.UtcNow` everywhere
2. Add linter rule to catch `DateTime.Now` usage
3. Add tests for timezone-dependent calculations
4. Document timezone handling in development guide

**Priority:** HIGH - Correctness issue

---

## Fragile Areas

### New TransactionsService Not Fully Integrated

**Issue:** New `TransactionsService` and `ITransactionsService` interface created but integration unclear.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/ITransactionsService.cs` (interface)
- `backend/YouAndMeExpensesAPI/Services/TransactionsService.cs` (implementation)
- `backend/YouAndMeExpensesAPI/DTOs/TransactionDTOs.cs` (modified)

**Status:** In git status as modified/untracked - appears to be work-in-progress

**Risks:**
- Duplicate data access logic between old and new service
- Unclear which service should be used
- Migration path to new service unclear
- Could break existing transaction endpoints

**Safe modification:**
1. Complete interface implementation before using
2. Add feature flag to switch between old/new service
3. Write integration tests for all transaction operations
4. Gradually migrate controllers one endpoint at a time
5. Don't merge until old service can be fully removed

**Test coverage gaps:**
- Receipt upload/download not tested (implementation missing)
- Import functionality new and may have edge cases
- Split transactions not covered by tests

**Priority:** MEDIUM - Incomplete work

---

## Security Considerations

### JWT Token Extraction Pattern

**Issue:** Manual token extraction from headers in multiple places - potential for bugs.

**Files:**
- `backend/YouAndMeExpensesAPI/Controllers/AuthController.cs` (line 304)
- `backend/YouAndMeExpensesAPI/Controllers/AdminController.cs` (lines 396, 418)
- `backend/YouAndMeExpensesAPI/Middleware/SessionValidationMiddleware.cs` (lines 50-53)

**Pattern:**
```csharp
string token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
```

**Risk:**
- No validation of header format
- Could extract empty or malformed tokens
- Inconsistent error handling
- Silent failures possible

**Current mitigation:**
- JWT Bearer authentication configured in program.cs
- Middleware validates tokens via JWT handler

**Recommendations:**
1. Create `TokenExtractor` utility class
2. Add proper header validation
3. Centralize token extraction logic
4. Add unit tests for edge cases
5. Use `context.User` instead of manual extraction where possible

**Priority:** MEDIUM - Low risk but poor pattern

---

### No Rate Limiting on Auth Endpoints

**Issue:** Authentication endpoints (login, register) not rate-limited.

**Files:**
- `backend/YouAndMeExpensesAPI/Controllers/AuthController.cs`

**Risk:**
- Brute force attacks on login
- DoS via registration spam
- No protection against credential stuffing

**Current mitigation:** None detected

**Recommendations:**
1. Add AspNetCore.RateLimiting package
2. Create rate limit policy for auth endpoints
3. Different limits: login (5 attempts/min), register (3/min)
4. Add IP-based and user-based limiting
5. Log rate limit violations

**Priority:** HIGH - Security vulnerability

---

## Scaling Limits

### Single DbContext Pattern

**Issue:** Shared `AppDbContext` across all services without connection pooling optimization visible.

**Files:**
- `backend/YouAndMeExpensesAPI/Data/AppDbContext.cs`
- `backend/YouAndMeExpensesAPI/Program.cs` (line 190+)

**Current capacity:** No limits enforced

**Where it could break:**
- 1000+ concurrent users
- Long-running background jobs blocking connections
- Memory pressure on large result sets

**Scaling path:**
1. Enable connection pooling (appears already via EF Core)
2. Add connection limit enforcement
3. Implement query timeouts
4. Monitor connection pool usage
5. Consider read replicas for analytics queries
6. Profile under load (load test with 500+ concurrent users)

**Priority:** MEDIUM - Not immediately critical but plan ahead

---

### No Distributed Caching Strategy

**Issue:** No Redis or distributed cache visible - everything in-memory or database-backed.

**Files:** Application-wide

**Limits:**
- Can't scale horizontally beyond single server
- No cache invalidation across instances
- High database load for repeated queries

**Improvement path:**
1. Add Redis cache layer for frequently accessed data
2. Implement cache invalidation strategy
3. Cache currency rates, analytics aggregates
4. Set appropriate TTLs per cache entry type
5. Monitor cache hit rates

**Priority:** MEDIUM - Needed for horizontal scaling

---

## Missing Critical Features

### File Storage Not Implemented

**Issue:** Receipt/attachment upload completely broken.

**Blocks:**
- Receipt management feature
- Transaction attachment feature
- Travel document uploads
- Recurring bill attachments

**See:** Tech Debt section above for details.

**Priority:** CRITICAL

---

## Test Coverage Gaps

### Receipt Upload/Download Operations

**Issue:** No implementation exists - tests cannot pass.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/EntityFrameworkDataService.cs` (lines 286-301)

**What's not tested:**
- File validation (size, type)
- Virus scanning
- Storage backend errors
- Concurrent upload handling
- Path traversal prevention

**Risk:** High - file operations are security-sensitive

**Priority:** CRITICAL

---

### Bank Transaction Import Edge Cases

**Issue:** New import functionality in `TransactionsService.ImportTransactionsAsync()` needs comprehensive testing.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/TransactionsService.cs` (method)

**What should be tested:**
- Malformed CSV files
- Duplicate transaction detection
- Currency handling in import
- Large file handling (memory limits)
- Encoding issues (UTF-8, BOM)
- Missing required fields
- Decimal precision edge cases

**Priority:** HIGH - New feature

---

### Currency Conversion Accuracy

**Issue:** ChatbotService currency conversion uses live rates but accuracy not validated.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/ChatbotService.cs` (currency handler)

**What's not tested:**
- Exchange rate API failures
- Invalid currency pairs
- Rate precision (rounding errors)
- Performance with missing rates
- Stale rate handling

**Priority:** MEDIUM - Financial accuracy concern

---

### Multi-Language Consistency

**Issue:** Greek (el) and English messages mixed throughout ChatbotService - translations could be inconsistent.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/ChatbotService.cs` (hundreds of language checks)

**Risk:**
- Untranslated error messages
- Inconsistent terminology
- Hard to add new languages
- No centralized string management

**Priority:** LOW - Works but maintainability issue

---

## Dependencies at Risk

### Supabase Package Usage

**Issue:** Supabase v1.1.1 but storage actually disabled/replaced.

**Files:**
- `backend/YouAndMeExpensesAPI/YouAndMeExpensesAPI.csproj` (line 31)

**Risk:**
- Package not fully used
- Dead code potential
- Version conflicts possible
- Should be removed if not used

**Migration plan:**
1. Audit all Supabase package usage
2. Replace with chosen storage backend
3. Remove package if unused
4. Document which features use which packages

**Priority:** MEDIUM - Cleanup task

---

### PdfPig Library for Bank Statements

**Issue:** `PdfPig` v0.1.12 used for bank statement parsing but library is in early versions.

**Files:**
- `backend/YouAndMeExpensesAPI/YouAndMeExpensesAPI.csproj` (line 29)

**Risk:**
- Early version may have bugs
- Large PDF handling could fail
- Edge cases not well-tested
- Could fail on non-standard PDF formats

**Improvement:**
1. Add comprehensive tests for PDF parsing
2. Test with real bank statement samples
3. Add fallback CSV import
4. Monitor error logs for parsing failures
5. Consider alternative library (iText, PDFBox)

**Priority:** MEDIUM - Affects import reliability

---

## Architecture Concerns

### No Clear Service Boundary Between Controllers and Data Access

**Issue:** Controllers sometimes access `AppDbContext` directly; sometimes via services. Inconsistent patterns.

**Files:** Various controllers

**Impact:**
- Business logic leaks into controllers
- Hard to reuse logic across endpoints
- Difficult to test controller endpoints
- Transaction handling unclear

**Fix approach:**
1. Enforce all database access through services
2. Remove direct DbContext injection from controllers
3. Complete service layer for all major operations
4. Add integration tests to verify service contract

**Priority:** MEDIUM - Architectural cleanup

---

### Partnership Model Complexity

**Issue:** Partnership queries appear in multiple services with duplicated logic.

**Files:**
- `backend/YouAndMeExpensesAPI/Services/TransactionsService.cs` (lines 41-68)
- Possibly other services

**Pattern:** `GetUserAndPartnerIdsAsync()` implementation appears in multiple places

**Impact:**
- Bug risk if partnership logic changes
- Inconsistent behavior across features
- Violates DRY

**Fix approach:**
1. Create `IPartnershipService`
2. Centralize partnership queries
3. Add caching for active partnerships
4. Add tests for edge cases (no partner, inactive partnership)

**Priority:** LOW - Works but cleanup task

---

## Recommendations Priority Matrix

| Area | Priority | Impact | Effort |
|------|----------|--------|--------|
| File storage implementation | CRITICAL | Blocks features | MEDIUM |
| Blocking async call | HIGH | Performance | LOW |
| Rate limiting on auth | HIGH | Security | MEDIUM |
| DateTime.Now inconsistency | HIGH | Correctness | LOW |
| Pagination enforcement | HIGH | Scalability | MEDIUM |
| Large service files | MEDIUM | Maintainability | HIGH |
| Missing tests (receipt/import) | MEDIUM | Reliability | MEDIUM |
| Database indexes | MEDIUM | Performance | LOW |
| Distributed caching | MEDIUM | Scaling | HIGH |
| Service boundary clarity | MEDIUM | Architecture | MEDIUM |

---

*Concerns audit: 2026-01-21*
