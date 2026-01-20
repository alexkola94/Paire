## Controller to Service Refactor Pattern (Travel Example)

This backend uses a strict layered approach to keep **controllers thin** and **business logic in services and repositories**. The `TravelController` + related services are the reference implementation for other domains.

### Layers

- **Controller** (`TravelController`):
  - Handles routing, model binding, and simple validation (e.g. required query/body fields).
  - Uses `BaseApiController` helpers for user identity (`GetCurrentUserId()`).
  - Delegates all domain logic to services (`ITravelService`, `ITravelGeocodingService`, etc.).

- **Services** (`TravelService`, `TravelGeocodingService`, `TravelAdvisoryService`, `TravelAttachmentService`):
  - Contain domain rules and orchestration.
  - Interact with repositories (`ITravelRepository`) and infrastructure (`IStorageService`, external APIs).
  - Expose async methods returning models or DTOs without any HTTP concerns.

- **Repositories** (`ITravelRepository`, `TravelRepository`):
  - Encapsulate all EF Core queries for the travel domain.
  - Controllers never depend on `AppDbContext` directly; only services talk to repositories.

- **DTOs & Utils** (`TravelDTOs`, `DateTimeUtils`):
  - DTOs define stable response shapes for external APIs (geocoding, advisory, attachments).
  - `DateTimeUtils` centralizes UTC handling, reused across services and (optionally) other domains.

### Checklist When Refactoring Another Controller

1. **Identify responsibilities** in the controller:
   - Persistence logic (EF queries).
   - External API calls.
   - Cross-cutting helpers (dates, user identity, mapping).
2. **Create interfaces** under `Services` (and `Repositories` if needed):
   - Follow the existing `I*Service` pattern.
   - Keep service methods focused on domain operations (no HTTP types).
3. **Move EF Core queries** into a repository:
   - Create `I<Domain>Repository` + implementation with async methods.
4. **Move heavy logic** into services:
   - Inject repositories and infrastructure services via DI.
   - Keep controllers as one or two service calls + result mapping.
5. **Keep API contracts stable**:
   - Do not change routes, parameter names, or JSON shapes without a versioning plan.
   - Use DTOs where anonymous objects were previously returned.
6. **Register everything in DI** in `Program.cs`:
   - `AddScoped<I<Domain>Service, <Domain>Service>()`.
   - `AddScoped<I<Domain>Repository, <Domain>Repository>()`.
   - `AddHttpClient<...>` for external HTTP-dependent services.

Use the `TravelController` and `TravelService` as a concrete template when refactoring other controllers like `TransactionsController` or `BudgetsController`.

