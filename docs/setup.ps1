# ====================================
# You & Me Expenses - Automated Setup Script
# ====================================
# PowerShell setup script for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "You & Me Expenses - Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found! Please install from nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting up Frontend..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend
cd frontend

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

# Check if .env exists
Write-Host ""
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
# Supabase Configuration
# Get these from: https://app.supabase.com/project/_/settings/api

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Optional: Backend API URL (only needed if using .NET backend)
# VITE_API_URL=http://localhost:5000/api
"@ | Out-File -FilePath .env -Encoding UTF8
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Edit frontend/.env and add your Supabase credentials!" -ForegroundColor Red
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Edit frontend/.env with your Supabase credentials"
Write-Host "2. Setup Supabase database (see SUPABASE_SETUP.md)"
Write-Host "3. Run: cd frontend && npm run dev"
Write-Host ""

# Offer to open .env file
$openEnv = Read-Host "Open .env file now? (Y/N)"
if ($openEnv -eq "Y" -or $openEnv -eq "y") {
    if (Get-Command code -ErrorAction SilentlyContinue) {
        code .env
    } else {
        notepad .env
    }
}

Write-Host ""
Write-Host "Ready to start development!" -ForegroundColor Green

