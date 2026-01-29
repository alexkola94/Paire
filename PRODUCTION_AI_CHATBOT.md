# Production: AI Chatbot (Stop, Fullscreen, Message Types)

This document lists what to add and where so the AI chatbot (stop button, fullscreen, message types) works in production.

---

## 1. Backend (YouAndMeExpensesAPI)

### 1.1 AiGateway configuration (production)

**Where:** `appsettings.Production.json` or **environment variables** (preferred in production).

**Already added:** An `AiGateway` section exists in `appsettings.Production.json` with placeholders.

**What to set in production:**

| Setting | Where | Description |
|--------|--------|-------------|
| `AiGateway:BaseUrl` | `appsettings.Production.json` or env `AiGateway__BaseUrl` | Public or internal URL of the AI Microservice Gateway (e.g. `https://ai-gateway.yourdomain.com`). |
| `AiGateway:TenantId` | Same | Tenant ID for this app (e.g. `thepaire`). Must match a tenant allowed by the AI Gateway. |
| `AiGateway:GatewaySecret` | Same (prefer env in production) | Secret for `X-Gateway-Secret`; must match the AI Gateway’s expected secret. |
| `AiGateway:Enabled` | Same | Set to `true` to enable AI chat; `false` to return 503 and hide AI mode. |

**Example environment variables (e.g. Render, Azure, Docker):**

```bash
AiGateway__BaseUrl=https://your-ai-gateway.example.com
AiGateway__TenantId=thepaire
AiGateway__GatewaySecret=your_production_gateway_secret
AiGateway__Enabled=true
```

**No code change for “Stop”:** The backend already passes the request `CancellationToken` from `AiGatewayController.Chat` to `AiGatewayClient.ChatAsync`. When the frontend aborts the request (stop button), ASP.NET Core cancels this token and the backend stops the call to the AI Gateway.

---

## 2. AI Microservice Gateway (deployment)

**Where:** The service that hosts `/v1/chat` (e.g. Ai-Microservise Gateway).

**What to do:**

1. **Deploy** the AI Gateway so the Expenses API can reach it (same VPC or public URL).
2. **Allow this app’s tenant:** In the Gateway config, ensure `AllowedTenantIds` (or equivalent) includes the same `TenantId` you set in the Expenses API (e.g. `thepaire`).
3. **Gateway secret:** Configure the same secret the Expenses API sends as `X-Gateway-Secret`; the Gateway must validate it.
4. **CORS (if the frontend ever calls the Gateway directly):** Usually the frontend calls only the Expenses API; the API calls the Gateway. If the frontend does call the Gateway, add your production frontend origin to CORS there.

---

## 3. Frontend (You-me-Expenses frontend)

**Where:** Build/runtime and optional env.

**What to do:**

1. **Backend URL in production:**  
   - `getBackendUrl.js` already maps `www.thepaire.org` / `thepaire.org` to `https://paire-api.onrender.com`.  
   - For another domain, either:
     - Set **`VITE_BACKEND_API_URL`** at build time to your production API URL (e.g. `https://paire-api.onrender.com`), or  
     - Adjust the hostname logic in `getBackendUrl.js` for your production domain.

2. **Build (e.g. Vercel/Netlify):**  
   Add env in the dashboard:
   ```bash
   VITE_BACKEND_API_URL=https://paire-api.onrender.com
   ```
   (Replace with your real production API URL.)

No extra code is required for stop/fullscreen/message types; they work once the API and AI Gateway are correctly configured.

---

## 4. CORS (Backend)

**Where:** `AppSettings:FrontendUrl` in production (e.g. `appsettings.Production.json` or env `AppSettings__FrontendUrl`).

**What to do:** Set to your production frontend origin(s), comma-separated, e.g.:

```json
"AppSettings": {
  "FrontendUrl": "https://www.thepaire.org,https://thepaire.org"
}
```

So the browser allows requests from your production frontend to the API.

---

## 5. Summary checklist

| # | Where | What |
|---|--------|------|
| 1 | Backend production config | Set `AiGateway:BaseUrl`, `TenantId`, `GatewaySecret`, `Enabled: true` (file or env). |
| 2 | AI Gateway deployment | Deploy Gateway; allow tenant `thepaire`; use same `GatewaySecret`. |
| 3 | Frontend build | Set `VITE_BACKEND_API_URL` to production API URL if not using thepaire.org. |
| 4 | Backend CORS | Set `AppSettings:FrontendUrl` to production frontend URL(s). |

Stop button, fullscreen, and message-type styling require no further code changes; they depend on the above configuration and the existing cancellation support in the backend.
