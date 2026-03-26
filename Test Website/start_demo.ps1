<# SAIS Demo Start Script (Windows-friendly)
   - Ensures npm is invoked correctly via npm.cmd
   - Starts backend and frontend in separate console windows
   - Keeps this script non-blocking for a smooth DX
#>

$backendDir = "E:\security\security-toolkit-app\Test Website\backend"
$frontendDir = "E:\security\security-toolkit-app\Test Website\frontend"

<# Reclaim ports to prevent EADDRINUSE #>
Write-Host "Purging existing services for a fresh start..."
Stop-Process -Name node -ErrorAction SilentlyContinue 
Stop-Process -Name npm -ErrorAction SilentlyContinue
Start-Sleep 2 # Wait for ports to release

Write-Host "Installing Backend Dependencies..."
Set-Location $backendDir
npm install

Write-Host "Starting Backend Service..."
Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $backendDir

Write-Host "Installing Frontend Dependencies..."
Set-Location $frontendDir
npm install

Write-Host "Starting Frontend Service..."
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $frontendDir

Write-Host ""
Write-Host "SAIS Demo is starting..."
Write-Host "Backend API: http://localhost:3000"
Write-Host "Frontend UI: http://localhost:5173"
