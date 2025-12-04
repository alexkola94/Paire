# ====================================
# Supabase Setup Script (PowerShell)
# ====================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Database Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking Supabase CLI..." -ForegroundColor Yellow
if (Get-Command supabase -ErrorAction SilentlyContinue) {
    $supabaseVersion = supabase --version
    Write-Host "✓ Supabase CLI installed: $supabaseVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Supabase CLI:" -ForegroundColor Yellow
    Write-Host "Option 1: npm install -g supabase"
    Write-Host "Option 2: scoop install supabase"
    Write-Host ""
    $install = Read-Host "Install via npm now? (Y/N)"
    if ($install -eq "Y" -or $install -eq "y") {
        Write-Host "Installing Supabase CLI..." -ForegroundColor Yellow
        npm install -g supabase
        Write-Host "✓ Supabase CLI installed" -ForegroundColor Green
    } else {
        Write-Host "Please install Supabase CLI and run this script again" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Options" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Link to existing Supabase project"
Write-Host "2. Create new Supabase project"
Write-Host "3. Setup manually (opens documentation)"
Write-Host ""

$choice = Read-Host "Choose option (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Linking to existing project..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Get your project ref from: https://app.supabase.com"
        Write-Host "Settings > General > Reference ID"
        Write-Host ""
        $projectRef = Read-Host "Enter project ref"
        
        if ($projectRef) {
            Write-Host ""
            Write-Host "Logging in to Supabase..." -ForegroundColor Yellow
            supabase login
            
            Write-Host "Linking project..." -ForegroundColor Yellow
            supabase link --project-ref $projectRef
            
            Write-Host ""
            Write-Host "Pushing migrations..." -ForegroundColor Yellow
            supabase db push
            
            Write-Host ""
            Write-Host "Creating storage bucket..." -ForegroundColor Yellow
            supabase storage create receipts --public
            
            Write-Host ""
            Write-Host "✓ Setup complete!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Get your credentials:"
            Write-Host "supabase projects api-keys"
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Creating new project..." -ForegroundColor Yellow
        Write-Host ""
        $projectName = Read-Host "Enter project name (e.g., you-me-expenses)"
        
        if ($projectName) {
            Write-Host ""
            Write-Host "Logging in to Supabase..." -ForegroundColor Yellow
            supabase login
            
            Write-Host "Creating project..." -ForegroundColor Yellow
            supabase projects create $projectName
            
            Write-Host ""
            Write-Host "Note the project ref from above output"
            $projectRef = Read-Host "Enter the project ref"
            
            if ($projectRef) {
                Write-Host "Linking project..." -ForegroundColor Yellow
                supabase link --project-ref $projectRef
                
                Write-Host "Pushing migrations..." -ForegroundColor Yellow
                supabase db push
                
                Write-Host "Creating storage bucket..." -ForegroundColor Yellow
                supabase storage create receipts --public
                
                Write-Host ""
                Write-Host "✓ Setup complete!" -ForegroundColor Green
            }
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Opening documentation..." -ForegroundColor Yellow
        if (Get-Command code -ErrorAction SilentlyContinue) {
            code SUPABASE_SETUP.md
        } else {
            notepad SUPABASE_SETUP.md
        }
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Get your API credentials:"
Write-Host "   supabase projects api-keys"
Write-Host ""
Write-Host "2. Update frontend/.env with:"
Write-Host "   - VITE_SUPABASE_URL"
Write-Host "   - VITE_SUPABASE_ANON_KEY"
Write-Host ""
Write-Host "3. Start the app:"
Write-Host "   cd frontend"
Write-Host "   npm run dev"
Write-Host ""

