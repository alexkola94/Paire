# 📝 Create .env File

## Quick Setup

### **Step 1: Create the .env file**

**Windows (PowerShell):**
```powershell
cd frontend
New-Item -Path .env -ItemType File -Force
```

**Mac/Linux:**
```bash
cd frontend
touch .env
```

### **Step 2: Add your Supabase credentials**

Open `frontend/.env` in your editor and paste:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### **Step 3: Get your credentials**

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project (or create one)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → paste into `VITE_SUPABASE_URL`
   - **anon public key** → paste into `VITE_SUPABASE_ANON_KEY`

### **Step 4: Example**

Your `.env` file should look like this:

```env
VITE_SUPABASE_URL=https://abcdefghij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzOTU4OTgwMCwiZXhwIjoxOTU1MTY1ODAwfQ.1234567890abcdef
```

### **Step 5: Restart dev server**

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

## ⚠️ Important Notes

- **NEVER commit .env file to git** (it's already in .gitignore)
- **Use "anon public" key** (not "service_role" key) in frontend
- **Keep .env file local** - each developer needs their own
- **Restart server** after changing .env values

---

## 🔒 Security

✅ **Safe for frontend:**
- `VITE_SUPABASE_URL` - Public URL
- `VITE_SUPABASE_ANON_KEY` - Public key with RLS restrictions

❌ **Never use in frontend:**
- `service_role` key - Has full database access
- Database password - Server-side only

---

## 🆘 Troubleshooting

### Can't create .env file?
```powershell
# Force create
cd frontend
"VITE_SUPABASE_URL=`nVITE_SUPABASE_ANON_KEY=" | Out-File -FilePath .env -Encoding UTF8
```

### Variables not working?
- Check file is named exactly `.env` (not `.env.txt`)
- Variables must start with `VITE_`
- Restart dev server after changes
- Check for typos in variable names

### Still not working?
```bash
# Check if .env exists
ls -la .env  # Mac/Linux
dir .env     # Windows

# Verify contents
cat .env     # Mac/Linux
type .env    # Windows
```

---

## ✅ Verification

Once setup, verify it works:

```javascript
// Check in browser console (http://localhost:3000)
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
// Should show: https://your-project.supabase.co

// Should NOT see undefined
```

---

**Done!** Your `.env` file is ready. Run `npm run dev` to start the app.

