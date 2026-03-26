# 🚀 Clean Up Once
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Reinstalling dependencies for all services..." -ForegroundColor Cyan
$services = "api-gateway", "sais-core", "login-notifier", "security-tools", "shared\shared"
foreach ($s in $services) {
    $dir = "E:\security\security-toolkit-app\security_notifier\sais\services\$s"
    if ($s.StartsWith("shared")) { $dir = "E:\security\security-toolkit-app\security_notifier\sais\shared\shared" }
    Set-Location $dir
    npm install --quiet
}

# Start SAIS
Set-Location "E:\security\security-toolkit-app"
.\start_sais_local.ps1

# Start Website (WITHOUT KILLS)
Write-Host "Starting Website Backend..." -ForegroundColor Green
Set-Location "E:\security\security-toolkit-app\Test Website\backend"
npm install --quiet
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow

Write-Host "Starting Website Frontend..." -ForegroundColor Green
Set-Location "E:\security\security-toolkit-app\Test Website\frontend"
npm install --quiet
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow

Write-Host "`n🚀 PROJECT REPAIRED AND RUNNING FAST!" -ForegroundColor BrightWhite
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:3000"
Write-Host "Gateway:  http://localhost:4000"

