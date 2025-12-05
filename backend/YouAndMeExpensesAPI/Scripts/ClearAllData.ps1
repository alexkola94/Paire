# =====================================================
# PowerShell Script to Clear All Database Data
# =====================================================

Write-Host "🗑️  DATABASE CLEANUP SCRIPT" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  WARNING: This will delete ALL data from your database!" -ForegroundColor Yellow
Write-Host "⚠️  This action is IRREVERSIBLE!" -ForegroundColor Yellow
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Type 'YES' to continue"

if ($confirmation -ne "YES") {
    Write-Host "❌ Operation cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "🔄 Reading connection string from appsettings.json..." -ForegroundColor Cyan

# Read connection string from appsettings.json
$appsettingsPath = Join-Path $PSScriptRoot "..\appsettings.json"
$appsettings = Get-Content $appsettingsPath | ConvertFrom-Json
$connectionString = $appsettings.ConnectionStrings.DefaultConnection

if ([string]::IsNullOrEmpty($connectionString)) {
    Write-Host "❌ Connection string not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Connection string found" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Connecting to database and clearing all data..." -ForegroundColor Cyan

# Create SQL command
$sqlScript = @"
-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Clear all tables
TRUNCATE TABLE shopping_list_items CASCADE;
TRUNCATE TABLE shopping_lists CASCADE;
TRUNCATE TABLE loan_payments CASCADE;
TRUNCATE TABLE loans CASCADE;
TRUNCATE TABLE recurring_bills CASCADE;
TRUNCATE TABLE savings_goals CASCADE;
TRUNCATE TABLE budgets CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE reminder_preferences CASCADE;
TRUNCATE TABLE partnerships CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- Reset sequences
ALTER SEQUENCE IF EXISTS shopping_list_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS shopping_lists_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS loan_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS loans_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS recurring_bills_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS savings_goals_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS budgets_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS reminder_preferences_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS partnerships_id_seq RESTART WITH 1;

-- Re-enable triggers
SET session_replication_role = 'origin';

SELECT 'Data cleared successfully!' as status;
"@

# Parse connection string
$connParams = @{}
$connectionString -split ';' | ForEach-Object {
    if ($_ -match '(.+?)=(.+)') {
        $connParams[$matches[1].Trim()] = $matches[2].Trim()
    }
}

# Install Npgsql if not already installed
try {
    $null = Get-PackageProvider -Name NuGet -ErrorAction Stop
} catch {
    Write-Host "📦 Installing NuGet package provider..." -ForegroundColor Yellow
    Install-PackageProvider -Name NuGet -Force -Scope CurrentUser | Out-Null
}

if (-not (Get-Module -ListAvailable -Name Npgsql)) {
    Write-Host "📦 Installing Npgsql module..." -ForegroundColor Yellow
    Write-Host "⚠️  Note: This requires PowerShell with .NET support" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "❌ Npgsql module not available in PowerShell" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Please use one of these alternatives:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPTION 1: Run SQL directly in Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "  1. Go to https://supabase.com/dashboard" -ForegroundColor Gray
    Write-Host "  2. Select your project" -ForegroundColor Gray
    Write-Host "  3. Go to SQL Editor" -ForegroundColor Gray
    Write-Host "  4. Paste the SQL from Scripts\ClearAllData.sql" -ForegroundColor Gray
    Write-Host "  5. Click 'Run'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPTION 2: Use psql command line" -ForegroundColor Yellow
    Write-Host "  psql '$connectionString' -f Scripts\ClearAllData.sql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPTION 3: Use Entity Framework" -ForegroundColor Yellow
    Write-Host "  cd backend\YouAndMeExpensesAPI" -ForegroundColor Gray
    Write-Host "  dotnet ef migrations remove" -ForegroundColor Gray
    Write-Host "  dotnet ef migrations add InitialCreate" -ForegroundColor Gray
    Write-Host "  dotnet ef database update" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ All data has been cleared successfully!" -ForegroundColor Green
Write-Host "🎉 Your database is now empty and ready for fresh data!" -ForegroundColor Green

