# Codename_Shield (Identity Microservice)

**Codename_Shield** is a robust, production-ready Authentication & Identity Microservice built with **.NET 9.0**. It is designed to be a standalone, reusable component for any application requiring secure user management.

## Features

### 🔐 Authentication & Security
*   **JWT Authentication**: Secure Access Tokens (15 min) and Refresh Tokens (7 days).
*   **Secure Headers**: Implements `HSTS`, `CSP`, `X-Frame-Options`, and more using `NWebsec`.
*   **Rate Limiting**: Protects against brute-force attacks (10 requests/10s per IP).
*   **Kestrel Hardening**: Server fingerprints removed.
*   **Password Policy**: Strong password enforcement (Digits, Upper, Lower, 6+ chars).

### 🚀 Architecture
*   **Framework**: ASP.NET Core Web API (.NET 9).
*   **Database**: PostgreSQL (via Npgsql), optimized for **Supabase**.
*   **Identity**: ASP.NET Core Identity (Extended `ApplicationUser`).
*   **Logging**: Structured logging with **Serilog** (Console + File).
*   **Documentation**: Swagger/OpenAPI (`/swagger`) with clean versioning (`api/v1`).
*   **Monitoring**: Health Checks at `/health`.

## Tech Stack
*   **.NET 9**
*   **PostgreSQL** (Supabase)
*   **Entity Framework Core**
*   **Serilog**
*   **Swashbuckle (Swagger)**
*   **Asp.Versioning**

## Project Structure
*   `Codename_Shield.API`: The main Web API project.
*   `Codename_Shield.API/Controllers`: API Endpoints (`AuthController`).
*   `Codename_Shield.API/Entities`: Database Models (`ApplicationUser`).
*   `Codename_Shield.API/Services`: Business logic (`TokenService`).

## Getting Started
See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed installation and running instructions.
