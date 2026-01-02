# Setup Guide: Codename_Shield.API

Follow these steps to get the microservice running locally.

## Prerequisites
*   [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
*   [PostgreSQL](https://www.postgresql.org/) database (or **Supabase** project).

## 1. Configure Database (Supabase)
1.  Navigate to `Codename_Shield.API/appsettings.json`.
2.  Update the `ConnectionStrings:DefaultConnection` with your actual Supabase connection string.
    ```json
    "ConnectionStrings": {
      "DefaultConnection": "User Id=postgres.[your-id];Password=[your-password];Server=aws-0-[region].pooler.supabase.com;Port=5432;Database=postgres;..."
    }
    ```
3.  Update the `JwtSettings:Secret` with a strong, random string (at least 32 characters).

## 2. Apply Migrations
Open a terminal in the `Codename_Shield.API` folder and run:
```powershell
dotnet ef database update
```
This will create the necessary tables (`AspNetUsers`, `AspNetRoles`, etc.) in your database.

## 3. Run the Application
Run the API project:
```powershell
dotnet run
```
The application will start on `http://localhost:5002`.

## 4. Verify & Test
*   **Swagger UI**: Open `http://localhost:5002/swagger` (or just `http://localhost:5002/`) to explore and test the endpoints.
*   **Health Check**: Visit `http://localhost:5002/health` to confirm database connectivity (Returns `Healthy`).

## Troubleshooting
*   **404 on Root**: The root URL (`/`) redirects to `/swagger`. If it doesn't, manually go to `/swagger`.
*   **Database Connection Error**: Double-check your `ConnectionString`. Ensure Supabase is reachable (check firewall/network).
*   **Build Errors**: Ensure you have the latest .NET 9 SDK installed.
