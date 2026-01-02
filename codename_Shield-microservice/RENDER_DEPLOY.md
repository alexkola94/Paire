# Deploying Codename_Shield to Render.com

This guide outlines the steps to deploy the `Codename_Shield-Microservice` to Render.com.

## Prerequisites

- A [Render.com](https://render.com) account.
- The project pushed to a GitHub repository.

## Step 1: Create a Web Service

1.  Log in to your Render Dashboard.
2.  Click **New +** and select **Web Service**.
3.  Connect to your GitHub repository containing `Codename_Shield-Microservice`.

## Step 2: Configure the Service

Fill in the service details as follows:

- **Name**: `codename-shield-api` (or your preferred name)
- **Region**: Choose a region close to your database (e.g., `Frankfurt` if using AWS EU West).
- **Branch**: `main` (or your deployment branch).
- **Root Directory**: Leave empty (or set to `.`) if your `Dockerfile` is in the repository root.
- **Runtime**: **Docker**.

## Step 3: Environment Variables

Under the **Environment** tab (or "Advanced" section during creation), add the following environment variables. **Do NOT commit these to GitHub**. Copy them from your local `appsettings.json` or secrets.

| Key | Value Description |
| :--- | :--- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Your Supabase connection string. *Note: Ensure you use the Transaction Mode (Port 6543) or Session Mode (Port 5432) appropriately. For Serverless, Session Mode is usually fine, but check Supabase docs.* |
| `JwtSettings__Issuer` | `Codename_Shield` |
| `JwtSettings__Audience` | `Codename_Shield_Clients` |
| `JwtSettings__Secret` | Your long secret key (same as in appsettings or a new secure one). |
| `JwtSettings__RefreshTokenValidityInDays` | `7` |

> **Note on .NET Configuration**: Render environment variables with double underscores (`__`) map to nested JSON properties in `appsettings.json`. For example, `ConnectionStrings__DefaultConnection` overrides `ConnectionStrings:DefaultConnection`.

## Step 4: Deploy

1.  Click **Create Web Service**.
2.  Render will start building your Docker image. You can watch the logs in the dashboard.
3.  Once the build finishes and the service is live, Render will provide a URL (e.g., `https://codename-shield-api.onrender.com`).

## Verification

1.  Navigate to `https://<your-service-url>/swagger` to see the Swagger UI (if enabled in Production) or try hitting the health check endpoint: `https://<your-service-url>/health`.
2.  *Note*: By default, `app.UseSwagger()` might be inside `if (app.Environment.IsDevelopment())`. If you want Swagger in Production, you need to modify `Program.cs` or set `ASPNETCORE_ENVIRONMENT` to `Development` (not recommended for true prod).

## Health Check Setup (Optional but Recommended)

In Render, you can set a **Health Check Path**.
- **Path**: `/health`
- This ensures Render only routes traffic when your app is ready.
