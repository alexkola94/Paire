# Agent Integration Instructions: Shield Auth

You are tasked with integrating the **Codename_Shield** authentication system into this application.
Follow these steps strictly.

## 1. Add Dependencies
Install the JWT Bearer package:
```powershell
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

## 2. Copy the Integration File
1.  Read the content of `ShieldAuthExtensions.cs` (provided below or in `integration_assets`).
2.  Create a new file in your project: `Extensions/ShieldAuthExtensions.cs`.
3.  Paste the content.
    *   *Note: Adjust the `namespace` to match your project if necessary.*

## 3. Update Configuration
Open `appsettings.json` and add the **JwtSettings** section.
**CRITICAL**: The `Secret` MUST match the one in `Codename_Shield`.

```json
  "JwtSettings": {
    "Issuer": "Codename_Shield",
    "Audience": "SenseiHub_Ecosystem",
    "Secret": "REPLACE_WITH_THE_REAL_SECRET_FROM_SHIELD_MICROSERVICE"
  }
```

## 4. Register Service
Open `Program.cs`.
Add the following line **before** `builder.Build()`:

```csharp
using Shield.Client.Integration; // Or your namespace

// ...
builder.Services.AddShieldAuthentication(builder.Configuration);
// ...
```

## 5. Enable Middleware
Still in `Program.cs`, ensure these middlewares are present and in this order:

```csharp
app.UseAuthentication(); // <--- Add this
app.UseAuthorization();
```

## 6. Protect Endpoints
Add `[Authorize]` attribute to any Controller or Action you want to protect.

---
**Verification**:
Run the app and try to access a protected endpoint. It should return `401 Unauthorized`.
Then, get a valid token from Shield and send it in the `Authorization: Bearer <token>` header. It should return `200 OK`.
