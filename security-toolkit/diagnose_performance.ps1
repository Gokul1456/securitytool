# 🕵️ SAIS Setup Performance Diagnostic

Write-Host "--- PERFORMANCE DIAGNOSTIC ---" -ForegroundColor Yellow

$results = @()

# Dependency Check
$results += [PSCustomObject]@{ Task="Port Check (6 ports)"; TimeMs=(Measure-Command { 3000, 4000, 4001, 4002, 4003, 5173 | ForEach-Object { Test-NetConnection localhost -Port $_ -WarningAction SilentlyContinue } }).TotalMilliseconds }

# Node Mod Check
$results += [PSCustomObject]@{ Task="Node_Modules Health Check"; TimeMs=(Measure-Command { Get-ChildItem "c:\security toolkit" -Filter "node_modules" -Recurse }).TotalMilliseconds }

# Docker State
$results += [PSCustomObject]@{ Task="Docker Engine Ping"; TimeMs=(Measure-Command { docker version | Out-Null }).TotalMilliseconds }

# Service HTTP Health Ping
$results += [PSCustomObject]@{ Task="Service Health Latency (4000)"; TimeMs=(Measure-Command { curl.exe -s --connect-timeout 2 http://localhost:4000/health | Out-Null }).TotalMilliseconds }

Write-Host "`nDiagnostic Results:"
$results | Format-Table -AutoSize

# Check for Large/Hidden Directories causing walk slowness
$largeDirs = @()
Get-ChildItem -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    if ($size -gt 100MB) {
        $largeDirs += [PSCustomObject]@{ Name=$_.Name; SizeGB=[math]::round($size/1GB, 2) }
    }
}
Write-Host "`nHeavy Directories (>100MB):"
$largeDirs | Format-Table -AutoSize
