# SAIS Full Stack Optimizer & Status Report

# 1. Kill Node on ports 
$ports = @(3000, 4000, 4001, 4002, 4003, 5173)
Write-Host "Reclaiming system ports: $ports" -ForegroundColor Cyan
foreach ($p in $ports) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
        if ($conn) {
            $pidToKill = $conn.OwningProcess | Select-Object -First 1
            if ($pidToKill) {
                Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
                Write-Host "  - Killed process $pidToKill on port $p"
            }
        }
    } catch {
        # ignore errors
    }
}

# 2. Re-Install if missing
Write-Host "`nVerifying service dependencies..." -ForegroundColor Cyan
$services = @(
    "security_notifier\sais\services\api-gateway",
    "security_notifier\sais\services\sais-core",
    "security_notifier\sais\services\login-notifier",
    "security_notifier\sais\services\security-tools",
    "security_notifier\sais\services\shared",
    "Test Website\backend",
    "Test Website\frontend"
)

foreach ($s in $services) {
    $fullPath = "c:\security toolkit\$s"
    if (Test-Path "$fullPath\node_modules") {
        Write-Host "  - $s (ready)" -ForegroundColor Green
    } else {
        Write-Host "Installing dependencies for $s..." -ForegroundColor Yellow
        Set-Location $fullPath
        npm install --quiet
    }
}

# 3. Start SAIS Services
Write-Host "`nStarting SAIS Microservices..." -ForegroundColor Cyan
Set-Location "c:\security toolkit"
.\start_sais_local.ps1 | Out-Null
Write-Host "  - Services (4000-4003) initiated." -ForegroundColor Green

# 4. Start Website Backend
Write-Host "Starting Website Backend (3000)..." -ForegroundColor Cyan
Set-Location "c:\security toolkit\Test Website\backend"
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow

# 5. Start Website Frontend
Write-Host "Starting Website Frontend (5173)..." -ForegroundColor Cyan
Set-Location "c:\security toolkit\Test Website\frontend"
Start-Process -FilePath "npm.cmd" -ArgumentList "run dev" -NoNewWindow

# 6. Final Status Check
Write-Host "`nFinal System Status Check (Wait for ports to bind)..." -ForegroundColor White
Start-Sleep 5

$report = @()
$targets = @{ "Gateway"=4000; "Core"=4001; "Notifier"=4002; "Scanner"=4003; "Backend"=3000; "FE"=5173 }

foreach ($key in $targets.Keys) {
    $port = $targets[$key]
    $tcp = New-Object System.Net.Sockets.TcpClient
    $isUp = $false
    try {
        $task = $tcp.BeginConnect("localhost", $port, $null, $null)
        if ($task.AsyncWaitHandle.WaitOne(400)) { # 400ms timeout
            $tcp.EndConnect($task)
            $isUp = $true
        }
    } catch {}
    if ($tcp.Connected) { $tcp.Close() }
    
    $report += [PSCustomObject]@{
        Service = $key
        Port     = $port
        Online  = $isUp
    }
}

$report | Format-Table -AutoSize
Write-Host "`nSystem health check complete." -ForegroundColor Green
