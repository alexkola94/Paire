# Codebase Structure

**Analysis Date:** 2026-01-21

## Directory Layout

```
You-me-Expenses/
├── backend/
│   ├── YouAndMeExpensesAPI/              # Main ASP.NET Core API project
│   │   ├── Controllers/                  # 25 REST API endpoints
│   │   ├── Services/                     # 30+ business logic implementations
│   │   ├── Models/                       # Domain entities
│   │   ├── DTOs/                         # Data transfer objects
│   │   ├── Data/                         # AppDbContext (Entity Framework)
│   │   ├── Repositories/                 # Repository implementations
│   │   ├── Middleware/                   # Request pipeline middleware
│   │   ├── Hubs/                         # SignalR real-time hubs
│   │   ├── Utils/                        # Utility helpers
│   │   ├── Migrations/                   # EF Core database migrations (30)
│   │   ├── Program.cs                    # Application startup & DI config
│   │   ├── appsettings.json              # Configuration
│   │   └── YouAndMeExpensesAPI.csproj    # Project file
│   │
│   ├── YouAndMeExpenses.Tests/           # xUnit test project
│   │   ├── Controllers/                  # Controller tests
│   │   ├── Services/                     # Service tests
│   │   ├── Integration/                  # Integration tests
│   │   └── Models/                       # Model tests
│   │
│   └── YouAndMeExpenses.sln              # Solution file
│
├── frontend/
│   ├── src/
│   │   ├── components/                   # React UI components
│   │   ├── pages/                        # Page components (routes)
│   │   ├── services/                     # API client services
│   │   ├── context/                      # React Context providers
│   │   ├── hooks/                        # Custom React hooks
│   │   ├── travel/                       # Travel feature module
│   │   ├── i18n/                         # Internationalization
│   │   └── styles/                       # CSS/styling
│   │
│   ├── vite.config.js                    # Vite build configuration
│   ├── package.json                      # Frontend dependencies
│   └── .env                              # Environment variables
│
├── docs/                                 # Documentation files
├── .planning/
│   └── codebase/                         # Planning documents
├── .github/                              # GitHub workflows & templates
└── README.md                             # Project root documentation
```

## Directory Purposes

**Controllers (`backend/YouAndMeExpensesAPI/Controllers/`):**
- Purpose: Handle HTTP requests and route to services
- Contains: 25 API controllers, base controller with auth helpers
- Key files:
  - `BaseApiController.cs`: Abstract base with user extraction methods
  - `TransactionsController.cs`: Transaction CRUD operations
  - `PartnershipController.cs`: Partnership management
  - `LoansController.cs`: Loan tracking
  - `AuthController.cs`: Authentication endpoints
  - `AdminController.cs`: Administrative operations

**Services (`backend/YouAndMeExpensesAPI/Services/`):**
- Purpose: Implement business logic, coordinate operations
- Contains: Service interfaces (I*Service) and implementations
- Key services:
  - `TransactionsService`: Transaction CRUD and filtering
  - `BudgetService`: Budget tracking and alerts
  - `AchievementService`: Achievement unlocking logic
  - `AnalyticsService`: Financial analytics calculations
  - `ChatbotService`: AI chatbot interactions
  - `EmailService`: Email delivery via Resend API
  - `EnableBankingService`: Open banking integration
  - `GreeceEconomicDataService`: Economic data aggregation
  - `AuthService`: User authentication and JWT tokens

**Models (`backend/YouAndMeExpensesAPI/Models/`):**
- Purpose: Define domain entities
- Contains: Core business models with relationships
- Key entities:
  - `ApplicationUser`: User account (extends Identity)
  - `Transaction`: Expense/income transactions
  - `Partnership`: Couple partnership
  - `Budget`: Spending limits
  - `Loan`: Loan tracking
  - `Trip`: Travel planning entity
  - `Achievement`: User achievements/gamification
  - `AuditLog`: System activity logging

**DTOs (`backend/YouAndMeExpensesAPI/DTOs/`):**
- Purpose: Define API request/response contracts
- Contains: Request and response objects for endpoints
- Key DTOs:
  - `TransactionDTOs.cs`: Create/Update transaction requests
  - `TravelDTOs.cs`: Travel-related data transfers
  - `ChatbotDTOs.cs`: Chatbot request/response
  - `AnalyticsDTOs.cs`: Analytics data structures

**Data (`backend/YouAndMeExpensesAPI/Data/`):**
- Purpose: Database abstraction and ORM configuration
- Contains: `AppDbContext.cs` with 20+ DbSets
- Relationships: Configures all entity-to-table mappings

**Repositories (`backend/YouAndMeExpensesAPI/Repositories/`):**
- Purpose: Abstract data access patterns (emerging pattern)
- Contains: `ITravelRepository` and `TravelRepository`
- Pattern: Generic query methods, specific to Trip/ItineraryEvent entities

**Middleware (`backend/YouAndMeExpensesAPI/Middleware/`):**
- Purpose: Process HTTP request/response pipeline
- Contains:
  - `SessionValidationMiddleware`: Validates JWT tokens
  - `SecureHeadersMiddleware`: Adds security headers
  - `MetricsMiddleware`: Performance metrics collection

**Hubs (`backend/YouAndMeExpensesAPI/Hubs/`):**
- Purpose: Real-time bidirectional communication
- Contains: `MonitoringHub` for system monitoring events

**Migrations (`backend/YouAndMeExpensesAPI/Migrations/`):**
- Purpose: Database schema versioning and changes
- Contains: 30 migration files tracking schema evolution
- Pattern: Auto-generated by EF Core, describe Up/Down operations

**Tests (`backend/YouAndMeExpenses.Tests/`):**
- Purpose: Unit and integration test coverage
- Structure: Mirrors main project structure with corresponding test files

## Key File Locations

**Entry Points:**
- `backend/YouAndMeExpensesAPI/Program.cs`: API startup, DI registration, middleware setup
- `frontend/src/main.jsx`: React app entry point
- `frontend/src/pages/`: Page components routed by React Router

**Configuration:**
- `backend/YouAndMeExpensesAPI/appsettings.json`: API configuration (DB, JWT, email, etc.)
- `backend/YouAndMeExpensesAPI/.env`: Environment-specific secrets
- `frontend/.env`: Frontend API URL and feature flags
- `backend/YouAndMeExpenses.sln`: Solution configuration

**Core Logic:**
- `backend/YouAndMeExpensesAPI/Services/`: All business logic implementations
- `backend/YouAndMeExpensesAPI/Data/AppDbContext.cs`: Entity mappings and relationships
- `frontend/src/services/`: API client and state management

**Authentication & Security:**
- `backend/YouAndMeExpensesAPI/Controllers/AuthController.cs`: Auth endpoints
- `backend/YouAndMeExpensesAPI/Middleware/SessionValidationMiddleware.cs`: JWT validation
- `backend/YouAndMeExpensesAPI/Models/ApplicationUser.cs`: User model with auth fields

**Testing:**
- `backend/YouAndMeExpenses.Tests/Controllers/`: Controller unit tests
- `backend/YouAndMeExpenses.Tests/Services/`: Service logic tests
- `backend/YouAndMeExpenses.Tests/Integration/`: End-to-end integration tests

## Naming Conventions

**Files:**
- Controllers: `{Feature}Controller.cs` (e.g., `TransactionsController.cs`)
- Services: `{Feature}Service.cs` and `I{Feature}Service.cs`
- Models: PascalCase entity names (e.g., `Transaction.cs`, `Partnership.cs`)
- DTOs: `{Feature}DTOs.cs` containing multiple DTO classes
- Tests: `{Feature}Tests.cs` or `{Feature}Test.cs`

**Directories:**
- Feature-based: `Controllers/`, `Services/`, `Models/`
- By concern: `Data/`, `Middleware/`, `Hubs/`, `Utils/`
- Feature modules: `Travel/` for travel-specific code

**Classes:**
- Interfaces: Prefix `I` (e.g., `ITransactionsService`)
- Implementations: No prefix (e.g., `TransactionsService`)
- Base classes: Prefix `Base` or `Abstract` (e.g., `BaseApiController`)
- DTOs: Suffix `Dto` or `Request`/`Response` (e.g., `CreateTransactionRequest`, `TransactionDto`)

**Methods:**
- Async methods: Suffix `Async` (e.g., `GetTransactionsAsync()`)
- Queries: Prefix `Get` (e.g., `GetTransactionAsync()`)
- Mutations: Prefix `Create`, `Update`, `Delete` (e.g., `CreateTransactionAsync()`)
- Helpers: Prefix `Is`, `Has`, `Can` for boolean methods

## Where to Add New Code

**New Feature (complete end-to-end):**
1. Model: Add entity to `backend/YouAndMeExpensesAPI/Models/{Feature}.cs`
2. DbContext: Add DbSet in `backend/YouAndMeExpensesAPI/Data/AppDbContext.cs`
3. Migration: Run `dotnet ef migrations add Add{Feature}` in backend folder
4. DTO: Create `backend/YouAndMeExpensesAPI/DTOs/{Feature}DTOs.cs` with request/response objects
5. Service Interface: Create `backend/YouAndMeExpensesAPI/Services/I{Feature}Service.cs`
6. Service Implementation: Create `backend/YouAndMeExpensesAPI/Services/{Feature}Service.cs`
7. Controller: Create `backend/YouAndMeExpensesAPI/Controllers/{Feature}Controller.cs` extending `BaseApiController`
8. Register: Add service in `Program.cs` via `builder.Services.AddScoped<I{Feature}Service, {Feature}Service>()`
9. Tests: Add `backend/YouAndMeExpenses.Tests/{Feature}Tests.cs`
10. Frontend: Add React components in `frontend/src/components/{Feature}/`

**New Component/Module (frontend):**
- Location: `frontend/src/components/{Feature}/` or `frontend/src/pages/{Feature}/`
- Pattern: Create component file with `.jsx`, hook file with `.js`, styles with `.css`
- API calls: Add service in `frontend/src/services/api.js` or create feature service

**New Repository:** (for complex data access patterns)
- Interface: `backend/YouAndMeExpensesAPI/Repositories/I{Feature}Repository.cs`
- Implementation: `backend/YouAndMeExpensesAPI/Repositories/{Feature}Repository.cs`
- Register: Add in `Program.cs` as `builder.Services.AddScoped<I{Feature}Repository, {Feature}Repository>()`

**Utilities:**
- Shared helpers: `backend/YouAndMeExpensesAPI/Utils/`
- Example: `DateTimeUtils.cs` for date normalization

**Middleware:**
- Custom request processing: `backend/YouAndMeExpensesAPI/Middleware/{Feature}Middleware.cs`
- Register: Add in `Program.cs` via `app.UseMiddleware<{Feature}Middleware>()`

## Special Directories

**Migrations (`backend/YouAndMeExpensesAPI/Migrations/`):**
- Purpose: Track database schema changes
- Generated: Yes (auto-generated by EF Core)
- Committed: Yes (check-in to version control)
- Pattern: `{timestamp}_{MigrationName}.cs` (e.g., `20251205070007_InitialCreate.cs`)

**Models/Admin (`backend/YouAndMeExpensesAPI/Models/Admin/`):**
- Purpose: Admin-specific models and request objects
- Contains: `AdminActionModels.cs` with admin operations

**Travel (`frontend/src/travel/`):**
- Purpose: Travel planning feature module
- Contains: Travel-specific components, pages, services, context, hooks
- Pattern: Feature-scoped isolation for travel functionality

**Scripts (`backend/YouAndMeExpensesAPI/Scripts/`):**
- Purpose: Utility scripts for data operations
- Contains: PowerShell scripts for testing, maintenance

**PrivatePem (`backend/privatePem/` and `backend/YouAndMeExpensesAPI/privatePem/`):**
- Purpose: JWT signing keys
- Generated: No (must be generated during setup)
- Committed: No (should be in .gitignore, never commit secrets)

**i18n (`frontend/src/i18n/`):**
- Purpose: Internationalization and localization
- Contains: Language locale files (JSON or similar)
- Pattern: Language codes as filenames (en, de, el, es, etc.)

---

*Structure analysis: 2026-01-21*
