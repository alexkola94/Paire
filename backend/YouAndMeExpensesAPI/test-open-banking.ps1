# Open Banking Integration Test Script
# This script tests the Enable Banking integration endpoints (New Flow)

# Configuration
$baseUrl = "http://localhost:5038"
$token = Read-Host "Enter your JWT token (or press Enter to skip authenticated tests)"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Open Banking Integration Tests (v2)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "=== Test 1: Health Check ===" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "[OK] API is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] API is not responding: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure the backend is running: dotnet run" -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($token)) {
    Write-Host ""
    Write-Host "[WARNING] No JWT token provided. Skipping authenticated tests." -ForegroundColor Yellow
    exit 0
}

# Test 2: Get Available Banks (ASPSPs)
Write-Host ""
Write-Host "=== Test 2: Get Available Banks (ASPSPs) ===" -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/open-banking/aspsps?country=FI" -Method GET -Headers $headers
    
    if ($response.aspsps.Count -gt 0) {
        Write-Host "[OK] Success! Found $($response.aspsps.Count) banks" -ForegroundColor Green
        # Show first 3
        $response.aspsps | Select-Object -First 3 | ForEach-Object {
            Write-Host "   Bank: $($_.name) ($($_.country))" -ForegroundColor Gray
        }
    } else {
        Write-Host "[WARNING] No banks found for country FI" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Start Authorization (Mock)
Write-Host ""
Write-Host "=== Test 3: Start Authorization (Simulation) ===" -ForegroundColor Yellow
Write-Host "Skipping actual auth start as it requires valid bank selection." -ForegroundColor Gray
Write-Host "To test manually:" -ForegroundColor Gray
Write-Host "POST /api/open-banking/login" -ForegroundColor Gray
Write-Host "Body: { 'bankName': 'Nordea', 'country': 'FI' }" -ForegroundColor Gray
Write-Host ""

# Test 4: Get Connected Accounts
Write-Host "=== Test 4: Get Connected Accounts ===" -ForegroundColor Yellow
try {
    $headers = @{ "Authorization" = "Bearer $token" }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/open-banking/accounts" -Method GET -Headers $headers
    
    if ($response.accounts.Count -gt 0) {
        Write-Host "[OK] Success! Found $($response.accounts.Count) connected account(s)" -ForegroundColor Green
        $response.accounts | ForEach-Object {
            Write-Host "   Account: $($_.accountName) - $($_.currentBalance) $($_.currency)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "[INFO] No accounts found (expected if no bank connected yet)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
