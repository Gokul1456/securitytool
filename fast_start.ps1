# 🚀 SAIS Fast Start Script
# Kills existing processes and starts everything immediately skipping dependency checks

Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Shared Environment Variables
$Env:NODE_ENV="development"
$Env:SAIS_INTERNAL_API_KEY="internal-secret-123-very-long-key"
$Env:SAIS_SDK_API_KEYS="DEMO_API_KEY_123"
$Env:SAIS_CORE_URL="http://127.0.0.1:4001"
$Env:LOGIN_NOTIFIER_URL="http://127.0.0.1:4002"
$Env:SECURITY_TOOLS_URL="http://127.0.0.1:4003"
$Env:JWT_ACCESS_SECRET="super-secret-key-that-is-at-least-32-characters-long"
<<<<<<< HEAD
$Env:CORS_ORIGINS="*,http://localhost:3000,http://localhost:5173"
# Database URL (Adjust if your local postgres credentials differ)
$Env:DATABASE_URL="postgres://postgres:Samson@123@localhost:5432/login_notifier"

$root = "c:\security toolkit"

# 1. Start SAIS Services (Ports 4000-4003)
$saisServices = @(
    @{ name = "Gateway"; port = 4000; path = "security_notifier\sais\services\api-gateway" },
    @{ name = "Core";    port = 4001; path = "security_notifier\sais\services\sais-core" },
    @{ name = "Notifier";port = 4002; path = "security_notifier\sais\services\login-notifier" },
    @{ name = "Scanner"; port = 4003; path = "security_notifier\sais\services\security-tools" }
=======
$Env:CORS_ORIGINS="http://localhost:3000,http://localhost:5173"
# Database URL (Adjust if your local postgres credentials differ)
$Env:DATABASE_URL="postgres://postgres:Samson@123@localhost:5432/login_notifier"

$root = "c:\combined toolkit"

# 1. Start SAIS Services (Ports 4000-4003)
$saisServices = @(
    @{ name = "Gateway"; port = 4000; path = "security + notifier\sais\services\api-gateway" },
    @{ name = "Core";    port = 4001; path = "security + notifier\sais\services\sais-core" },
    @{ name = "Notifier";port = 4002; path = "security + notifier\sais\services\login-notifier" },
    @{ name = "Scanner"; port = 4003; path = "security + notifier\sais\services\security-tools" }
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
)

foreach ($s in $saisServices) {
    $Env:PORT = $s.port
    $dir = Join-Path $root $s.path
    Write-Host "Starting SAIS $($s.name) on port $($s.port)..." -ForegroundColor Cyan
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $dir -WindowStyle Hidden
}

# 2. Start Test Website Backend (Port 3000)
Write-Host "Starting Website Backend on port 3000..." -ForegroundColor Green
$webBackend = Join-Path $root "Test Website\backend"
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $webBackend -WindowStyle Hidden

# 3. Start Test Website Frontend (Port 5173) - Keep this one visible or at least output its start
Write-Host "Starting Website Frontend on port 5173..." -ForegroundColor Green
$webFrontend = Join-Path $root "Test Website\frontend"
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $webFrontend

Write-Host "`n✨ All services are launching in the background!" -ForegroundColor Magenta
Write-Host "--------------------------------------------------"
Write-Host "Frontend UI:  http://localhost:5173"
Write-Host "Backend API:  http://localhost:3000"
Write-Host "SAIS Gateway: http://localhost:4000 (Health: /health)"
Write-Host "--------------------------------------------------"
<<<<<<< HEAD
Write-Host "Check 'c:\security toolkit\last_email.html' for security alerts."
=======
Write-Host "Check 'c:\combined toolkit\last_email.html' for security alerts."
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
