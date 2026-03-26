<# Automatic Port Cleanup #>
Write-Host "Reclaiming system ports..."
Stop-Process -Name node -ErrorAction SilentlyContinue
Stop-Process -Name npm -ErrorAction SilentlyContinue
Start-Sleep 2 # Wait for ports to release

$Env:NODE_ENV="development";
$Env:DATABASE_URL="postgres://postgres:Samson@123@localhost:5432/login_notifier";
$Env:SAIS_INTERNAL_API_KEY="internal-secret-123-very-long-key";
$Env:SAIS_SDK_API_KEYS="DEMO_API_KEY_123";
$Env:SAIS_CORE_URL="http://127.0.0.1:4001";
$Env:LOGIN_NOTIFIER_URL="http://127.0.0.1:4002";
$Env:SECURITY_TOOLS_URL="http://127.0.0.1:4003";
$Env:JWT_ACCESS_SECRET="super-secret-key-that-is-at-least-32-characters-long";
$Env:CORS_ORIGINS="*,http://localhost:3000,http://localhost:5173";
$Env:PORT=4000;

Set-Location 'E:\security\security-toolkit-app\security_notifier\sais\services\api-gateway'
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru

$Env:PORT=4001;
Set-Location 'E:\security\security-toolkit-app\security_notifier\sais\services\sais-core'
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru

$Env:PORT=4002;
Set-Location 'E:\security\security-toolkit-app\security_notifier\sais\services\login-notifier'
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru

$Env:PORT=4003;
Set-Location 'E:\security\security-toolkit-app\security_notifier\sais\services\security-tools'
Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru

Write-Host "Services started locally."
