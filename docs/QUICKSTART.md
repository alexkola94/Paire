# ⚡ Quick Start Guide

Get your expense tracking app running in **5 minutes**!

## Step 1: Install Node.js

Download and install Node.js 18+ from [nodejs.org](https://nodejs.org)

Verify installation:
```bash
node --version  # Should show v18 or higher
npm --version   # Should show 9 or higher
```

## Step 2: Get Supabase Credentials

### A. Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email

### B. Create New Project
1. Click "New Project"
2. Enter details:
   - Name: `you-me-expenses`
   - Password: (save this!)
   - Region: closest to you
3. Click "Create new project"
4. Wait ~2 minutes for setup

### C. Setup Database
1. Click **SQL Editor** (left sidebar)
2. Open `supabase/schema.sql` from this project
3. Copy **everything** from the file
4. Paste into SQL Editor
5. Click **Run** (or press `Ctrl/Cmd + Enter`)
6. Success! ✅

### D. Create Storage Bucket
1. Click **Storage** (left sidebar)
2. Click **New Bucket**
3. Name: `receipts`
4. Toggle **Public bucket** ON
5. Click **Create bucket**

### E. Get Your Keys
1. Click **Settings** > **API**
2. Copy these two values:
   - **URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJxxxxx...`

## Step 3: Setup Frontend

```bash
# Navigate to frontend folder
cd frontend

# Install packages (takes ~1 minute)
npm install

# Create environment file
# On Windows (PowerShell):
New-Item .env

# On Mac/Linux:
touch .env
```

Open `.env` and paste:
```env
VITE_SUPABASE_URL=paste_your_url_here
VITE_SUPABASE_ANON_KEY=paste_your_key_here
```

**Important:** Replace with YOUR actual values!

## Step 4: Run the App

```bash
# Still in frontend folder
npm run dev
```

The app will open automatically at `http://localhost:3000` 🎉

## Step 5: Test It Out!

1. **Sign Up**
   - Click "Sign Up"
   - Enter email and password (min 6 characters)
   - Check your email for confirmation link
   - Click the link to verify

2. **Log In**
   - Return to the app
   - Enter your email and password
   - Click "Login"

3. **Add Your First Expense**
   - Click "Expenses" in the navigation
   - Click "Add Expense"
   - Fill in the details
   - Upload a receipt (optional)
   - Click "Save"

4. **Check Dashboard**
   - Click "Dashboard"
   - See your expense appear!

## 🎉 You're Done!

Your expense tracker is ready to use!

## Next Steps

- **Add more data**: Try adding income, loans, etc.
- **Change language**: Go to Profile and switch languages
- **Customize**: Edit colors in `frontend/src/styles/index.css`
- **Deploy**: Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to put it online

## 🆘 Troubleshooting

### "Command not found: npm"
→ Node.js not installed. Go back to Step 1.

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <number> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Can't connect to Supabase
- Check your `.env` file has the correct values
- No extra spaces before or after the values
- Make sure you copied the **anon public** key, not the service key

### Email confirmation not received
- Check spam folder
- Wait a few minutes
- Try signing up again with different email

### Database error
- Make sure you ran the full `schema.sql` script
- Check Supabase dashboard > Database > Tables
- Should see `transactions` and `loans` tables

## 💡 Pro Tips

1. **Use real data**: Add your actual expenses to see real value
2. **Upload receipts**: Take photos with your phone and upload
3. **Share with partner**: Both create accounts and track together
4. **Check dashboard daily**: Stay on top of your finances
5. **Use categories**: Helps understand spending patterns

## 📱 Use on Phone

Once running:
1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.1.100)
   
   # Mac/Linux
   ifconfig
   # Look for inet (e.g., 192.168.1.100)
   ```

2. On your phone's browser, visit:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```

3. Add to home screen for app-like experience!

## 🚀 Deploy Online (Optional)

Want to use it anywhere? Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy to GitHub Pages (100% free!).

---

**Need more help?** Check [SETUP.md](./SETUP.md) for detailed instructions.

**Ready to deploy?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting instructions.

**Want to customize?** Read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

