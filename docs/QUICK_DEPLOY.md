# 🚀 Quick Deploy Commands

## Prerequisites
1. Update these values in your files:
   - `frontend/vite.config.js`: Replace `'/Paire/'` with your repo name
   - `frontend/package.json`: Replace `alexkola94` with your GitHub username
   - `frontend/public/404.html`: Replace `/Paire` with your repo name
   - `frontend/src/App.jsx`: Replace `"/Paire"` in basename with your repo name

## Frontend Deployment (GitHub Pages)

### First Time Setup
```bash
cd frontend
npm install gh-pages --save-dev
```

### Deploy Frontend
```bash
cd frontend
npm run deploy
```

### Enable GitHub Pages
1. Go to your GitHub repository
2. Settings → Pages
3. Source: `gh-pages` branch, `/ (root)` folder
4. Save

Your site will be at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

---

## Backend Deployment (Render.com)

### First Time Setup
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure (see full guide for details)
6. Deploy

### Update Backend
Just push to `main` branch:
```bash
git add .
git commit -m "Update backend"
git push origin main
```

Render auto-deploys on every push to main!

---

## Environment Variables to Set in Render

After deployment, add these in Render Dashboard → Environment:

```
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=<your-database-connection>
JwtSettings__Secret=<your-jwt-secret>
JwtSettings__Issuer=PaireAPI
JwtSettings__Audience=PaireApp
JwtSettings__ExpirationMinutes=60
JwtSettings__RefreshTokenExpirationDays=7
EmailSettings__SmtpServer=smtp.gmail.com
EmailSettings__SmtpPort=587
EmailSettings__SenderEmail=<your-email>
EmailSettings__SenderName=Paire
EmailSettings__Username=<your-email>
EmailSettings__Password=<your-app-password>
EmailSettings__EnableSsl=true
CORS_ORIGINS=https://YOUR_USERNAME.github.io
AppSettings__FrontendUrl=https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
```

---

## Post-Deployment Checklist

### After Backend Deploys
- [ ] Copy your Render.com API URL (e.g., `https://youme-expenses-api.onrender.com`)
- [ ] Create `frontend/.env.production` with:
  ```
  VITE_BACKEND_API_URL=https://your-render-url.onrender.com
  ```
- [ ] Redeploy frontend: `cd frontend && npm run deploy`

### After Frontend Deploys
- [ ] Copy your GitHub Pages URL
- [ ] Update `CORS_ORIGINS` in Render environment variables
- [ ] Update `AppSettings__FrontendUrl` in Render environment variables
- [ ] Render will auto-redeploy

### Test
- [ ] Visit your frontend URL
- [ ] Try to register/login
- [ ] Check browser console for errors
- [ ] Test API connection

---

## Common Issues

### CORS Error
**Fix:** Update `CORS_ORIGINS` in Render to your GitHub Pages domain (without path)
```
https://username.github.io
```

### API Returns 404
**Fix:** Check Render logs, verify environment variables are set

### Frontend White Screen
**Fix:** 
1. Check browser console
2. Verify `base` in `vite.config.js` matches repo name
3. Verify `.env.production` has correct API URL

### Routes Return 404 on Refresh
**Fix:** Verify `404.html` exists in `frontend/public/` and has correct repo name

---

## Need More Help?

See the full **DEPLOYMENT_GUIDE.md** for detailed instructions!

