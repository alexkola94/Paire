# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- C# 12.0 - Backend (ASP.NET Core 8.0)
- JavaScript (ES6+) - Frontend (React 18.2)

**Secondary:**
- TypeScript - Type definitions (optional in frontend)
- HTML5 / CSS3 - Frontend markup and styling

## Runtime

**Backend Environment:**
- .NET Runtime 8.0 (LTS)
- ASP.NET Core 8.0.11

**Frontend Environment:**
- Node.js >= 18.0.0 < 25.0.0
- npm >= 9.0.0

**Package Managers:**
- npm (JavaScript/Node dependencies)
- NuGet (.NET package manager)
- Lockfiles: `package-lock.json` (present)

## Frameworks

**Backend - Web & API:**
- ASP.NET Core 8.0.11 - Web framework and REST API
- SignalR - Real-time bidirectional communication via WebSocket

**Backend - Database:**
- Entity Framework Core 8.0.11 - ORM with PostgreSQL provider
- Npgsql.EntityFrameworkCore.PostgreSQL 8.0.11 - PostgreSQL EF Core driver

**Backend - Authentication & Identity:**
- ASP.NET Core Identity 8.0.11 - User management and authentication
- JWT Bearer Authentication - Token-based auth with System.IdentityModel.Tokens.Jwt 8.3.0

**Backend - API Documentation:**
- Swashbuckle.AspNetCore 6.8.1 - OpenAPI/Swagger generation

**Frontend - Core:**
- React 18.2.0 - UI framework
- React Router DOM 6.21.1 - Client-side routing

**Frontend - Build & Dev:**
- Vite 7.3.0 - Build tool and dev server
- @vitejs/plugin-react 4.2.1 - React integration for Vite
- Vite PWA 1.2.0 - Progressive Web App support

**Frontend - Testing:**
- Vitest 4.0.16 - Unit testing framework
- @testing-library/react 14.1.2 - React component testing utilities
- @testing-library/jest-dom 6.1.5 - DOM matchers
- jsdom 23.0.1 - DOM implementation for Node.js testing

**Frontend - Linting & Formatting:**
- ESLint 8.55.0 - JavaScript linting
- eslint-plugin-react 7.33.2 - React linting rules
- Prettier (via CLI) - Code formatting

## Key Dependencies

**Backend - Critical Infrastructure:**
- CsvHelper 33.1.0 - CSV file parsing and generation
- Newtonsoft.Json 13.0.4 - JSON serialization/deserialization
- System.IdentityModel.Tokens.Jwt 8.3.0 - JWT token validation and creation

**Backend - Email & Communication:**
- MailKit 4.14.1 - IMAP, POP3, SMTP client library
- MimeKit 4.14.0 - MIME message creation and parsing
- HTTP-based Resend API integration (via HttpClient)

**Backend - Security & Encryption:**
- Otp.NET 1.4.1 - One-Time Password (2FA) generation
- System.IdentityModel.Tokens.Jwt - JWT handling

**Backend - File Processing:**
- PdfPig 0.1.12 - PDF document reading and parsing
- QRCoder 1.7.0 - QR code generation
- EPPlus (indirectly referenced) - Excel file generation

**Frontend - Data Management:**
- @tanstack/react-query 5.90.12 - Server state management and caching
- Dexie 4.2.1 - IndexedDB wrapper for offline storage

**Frontend - UI & Visualization:**
- Chart.js 4.5.1 - Chart library
- react-chartjs-2 5.3.1 - React wrapper for Chart.js
- Recharts 2.15.4 - React charting library
- Mapbox GL 3.18.0 - Map rendering
- react-map-gl 8.1.0 - React wrapper for Mapbox
- Framer Motion 12.26.2 - Animation library
- React Icons 5.0.1 - Icon library

**Frontend - Forms & Input:**
- react-otp-input 3.1.1 - OTP input component
- react-plaid-link 4.1.1 - Plaid bank connection widget

**Frontend - Utilities & Formatting:**
- date-fns 3.0.6 - Date manipulation and formatting
- react-markdown 10.1.0 - Markdown rendering
- remark-gfm 4.0.1 - GitHub-Flavored Markdown support
- remark-breaks 4.0.0 - Line break handling
- qrcode.react 4.2.0 - QR code rendering
- ExcelJS 4.4.0 - Excel file generation and parsing

**Frontend - Real-time Communication:**
- @microsoft/signalr 10.0.0 - SignalR client for real-time updates

**Frontend - Internationalization:**
- i18next 23.7.16 - Translation framework
- react-i18next 14.0.0 - React integration for i18next

**Frontend - Windowing:**
- react-window 2.2.5 - Virtualized lists for performance

**Frontend - Deployment:**
- gh-pages 25.2.0 - GitHub Pages deployment
- Vercel 25.2.0 - Vercel hosting utilities

## Configuration

**Environment Variables - Backend:**
- `ASPNETCORE_URLS` - API server URL binding
- `DefaultConnection` - PostgreSQL connection string
- `JwtSettings:Secret` - JWT signing key
- `JwtSettings:Issuer` - JWT issuer claim
- `JwtSettings:Audience` - JWT audience claim
- `JwtSettings:ExpirationMinutes` - Token lifetime
- `EmailSettings:SenderEmail` - From email address
- `EmailSettings:Password` - Email API key (Resend)
- `Supabase:Url` - Supabase project URL
- `Supabase:Key` - Supabase service key
- `CORS_ORIGINS` - Comma-separated allowed origins
- `EnableBanking:ClientId` - Open Banking API credentials
- `Plaid:ClientId`, `Plaid:Secret` - Plaid API keys
- `NewsAPI:ApiKey`, `GNews:ApiKey`, `CurrentsAPI:ApiKey` - News service keys
- `SerpApi:ApiKey` - Google Search API key
- `TuGo:ApiKey` - Travel advisory API key

**Environment Variables - Frontend:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous API key
- `VITE_BACKEND_API_URL` - Backend API endpoint (e.g., http://localhost:5038)

**Build Configuration:**
- `appsettings.json` - Backend configuration file (database, JWT, email settings)
- `.env` - Frontend environment variables (Vite)
- `vite.config.js` - Frontend build and dev server configuration
- `YouAndMeExpensesAPI.csproj` - Backend project file with NuGet package references
- `package.json` - Frontend project file with npm dependencies

## Platform Requirements

**Development:**
- Node.js 18+
- .NET SDK 8.0+
- PostgreSQL 15+ (local or remote)
- npm 9+
- Git
- Text editor or IDE (VS Code, Visual Studio, Rider)

**Production:**
- .NET Runtime 8.0 (for backend)
- PostgreSQL 15+ database
- Node.js or static hosting (frontend is SPA)
- HTTPS support
- DNS configuration for API and frontend domains

**Container Support:**
- Docker for backend containerization (Dockerfile present)
- Docker base images: `mcr.microsoft.com/dotnet/aspnet:8.0`, `mcr.microsoft.com/dotnet/sdk:8.0`

## Deployment Targets

**Backend:**
- Render.com (primary - configured for deployment)
- Docker/Kubernetes compatible environments
- IIS/Windows Server (ASP.NET Core compatible)
- Linux servers with .NET Runtime 8.0

**Frontend:**
- GitHub Pages (configured with gh-pages deployment)
- Vercel (utilities included)
- Any static hosting (Netlify, AWS S3, etc.)
- Docker/Kubernetes (requires Node.js or build artifact server)

## Version Information

**Backend Version:** 2.1.0
**Frontend Version:** 2.1.0
**.NET Target:** net8.0
**Node Range:** >=18.0.0 <25.0.0

---

*Stack analysis: 2026-01-21*
