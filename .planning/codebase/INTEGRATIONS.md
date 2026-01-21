# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Email & Communication:**
- Resend API (`https://api.resend.com`) - HTTP-based email sending (switched from SMTP to bypass port blocking)
  - SDK/Client: HttpClient with Resend API endpoint
  - Auth: API Key via `EmailSettings:Password` env var
  - Implementation: `Services/EmailService.cs`

**Financial & Banking:**
- Enable Banking API - Open Banking account access and transaction retrieval
  - Endpoint: `https://api.enablebanking.com`
  - Auth: OAuth 2.0 with client credentials and private key
  - Config keys: `EnableBanking:ClientId`, `EnableBanking:ClientSecret`, `EnableBanking:PrivateKeyPem`
  - Implementation: `Services/EnableBankingService.cs`

- Plaid API - Alternative bank connection widget (react-plaid-link)
  - Environment: Sandbox (configurable)
  - Auth: ClientId and Secret
  - Config keys: `Plaid:ClientId`, `Plaid:Secret`
  - Frontend: `react-plaid-link` component integration

**News & Economic Data:**
- News API (`https://newsapi.org`) - Greek business news
  - API Key: `NewsAPI:ApiKey`
  - Free tier: 100 requests/day
  - Implementation: `Services/GreeceEconomicDataService.cs`

- GNews API (`https://gnews.io`) - General news aggregation
  - API Key: `GNews:ApiKey`
  - Free tier: 100 requests/day without key, more with key
  - Implementation: News headline retrieval

- Currents API (`https://currentsapi.services`) - Aggregated economic news
  - API Key: `CurrentsAPI:ApiKey`
  - Free tier: 200 requests/day
  - Implementation: Economic data retrieval

- Eurostat API - Greece economic statistics (free, no auth)
  - Endpoint: Eurostat public API
  - Auth: None required
  - Implementation: `Services/GreeceEconomicDataService.cs`

**Search & Recommendations:**
- SerpApi (`https://serpapi.com`) - Google Search API
  - API Key: `SerpApi:ApiKey`
  - Implementation: `Controllers/SerpApiController.cs`, `ChatbotService.cs`
  - Use case: Information retrieval for chatbot

**Travel & Location Services:**
- Travel Advisory API (TuGo) - Travel warnings and safety information
  - API Key: `TuGo:ApiKey`
  - HTTP Client: Configured with 10-second timeout
  - Implementation: `Services/TravelAdvisoryService.cs`
  - Endpoints: Registered as `ITravelAdvisoryService` with HttpClient

- Mapbox GL - Map rendering and visualization
  - SDK: `mapbox-gl` (npm) and `react-map-gl` (React wrapper)
  - Frontend configuration: `vite.config.js` includes mapbox-gl optimization
  - Features: Theme-based styles for light/dark modes
  - Implementation: Travel/trip planning map displays

**Geocoding Services:**
- Travel Geocoding Service - Location lookup for trip cities
  - HTTP Client: Configured with 10-second timeout and JSON headers
  - Implementation: `Services/TravelGeocodingService.cs`
  - Use case: Convert city names to coordinates for map display

**Currency Conversion:**
- Currency Service - Real-time exchange rates
  - HTTP Client: Configured with 30-second timeout
  - Implementation: `Services/CurrencyService.cs`
  - Use case: Multi-currency expense tracking

## Data Storage

**Primary Database:**
- PostgreSQL 15+ (AWS hosted via Supabase)
  - Connection: `DefaultConnection` from `appsettings.json`
  - Connection String: `User Id=postgres.sirgeoifiuevsdrjwfwq;Password=***;Server=aws-1-eu-central-1.pooler.supabase.com;Port=5432;Database=postgres`
  - Client: Entity Framework Core 8.0.11 with Npgsql driver
  - Features: Retry-on-failure (5 retries, 30-second max delay)
  - Configuration: `Data/AppDbContext.cs` with 40+ DbSets

**File Storage:**
- Supabase Storage (file bucket storage)
  - URL: `https://sirgeoifiuevsdrjwfwq.supabase.co`
  - Auth: Anonymous API Key (`VITE_SUPABASE_ANON_KEY`)
  - Client: Supabase SDK (NuGet package 1.1.1)
  - Implementation: `Services/SupabaseStorageService.cs`
  - Use cases: User avatars, recurring bill attachments, travel documents, itinerary attachments

**Client-side Storage:**
- IndexedDB (via Dexie 4.2.1)
  - Purpose: Offline data caching
  - Implementation: Frontend localStorage for app data
  - Use case: Offline-first functionality

## Authentication & Identity

**Primary Auth Provider:**
- Custom Implementation with ASP.NET Core Identity
  - User Management: `ApplicationUser` entity with Identity
  - Database: PostgreSQL via Entity Framework Core
  - Configuration: `Program.cs` lines 215-340

**JWT Token-Based Authentication:**
- Token Generation: `Services/IJwtTokenService` interface
  - Implementation: `Services/JwtTokenService.cs`
  - Signing Algorithm: HS256 (symmetric)
  - Secret: `JwtSettings:Secret` env var
  - Issuer: Configurable via `JwtSettings:Issuer` (defaults to "Codename_Shield")
  - Audience: Configurable via `JwtSettings:Audience` (defaults to "Codename_Shield_Clients")
  - Expiration: Configurable via `JwtSettings:ExpirationMinutes` (default 60 minutes)
  - Refresh Token: `JwtSettings:RefreshTokenExpirationDays` (default 7 days)

**Two-Factor Authentication:**
- OTP Implementation: Otp.NET 1.4.1
  - Services: `Services/ITwoFactorAuthService`
  - Implementation: `Services/TwoFactorAuthService.cs`
  - Methods: TOTP (Time-based One-Time Password)
  - Backup codes: Stored in ApplicationUser.BackupCodes

**Session Management:**
- Session Service: `Services/ISessionService`
  - Implementation: `Services/SessionService.cs`
  - Tracking: `UserSessions` table in database
  - Enrichment: Token validation enriches principal with local user ID

**Email Verification:**
- Email Token: `ApplicationUser.EmailVerificationToken`
  - Requirement: Email must be verified before sign-in
  - Configuration: `SignIn.RequireConfirmedEmail = true`

**Password Reset:**
- Reset Token: `ApplicationUser.PasswordResetToken` with expiration
  - Expiration: `ApplicationUser.PasswordResetTokenExpires`
  - Sent via: Email service

## Monitoring & Observability

**Error Tracking & Logging:**
- Application Logging: Built-in .NET Core logging
  - Configured in `appsettings.json` and `Program.cs`
  - Log levels: Information (default), Warning (ASP.NET Core middleware)
- No external error tracking service detected (e.g., Sentry, Application Insights)

**Audit Logging:**
- Audit Service: `Services/IAuditService` and `Services/AuditService.cs`
  - Storage: `AuditLogs` table
  - Scope: Request-scoped injection
  - Use case: Track sensitive operations

**System Monitoring:**
- Metrics Service: `Services/MetricsService.cs` (Singleton)
  - Purpose: Request timing and performance metrics
  - Middleware: `Middleware/MetricsMiddleware.cs`
  - Use case: Performance tracking across requests

- Monitoring Hub: `Hubs/MonitoringHub.cs`
  - Protocol: SignalR (real-time updates)
  - Endpoint: `/hubs/monitoring`
  - Background Service: `MonitoringBackgroundService`

**Health Checks:**
- Endpoint: `GET /health`
  - Returns: Status, timestamp, version, service statuses
  - Response: `{ status: "healthy", timestamp, version, services: { database, email, authentication } }`

**Diagnostics:**
- Email Diagnostics: `GET /diagnostics/email`
  - Tests: DNS resolution, HTTPS connectivity to Resend API
  - Returns: Test results and diagnostic logs

## CI/CD & Deployment

**Hosting:**
- Backend: Render.com (primary deployment target)
  - Configuration: Dockerfile for containerization
  - Base images: .NET 8.0 ASP and SDK
  - Environment: Production HTTPS enforced

- Frontend: GitHub Pages (primary)
  - Deployment: gh-pages npm package
  - Alternative: Vercel (utilities included)

**Configuration for Render.com:**
- Reload on Change: Disabled (`DOTNET_hostBuilder:reloadConfigOnChange=false`)
- Forwarded Headers: Configured for reverse proxy
  - Headers: X-Forwarded-For, X-Forwarded-Proto
  - Networks: All trusted

## Environment Configuration

**Required Backend Environment Variables:**
- `DefaultConnection` - PostgreSQL connection string
- `JwtSettings:Secret` - JWT signing key (min 32 characters for HS256)
- `JwtSettings:Issuer` - JWT issuer
- `JwtSettings:Audience` - JWT audience
- `EmailSettings:SenderEmail` - From email address
- `EmailSettings:Password` - Resend API key
- `Supabase:Url` - Supabase project URL
- `Supabase:Key` - Supabase anonymous key

**Optional Backend Environment Variables:**
- `CORS_ORIGINS` - Custom CORS origins (comma-separated)
- `EnableBanking:ClientId` - Open Banking API client ID
- `Plaid:ClientId` - Plaid API client ID
- `NewsAPI:ApiKey` - News API key
- `GNews:ApiKey` - GNews API key
- `CurrentsAPI:ApiKey` - Currents API key
- `SerpApi:ApiKey` - SerpApi key
- `TuGo:ApiKey` - Travel Advisory API key

**Required Frontend Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_BACKEND_API_URL` - Backend API endpoint

**Secrets Location:**
- Backend: `appsettings.json` (checked into repo - WARNING: contains exposed secrets)
- Backend: Environment variables (Render.com dashboard)
- Frontend: `.env` file (checked into repo - WARNING: contains exposed secrets)

## Webhooks & Callbacks

**Incoming Webhooks:**
- None detected in current configuration

**Outgoing Callbacks:**
- Email Service Webhooks: Not configured (Resend API supports webhooks, currently unused)
- Bank Connection Callback: `http://localhost:5038/api/open-banking/callback` (Enable Banking OAuth redirect)
  - Implementation: Open Banking controller handling
- Plaid Callback: `http://localhost:3000` (configured redirect_uri)

## Real-Time Communication

**SignalR Integration:**
- Server Hub: `Hubs/MonitoringHub.cs`
- Endpoint: `/hubs/monitoring`
- Protocol: WebSocket with JSON protocol
- Auth: JWT Bearer token via query string (`access_token` query param)
- Token Validation: `OnMessageReceived` handler extracts token from query
- Client: `@microsoft/signalr` (npm 10.0.0)
- Use case: Real-time monitoring and notifications

## Third-Party SDKs

**Payment & Financial:**
- Plaid React Component: `react-plaid-link` 4.1.1
- No Stripe integration detected (referenced in CLAUDE.md but not in current stack)

**Maps:**
- Mapbox GL JS: 3.18.0
- React Map GL: 8.1.0

**Excel & File Export:**
- ExcelJS 4.4.0 - Frontend Excel generation

**QR Codes:**
- QRCoder 1.7.0 - Backend QR generation
- qrcode.react 4.2.0 - Frontend QR rendering

---

*Integration audit: 2026-01-21*
