# Paire - Project Documentation
**Version:** 2.0.0
**Date:** December 15, 2025

---

## 1. Executive Summary

**Paire** is a comprehensive expense tracking and financial management platform designed specifically for couples. It enables users to track expenses, income, loans, and budgets, both individually and jointly. Distinguishing features include robust partnership sharing capabilities, an AI-powered financial chatbot, real-time economic data integration, and secure bank connectivity via Plaid.

The application leverages a modern technology stack with a React/Vite frontend and a .NET 8 API backend, utilizing Supabase (PostgreSQL) for reliable data persistence and authentication.

---

## 2. Technical Architecture

### 2.1 Technology Stack

#### Frontend
*   **Framework:** React 18.2
*   **Build Tool:** Vite
*   **Routing:** React Router v6
*   **State Management:** React Context API
*   **Styling:** CSS3 (Custom responsive design)
*   **Internationalization:** react-i18next (English, Greek, Spanish, French)
*   **HTTP Client:** Axios (Custom wrapper)

#### Backend
*   **Framework:** ASP.NET Core Web API (.NET 8.0)
*   **Language:** C#
*   **ORM:** Entity Framework Core
*   **Authentication:** JWT (Json Web Tokens) with Supabase Auth integration
*   **API Documentation:** Swagger/OpenAPI

#### Database & Infrastructure
*   **Database:** PostgreSQL (via Supabase)
*   **Auth Provider:** Supabase Auth
*   **Storage:** Supabase Storage (for receipts/avatars)
*   **Hosting:** Render.com (Backend), GitHub Pages (Frontend)

### 2.2 System Architecture Diagram

```mermaid
graph TD
    User[Web/Mobile User] -->|HTTPS| CDN[GitHub Pages / CDN]
    User -->|API Requests| API[Dotnet 8 API (Render)]
    
    subgraph Frontend
        App[React App]
        Router[React Router]
        Auth[Auth Provider]
    end
    
    subgraph Backend Services
        AuthService[Auth Service]
        TransService[Transaction Service]
        PlaidService[Plaid Integration]
        AIService[OpenAI Chatbot]
    end
    
    API --> AuthService
    API --> TransService
    API --> PlaidService
    API --> AIService
    
    AuthService --> Supabase[Supabase PostgreSQL]
    TransService --> Supabase
    
    PlaidService --> PlaidAPI[Plaid Financial API]
    AIService --> OpenAI[OpenAI API]
```

---

## 3. Key Feature Modules

### 3.1 Financial Management
*   **Transactions:** Comprehensive logging of Income and Expenses with categorization, dates, and optional file attachments.
*   **Budgets:** Category-specific monthly limits with visual progress bars and alerts when nearing limits.
*   **Loans:** Dedicated tracking for money lent/borrowed, including installment plans and payment history.

### 3.2 Partnership & Collaboration
*   **Dual View:** Users can toggle between "Personal", "Partner", and "Combined" views for all financial data.
*   **Invitations:** Secure code-based invitation system to link partner accounts.
*   **Privacy:** Strict Row Level Security (RLS) ensures data is only accessible to the account owner and their linked partner.

### 3.3 Advanced Integrations
*   **Bank Sync (Plaid):** Securely link bank accounts to import transactions automatically.
    *   *Status:* Production-ready (Integration verified).
*   **AI Chatbot:** Natural language interface for financial queries (e.g., "How much did we spend on food last month?").
*   **Economic Data:** Real-time integration with Eurostat/Greek economic APIs for CPI, inflation, and GDP tracking.

### 3.4 Security
*   **MFA:** Multi-Factor Authentication support.
*   **Session Management:** Secure JWT handling with refresh tokens and device tracking.
*   **Encryption:** All data encrypted at rest (PostgreSQL) and in transit (TLS 1.2+).

---

## 4. Data Model (Database Schema)

The database is normalized and runs on PostgreSQL. Key entities include:

*   `AspNetUsers` / `user_profiles`: Stores user identity, preferences, and linkage to Supabase Auth.
*   `partnerships`: Maps relationships between two users.
*   `transactions`: Core ledger table for income/expense records. Linked to `user_id` and optional `category_id`.
*   `budgets`: Monthly storage of budget limits per category/user.
*   `loans`: Stores principal, interest rate, and terms for personal loans.
*   `loan_payments`: Ledger of repayments against specific loans.
*   `recurring_bills`: Configurations for automated recurring expense generation.
*   `bank_connections` / `bank_accounts`: Stores encrypted tokens and metadata for linked Plaid accounts.

---

## 5. API Reference Summary

The backend exposes over 75 RESTful endpoints. Key controllers include:

*   `AuthController`: Registration, Login, 2FA, Password Management.
*   `TransactionsController`: CRUD operations for financial records.
*   `BudgetsController`: Budget setting and status tracking.
*   `OpenBankingController`: Plaid Link token generation and public token exchange.
*   `ProfileController`: User profile management and avatar upload.
*   `PartnershipController`: Managing invitation codes and partner linkage.

*Full API documentation is available via the Swagger UI endpoint (`/swagger`) when running in Development mode.*

---

## 6. Deployment & Configuration

### 6.1 Requirements
*   **Runtime:** .NET 8 SDK, Node.js 18+
*   **Infrastructure:** PostgreSQL Database, Redis (Optional for caching)

### 6.2 Environment Variables
**Backend (.env / AppSettings):**
*   `Supabase:Url`, `Supabase:Key`
*   `Plaid:ClientId`, `Plaid:Secret`
*   `OpenAI:ApiKey`
*   `EmailSettings:SmtpServer` ...

**Frontend (.env):**
*   `VITE_BACKEND_API_URL`
*   `VITE_SUPABASE_URL`

---

## 7. Compliance & Standards

*   **GDPR:** Includes "Right to be Forgotten" (Account Deletion) and Data Export features.
*   **PSD2:** Plaid integration supports Open Banking standards.
*   **Accessibility:** UI designed with high-contrast text and ARIA labels.
*   **Privacy Policy:** Dedicated privacy policy page (`/privacy`) detailing data collection, usage, and user rights.
*   **Cookie Consent:** Cookie consent banner implemented to comply with ePrivacy Directive and GDPR, allowing users to accept or decline non-essential cookies.

---
*Generated by Antigravity AI Assistant*
