# Modular Monolith Migration Guide

This guide documents the migration of the Paire (You&me Expenses) project to a modular monolith architecture.

## Overview

The application has been refactored from a single monolithic codebase into a modular structure with clear boundaries:

- **Backend**: .NET 8 with domain modules (Identity, Finance, Partnership, Travel, Shopping, Analytics, AI, Gamification, Notifications, Banking, Admin)
- **Frontend**: React 18 + Vite with feature-based organization
- **Mobile**: React Native (Expo) with mirrored feature structure

## Backend Architecture

### Solution Structure

```
backend/
  Paire.sln
  src/
    Host/
      Paire.Api/           # Slim host - Program.cs, middleware, appsettings
    Shared/
      Paire.Shared.Kernel/       # Base entities, Result<T>, IModule, integration events
      Paire.Shared.Infrastructure/ # Email, storage, logging, CSRF filter
    Modules/
      Paire.Modules.Identity/
      Paire.Modules.Finance/
      Paire.Modules.Partnership/
      Paire.Modules.Travel/
      Paire.Modules.Shopping/
      Paire.Modules.Analytics/
      Paire.Modules.AI/
      Paire.Modules.Gamification/
      Paire.Modules.Notifications/
      Paire.Modules.Banking/
      Paire.Modules.Admin/
```

### Module Internal Structure

Each module follows:

```
Paire.Modules.{Name}/
  Contracts/              # PUBLIC types only - interfaces, DTOs, events
  Core/                   # INTERNAL - entities, services, business logic
  Infrastructure/        # INTERNAL - DbContext, repositories
  Api/                   # INTERNAL - controllers, hubs
  {Name}Module.cs        # AddXxxModule() extension method
```

### Cross-Module Communication

- **Contracts**: Modules reference other modules only via their `Contracts` project
- **Integration Events**: MediatR `INotification` for decoupled communication (e.g., `TransactionCreatedEvent`)
- **Shared Events**: Defined in `Paire.Shared.Kernel.Events` (e.g., `FinanceEvents.cs`)

### Key Contracts

| Contract | Provider | Consumers |
|----------|----------|-----------|
| `IPartnershipResolver` | Partnership | Finance, Travel, Analytics |
| `IUserProfileProvider` | Identity | Travel, AI, Analytics |
| `TransactionCreatedEvent` | Finance | Identity (StreakService), Gamification |

## Frontend Architecture

```
frontend/src/
  app/           # App shell, routes, providers
  shared/        # Cross-feature: components, hooks, services, utils
  features/      # Domain modules: auth, finance, partnership, travel, etc.
```

## Running the Application

### Backend

```bash
cd backend
dotnet run --project src/Host/Paire.Api/Paire.Api.csproj
```

Or build with Docker:

```bash
docker build -t paire-api -f backend/Dockerfile backend/
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Mobile

```bash
cd mobile-app
npm install
npx expo start
```

## Database

All modules share the same PostgreSQL database. Each module has its own DbContext mapping only its entities. The connection string is configured in `appsettings.json` under `ConnectionStrings:DefaultConnection`.

## Migration History

The original `YouAndMeExpensesAPI` project has been removed. Database migrations from the legacy project were applied to the shared database. For future schema changes, add migrations from the appropriate module's DbContext.

## Contributing

When adding new features:

1. **Backend**: Create or extend the appropriate module. Use contracts for cross-module dependencies.
2. **Frontend**: Add pages/components under `features/{domain}/`.
3. **Mobile**: Mirror the structure in `features/{domain}/screens/`.
