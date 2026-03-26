# 🚀 Clean Up Once
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process npm -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Reinstalling dependencies for all services..." -ForegroundColor Cyan
$services = "api-gateway", "sais-core", "login-notifier", "security-tools", "shared\shared"
foreach ($s in $services) {
<<<<<<< HEAD
    $dir = "c:\security toolkit\security_notifier\sais\services\$s"
    if ($s.StartsWith("shared")) { $dir = "c:\security toolkit\security_notifier\sais\shared\shared" }
    Set-Location $dir
=======
    $dir = "c:\combined toolkit\security + notifier\sais\services\$s"
    if ($s.StartsWith("shared")) { $dir = "c:\combined toolkit\security + notifier\sais\shared\shared" }
    cd $dir
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
    npm install --quiet
}

# Start SAIS
<<<<<<< HEAD
Set-Location "c:\security toolkit"
=======
cd "c:\combined toolkit"
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
.\start_sais_local.ps1

# Start Website (WITHOUT KILLS)
Write-Host "Starting Website Backend..." -ForegroundColor Green
<<<<<<< HEAD
Set-Location "c:\security toolkit\Test Website\backend"
=======
Set-Location "c:\combined toolkit\Test Website\backend"
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
npm install --quiet
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow

Write-Host "Starting Website Frontend..." -ForegroundColor Green
<<<<<<< HEAD
Set-Location "c:\security toolkit\Test Website\frontend"
=======
Set-Location "c:\combined toolkit\Test Website\frontend"
>>>>>>> 33d40d2c93365326e4ff00622451dbf8e6fda5d4
npm install --quiet
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow

Write-Host "`n🚀 PROJECT REPAIRED AND RUNNING FAST!" -ForegroundColor BrightWhite
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:3000"
Write-Host "Gateway:  http://localhost:4000"

