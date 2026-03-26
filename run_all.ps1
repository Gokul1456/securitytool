# 🚀 Integrated SAIS Launch Script
# Starts everything in ONE go without killing each other halfway through.

Write-Host "Killing existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

$root = "c:\security toolkit"

# Global Env Vars
$Env:NODE_ENV="development"
$Env:DATABASE_URL="postgres://postgres:Samson@123@localhost:5432/login_notifier"
$Env:SAIS_INTERNAL_API_KEY="internal-secret-123-very-long-key"
$Env:SAIS_SDK_API_KEYS="DEMO_API_KEY_123"
$Env:SAIS_CORE_URL="http://127.0.0.1:4001"
$Env:LOGIN_NOTIFIER_URL="http://127.0.0.1:4002"
$Env:SECURITY_TOOLS_URL="http://127.0.0.1:4003"
$Env:JWT_ACCESS_SECRET="super-secret-key-that-is-at-least-32-characters-long"
$Env:CORS_ORIGINS="*,http://localhost:3000,http://localhost:5173"

# 1. Start SAIS Services (Ports 4000-4003)
$saisServices = @(
    "api-gateway", "sais-core", "login-notifier", "security-tools"
)

foreach ($s in $saisServices) {
    $dir = Join-Path $root "security_notifier\sais\services\$s"
    # Ensure node_modules exists
    if (-not (Test-Path (Join-Path $dir "node_modules"))) {
        Write-Host "Installing dependencies for $s (first run only)..." -ForegroundColor Magenta
        Set-Location $dir
        npm install --quiet
    }
    Write-Host "Starting $s..." -ForegroundColor Cyan
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $dir -NoNewWindow
}

# 2. Start Test Website (Port 3000 & 5173)
$webBackend = Join-Path $root "Test Website\backend"
$webFrontend = Join-Path $root "Test Website\frontend"

if (-not (Test-Path (Join-Path $webBackend "node_modules"))) {
    Write-Host "Installing backend deps..." -ForegroundColor Magenta
    Set-Location $webBackend
    npm install --quiet
}
Write-Host "Starting Website Backend..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $webBackend -NoNewWindow

if (-not (Test-Path (Join-Path $webFrontend "node_modules"))) {
    Write-Host "Installing frontend deps..." -ForegroundColor Magenta
    Set-Location $webFrontend
    npm install --quiet
}
Write-Host "Starting Website Frontend..." -ForegroundColor Green
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $webFrontend

Write-Host "`n🚀 ALL SERVICES LAUNCHED!" -ForegroundColor BrightWhite
Write-Host "----------------------------------------------------"
Write-Host "Frontend UI:  http://localhost:5173"
Write-Host "Backend API:  http://localhost:3000"
Write-Host "SAIS Gateway: http://localhost:4000"
Write-Host "----------------------------------------------------"
