# Architecture

**Analysis Date:** 2026-01-21

## Pattern Overview

**Overall:** Three-tier layered architecture with Clean Architecture principles applied to an ASP.NET Core backend and React frontend.

**Key Characteristics:**
- Separation of concerns across Presentation, Business Logic, and Data layers
- Controller-based REST API with service layer abstraction
- Repository pattern for data access
- Entity Framework Core with PostgreSQL for persistence
- Dependency injection throughout the application
- JWT-based authentication with role-based authorization
- SignalR for real-time features

## Layers

**Presentation Layer (API):**
- Purpose: Handle HTTP requests, route to services, return JSON responses
- Location: `backend/YouAndMeExpensesAPI/Controllers/`
- Contains: 25 REST API controllers inheriting from `BaseApiController`
- Depends on: Service interfaces, DTOs, Models
- Used by: Frontend React application, external clients

**Business Logic Layer (Services):**
- Purpose: Encapsulate domain logic, coordinate operations, enforce business rules
- Location: `backend/YouAndMeExpensesAPI/Services/`
- Contains: Service interfaces (prefix `I`) and implementations, 30+ service classes
- Depends on: DbContext, other services, external APIs
- Used by: Controllers

**Data Access Layer (Repositories & DbContext):**
- Purpose: Abstract database operations, provide data queries
- Location: `backend/YouAndMeExpensesAPI/Data/` (DbContext), `backend/YouAndMeExpensesAPI/Repositories/`
- Contains: `AppDbContext` with 20+ DbSets, repository interfaces/implementations
- Depends on: PostgreSQL database, Entity Framework Core
- Used by: Services

**Domain Layer (Models & DTOs):**
- Purpose: Represent business entities and data transfer objects
- Location: `backend/YouAndMeExpensesAPI/Models/` and `backend/YouAndMeExpensesAPI/DTOs/`
- Contains: Entity models (Transactions, Users, Partnerships, Loans, etc.), DTOs for API contracts
- Depends on: .NET base types only
- Used by: All layers

## Data Flow

**Request Processing Flow:**

1. **HTTP Request** → Frontend sends API request with JWT token
2. **Authentication Middleware** → `SessionValidationMiddleware` validates JWT
3. **Authorization** → `BaseApiController` extracts user ID from claims
4. **Controller** → `TransactionsController.GetTransactions()` receives request
5. **Service Invocation** → Controller calls `ITransactionsService.GetTransactionsAsync(userId, filters)`
6. **Business Logic** → `TransactionsService` applies filters, fetches partner data, builds response
7. **Data Access** → EF Core queries `AppDbContext.Transactions` with LINQ
8. **Database** → PostgreSQL executes query
9. **Transformation** → Service maps entities to DTOs
10. **Response** → Controller returns `Ok(data)` with camelCase JSON
11. **Frontend** → React receives data, updates state, renders UI

**Key Patterns:**
- Controllers are thin, delegating logic to services
- Services use DbContext directly (no explicit repository layer yet, except Travel)
- DTOs shield API contracts from domain model changes
- Authentication flows through JWT claims extraction

## Key Abstractions

**Service Interfaces:**
- Purpose: Define contracts for business operations
- Examples: `ITransactionsService`, `IBudgetService`, `IAnalyticsService`, `IAchievementService`
- Pattern: Each service has an interface (`I*Service`) and implementation (`*Service`)
- Dependencies injected into controllers/services at startup

**DbContext (AppDbContext):**
- Purpose: Central abstraction for all database operations
- Location: `backend/YouAndMeExpensesAPI/Data/AppDbContext.cs`
- Contains: 20+ DbSets for domain entities
- Configured with PostgreSQL, Identity framework, model mappings

**DTOs (Data Transfer Objects):**
- Purpose: Define API request/response schemas
- Location: `backend/YouAndMeExpensesAPI/DTOs/`
- Examples: `TransactionDTOs.cs` (CreateTransactionRequest, TransactionWithProfileDto)
- Pattern: Request DTOs for input, response DTOs for output, separate from domain models

**Repository Pattern:**
- Purpose: Abstract data access, provide collection-like queries
- Example: `ITravelRepository` and `TravelRepository` for Trip/ItineraryEvent operations
- Still emerging: Not all entities have repositories; most services query DbContext directly

## Entry Points

**API Entry Point:**
- Location: `backend/YouAndMeExpensesAPI/Program.cs`
- Triggers: Application startup
- Responsibilities:
  - Configure dependency injection (services, DbContext, authentication)
  - Setup middleware pipeline (CORS, headers, authentication, logging)
  - Register controllers and SignalR hubs
  - Configure JWT authentication with role-based claims
  - Initialize database connection and Entity Framework

**Main Controller:**
- Location: `backend/YouAndMeExpensesAPI/Controllers/BaseApiController.cs`
- Triggers: All controller actions inherit from this
- Responsibilities:
  - Extract authenticated user ID from JWT claims
  - Provide authentication helper methods
  - Standardize user authorization checks

**Frontend Entry Point:**
- Location: `frontend/src/pages/` and React Router
- Triggers: Page navigation, component mounting
- Responsibilities:
  - Route requests to appropriate pages/components
  - Fetch data from API services
  - Manage local state and context

## Error Handling

**Strategy:** Layered error handling with specific exception types and HTTP status codes.

**Patterns:**
- **Service Layer:** Throws domain exceptions (`ValidationException`, `NotFoundException`, `DuplicateException`)
- **Controller Layer:** Catches exceptions, maps to HTTP status codes (400, 401, 404, 500)
- **Middleware:** `SessionValidationMiddleware` validates JWT, returns 401 if invalid
- **Logging:** ILogger<T> injected, errors logged before returning error responses
- **Response Format:** Consistent error object with message and optional details

**Example Flow:**
```csharp
// Service throws
throw new NotFoundException($"Transaction {id} not found");

// Controller catches
catch (NotFoundException ex)
{
    _logger.LogWarning(ex, "Transaction not found");
    return NotFound(new { message = ex.Message });
}
```

## Cross-Cutting Concerns

**Logging:**
- Framework: ILogger<T> with Microsoft.Extensions.Logging
- Pattern: Injected into controllers/services, structured logging with context
- Levels: Information (normal flow), Warning (expected errors), Error (failures)

**Validation:**
- Pattern: Validation in services before database operations
- Example: `TransactionsService` validates transaction amounts, dates, user ownership
- HTTP model validation in controllers via `[Validate]` attributes

**Authentication:**
- JWT Bearer tokens issued by Shield authentication service
- Validated in `Program.cs` JWT configuration
- Claims extracted in `BaseApiController` methods
- Role-based authorization via `[Authorize(Roles = "...")]` attributes on controllers

**Authorization:**
- Pattern: User ID extraction from claims, partnership verification
- Example: `TransactionsService` checks if user is transaction owner or partner
- Prevents users from accessing other users' data

---

*Architecture analysis: 2026-01-21*
