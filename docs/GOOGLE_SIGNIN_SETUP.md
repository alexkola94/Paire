# Sign in with Google – Setup Guide

This guide walks you through configuring **Sign in with Google** for Paire in development and production.

## Overview

- **Frontend:** Google Identity Services (GIS) loads from `https://accounts.google.com/gsi/client`. The Login page shows a "Sign in with Google" button when `VITE_GOOGLE_CLIENT_ID` is set.
- **Backend:** Validates the Google ID token, finds or creates the user, and returns the same JWT/refresh token shape as email login. Config key: `Google:ClientId` (must match the frontend client ID).

---

## Step 1: Create a Google OAuth 2.0 Client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. "Paire").
3. Go to **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the **OAuth consent screen**:
   - User type: **External** (for real users) or **Internal** (for workspace-only).
   - App name: **Paire**, support email, developer contact.
   - Scopes: add `email`, `profile`, `openid` (usually added by default for sign-in).
   - Save.
6. Application type: **Web application**.
7. Name: e.g. **Paire Web**.
8. **Authorized JavaScript origins** (required for GIS):
   - **Dev:** `http://localhost:5173`, `http://localhost:3000`, and any other dev URLs you use (e.g. `http://192.168.x.x:5173`).
   - **Prod:** `https://www.thepaire.org`, `https://thepaire.org` (and any other prod origins).
9. **Authorized redirect URIs:** Leave empty for the one-tap/button flow (we don’t use a redirect URI for the ID token flow).
10. Click **Create**. Copy the **Client ID** (and optionally Client Secret; not required for ID token validation in this setup).

You can create two OAuth clients (one for dev, one for prod) or use one client with both dev and prod origins listed.

---

## Step 2: Development Environment

### Backend

1. In the backend project, set the Google Client ID (same value the frontend will use):
   - **Option A – appsettings.Development.json** (do not commit secrets):
     ```json
     {
       "Google": {
         "ClientId": "YOUR_DEV_CLIENT_ID.apps.googleusercontent.com",
         "ClientSecret": ""
       }
     }
     ```
   - **Option B – User Secrets:**
     ```bash
     cd backend/YouAndMeExpensesAPI
     dotnet user-secrets set "Google:ClientId" "YOUR_DEV_CLIENT_ID.apps.googleusercontent.com"
     ```
2. Restart the API. The `/api/auth/google` endpoint will use this client ID to validate ID tokens.

### Frontend

1. In the frontend project root, create or edit `.env` (or `.env.local`; do not commit if it contains secrets):
   ```env
   VITE_GOOGLE_CLIENT_ID=YOUR_DEV_CLIENT_ID.apps.googleusercontent.com
   ```
2. Restart the dev server (`npm run dev` or `vite`). The Login page will show "Sign in with Google" when this variable is set.
3. Ensure the URL you open in the browser (e.g. `http://localhost:5173`) is listed in the OAuth client’s **Authorized JavaScript origins**.

### Verify in Dev

1. Open the app at `http://localhost:5173/login` (or your dev URL).
2. You should see the "or" divider and "Sign in with Google" below the main login button.
3. Click it, sign in with a Google account, and confirm you are logged in and redirected (e.g. to the dashboard).

---

## Step 3: Production Environment

### Backend (e.g. Render, Azure, or your host)

1. Set the **same** Google Client ID as in the frontend (prod OAuth client or the one that includes prod origins):
   - **Render:** Environment variables in the service dashboard:
     - `Google__ClientId` = `YOUR_PROD_CLIENT_ID.apps.googleusercontent.com`
   - **Azure / App Service:** Application settings:
     - `Google:ClientId` = `YOUR_PROD_CLIENT_ID.apps.googleusercontent.com`
   - **Generic:** Ensure the config key `Google:ClientId` is set (environment variable or appsettings.Production.json, without committing secrets).
2. Redeploy or restart the backend so the new config is loaded.

### Frontend (e.g. Vite build, GitHub Pages, or your host)

1. Set the Google Client ID for the build/runtime so the built app has the correct client ID:
   - **Build-time (Vite):** Set `VITE_GOOGLE_CLIENT_ID` in the CI/build environment (e.g. GitHub Actions secrets, Render env, etc.) so that `import.meta.env.VITE_GOOGLE_CLIENT_ID` is set in the bundle.
   - **Example (GitHub Actions):**
     ```yaml
     env:
       VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
     ```
2. Ensure the production origin (e.g. `https://www.thepaire.org`) is in the OAuth client’s **Authorized JavaScript origins** in Google Cloud Console.

### Verify in Production

1. Open the production login page (e.g. `https://www.thepaire.org/login`).
2. Confirm "Sign in with Google" appears and that signing in completes and redirects correctly.
3. Check browser dev tools for 400/500 from `/api/auth/google` if something fails; backend logs will show validation or config errors.

---

## Step 4: Optional – Separate Dev and Prod Clients

- Create two OAuth clients in Google Cloud Console:
  - **Paire (Dev):** origins `http://localhost:5173`, etc.
  - **Paire (Prod):** origins `https://www.thepaire.org`, `https://thepaire.org`.
- Use the Dev Client ID in dev backend + frontend and the Prod Client ID in prod backend + frontend. This keeps dev and prod credentials separate.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| "Sign in with Google" button not visible | `VITE_GOOGLE_CLIENT_ID` must be set and the frontend dev server restarted. |
| "Google sign-in is not configured" (5xx) | Backend `Google:ClientId` is missing or wrong. Check appsettings, user secrets, or env vars. |
| "Invalid Google sign-in" (400) | Token validation failed. Ensure backend Client ID matches the one used by the frontend and that the token is from the same OAuth client. |
| Popup blocked or redirect errors | Add your exact dev/prod origins to **Authorized JavaScript origins** in the OAuth client. |
| "This email is already registered. Please sign in with your password." | The user already has an account with that email (email/password). They must use the password login for that account; we do not auto-link Google to existing password accounts. |

---

## Security Notes

- **Client ID** is public (frontend and config); do not rely on it for secret data.
- **Client Secret** is optional for the ID-token-only flow used here; the backend validates the token with Google using the Client ID.
- Keep **appsettings** and **.env** with real client IDs out of version control; use `.env.example` and `appsettings.Example.json` with placeholders only.
