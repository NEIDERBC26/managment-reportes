#requires -RunAsAdministrator
[CmdletBinding()]
param(
  [string]$InstallRoot = 'C:\ProgramData\ReportManager',
  [string]$PublicHost = $env:COMPUTERNAME,
  [string]$InitialAdminEmail = 'admin@reportes.local',
  [string]$OwnerPrincipal = "$env:USERDOMAIN\$env:USERNAME"
)

$ErrorActionPreference = 'Stop'
$sourceApp = Join-Path $PSScriptRoot 'nextjs_space'
$appRoot = Join-Path $InstallRoot 'app'
$runtimeRoot = Join-Path $InstallRoot 'runtime\node'
$dataRoot = Join-Path $InstallRoot 'data'
$logRoot = Join-Path $InstallRoot 'logs'
$binRoot = Join-Path $InstallRoot 'bin'
$nodePackageRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\OpenJS.NodeJS.22_Microsoft.Winget.Source_8wekyb3d8bbwe'

function Invoke-Checked {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Falló: $File $($Arguments -join ' ')" }
}

function New-RandomAlphaNumeric {
  param([int]$Length)
  $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  $bytes = New-Object byte[] ($Length)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
}

function New-RandomHex {
  param([int]$Bytes)
  $buffer = New-Object byte[] ($Bytes)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  ([Convert]::ToHexString($buffer)).ToLowerInvariant()
}

if (-not (Test-Path -LiteralPath $sourceApp)) {
  throw "No se encontró la aplicación fuente en $sourceApp"
}
if (-not (Test-Path -LiteralPath (Join-Path $sourceApp 'package-lock.json'))) {
  throw 'Falta package-lock.json. Ejecute primero la preparación de dependencias.'
}

$nodeSource = Get-ChildItem -LiteralPath $nodePackageRoot -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $nodeSource) {
  Invoke-Checked 'winget.exe' @('install', '--id', 'OpenJS.NodeJS.22', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements')
  $nodeSource = Get-ChildItem -LiteralPath $nodePackageRoot -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $nodeSource) { throw 'No fue posible localizar Node.js 22.' }

New-Item -ItemType Directory -Force -Path $InstallRoot, $appRoot, $runtimeRoot, $dataRoot, $logRoot, $binRoot | Out-Null
& robocopy.exe $sourceApp $appRoot /E /XD node_modules .next data /XF .env .env.local | Out-Null
if ($LASTEXITCODE -gt 7) { throw "Robocopy falló con código $LASTEXITCODE" }

$nodeSourceRoot = Split-Path -Parent $nodeSource.FullName
& robocopy.exe $nodeSourceRoot $runtimeRoot /E | Out-Null
if ($LASTEXITCODE -gt 7) { throw "No fue posible copiar Node.js (código $LASTEXITCODE)" }

$node = Join-Path $runtimeRoot 'node.exe'
$npm = Join-Path $runtimeRoot 'npm.cmd'
$npx = Join-Path $runtimeRoot 'npx.cmd'
$env:Path = "$runtimeRoot;$env:Path"

$dbFile = (Join-Path $dataRoot 'report-manager.db').Replace('\', '/')
$databaseUrl = "file:$dbFile"
$nextAuthSecret = New-RandomHex 32
$encryptionKey = New-RandomHex 32
$initialPassword = New-RandomAlphaNumeric 24
$publicUrl = "http://$PublicHost"

$buildEnv = @(
  "DATABASE_URL=$databaseUrl",
  "NEXTAUTH_URL=$publicUrl",
  "NEXTAUTH_SECRET=$nextAuthSecret",
  "ENCRYPTION_KEY=$encryptionKey",
  'INSTANCE_NAME=Produccion',
  'PORT=3000',
  'NODE_ENV=production',
  'NEXT_OUTPUT_MODE=standalone'
)
Set-Content -LiteralPath (Join-Path $appRoot '.env') -Value $buildEnv -Encoding utf8

Push-Location $appRoot
try {
  Invoke-Checked $npm @('ci', '--no-audit', '--no-fund')
  Invoke-Checked $npx @('prisma', 'generate')
  Invoke-Checked $npx @('prisma', 'db', 'push')

  $env:INITIAL_ADMIN_EMAIL = $InitialAdminEmail
  $env:INITIAL_ADMIN_PASSWORD = $initialPassword
  $env:INITIAL_ADMIN_NAME = 'Administrador'
  Invoke-Checked $npx @('prisma', 'db', 'seed')
  Remove-Item Env:INITIAL_ADMIN_EMAIL, Env:INITIAL_ADMIN_PASSWORD, Env:INITIAL_ADMIN_NAME -ErrorAction SilentlyContinue

  $env:NEXT_OUTPUT_MODE = 'standalone'
  Invoke-Checked $npm @('run', 'build')
} finally {
  Pop-Location
  Remove-Item Env:INITIAL_ADMIN_EMAIL, Env:INITIAL_ADMIN_PASSWORD, Env:INITIAL_ADMIN_NAME -ErrorAction SilentlyContinue
}

$standaloneRoot = Join-Path $appRoot '.next\standalone'
if (-not (Test-Path -LiteralPath (Join-Path $standaloneRoot 'server.js'))) {
  throw 'La compilación no produjo el servidor standalone de Next.js.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $standaloneRoot '.next') | Out-Null
Copy-Item -LiteralPath (Join-Path $appRoot '.next\static') -Destination (Join-Path $standaloneRoot '.next\static') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $appRoot 'public') -Destination (Join-Path $standaloneRoot 'public') -Recurse -Force
Set-Content -LiteralPath (Join-Path $standaloneRoot '.env') -Value $buildEnv -Encoding utf8

$runner = Join-Path $standaloneRoot 'run-report-manager.cmd'
$runnerLines = @(
  '@echo off',
  'setlocal',
  'set "NODE_ENV=production"',
  'set "PORT=3000"',
  ('set "DATABASE_URL=' + $databaseUrl + '"'),
  ('set "NEXTAUTH_URL=' + $publicUrl + '"'),
  ('set "NEXTAUTH_SECRET=' + $nextAuthSecret + '"'),
  ('set "ENCRYPTION_KEY=' + $encryptionKey + '"'),
  'set "INSTANCE_NAME=Produccion"',
  ('"' + $node + '" "' + (Join-Path $standaloneRoot 'server.js') + '"')
)
Set-Content -LiteralPath $runner -Value $runnerLines -Encoding ascii

Invoke-Checked 'winget.exe' @('install', '--id', 'CaddyServer.Caddy', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--location', (Join-Path $binRoot 'caddy'))
Invoke-Checked 'winget.exe' @('install', '--id', 'NSSM.NSSM', '--exact', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--location', (Join-Path $binRoot 'nssm'))
$caddy = Get-ChildItem -LiteralPath $binRoot -Filter caddy.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$nssm = Get-ChildItem -LiteralPath $binRoot -Filter nssm.exe -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match 'win64' } | Select-Object -First 1
if (-not $caddy -or -not $nssm) { throw 'No se pudieron localizar Caddy o NSSM después de instalarlos.' }

$caddyRoot = Split-Path -Parent $caddy.FullName
$caddyFile = Join-Path $caddyRoot 'Caddyfile'
$caddyConfig = @"
http://$PublicHost, http://localhost {
    encode zstd gzip
    header {
        -Server
        X-Content-Type-Options nosniff
        X-Frame-Options SAMEORIGIN
        Referrer-Policy strict-origin-when-cross-origin
    }
    reverse_proxy 127.0.0.1:3000
}
"@
Set-Content -LiteralPath $caddyFile -Value $caddyConfig -Encoding utf8

foreach ($serviceName in 'ReportManagerNode', 'ReportManagerProxy') {
  if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
    & $nssm.FullName stop $serviceName | Out-Null
    & $nssm.FullName remove $serviceName confirm | Out-Null
  }
}

Invoke-Checked $nssm.FullName @('install', 'ReportManagerNode', "$env:ComSpec")
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppParameters', ('/d /c ""' + $runner + '""'))
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppDirectory', $standaloneRoot)
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppStdout', (Join-Path $logRoot 'node.stdout.log'))
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppStderr', (Join-Path $logRoot 'node.stderr.log'))
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppRotateFiles', '1')
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppExit', 'Default', 'Restart')
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'AppThrottle', '5000')
Invoke-Checked $nssm.FullName @('set', 'ReportManagerNode', 'ObjectName', 'NT AUTHORITY\LocalService', '', '')

Invoke-Checked $nssm.FullName @('install', 'ReportManagerProxy', $caddy.FullName)
Invoke-Checked $nssm.FullName @('set', 'ReportManagerProxy', 'AppParameters', ('run --config "' + $caddyFile + '" --adapter caddyfile'))
Invoke-Checked $nssm.FullName @('set', 'ReportManagerProxy', 'AppDirectory', $caddyRoot)
Invoke-Checked $nssm.FullName @('set', 'ReportManagerProxy', 'AppStdout', (Join-Path $logRoot 'caddy.stdout.log'))
Invoke-Checked $nssm.FullName @('set', 'ReportManagerProxy', 'AppStderr', (Join-Path $logRoot 'caddy.stderr.log'))
Invoke-Checked $nssm.FullName @('set', 'ReportManagerProxy', 'AppExit', 'Default', 'Restart')

& icacls $InstallRoot /inheritance:r | Out-Null
& icacls $InstallRoot /grant:r "BUILTIN\Administrators:(OI)(CI)F" "NT AUTHORITY\SYSTEM:(OI)(CI)F" "${OwnerPrincipal}:(OI)(CI)F" | Out-Null
& icacls $InstallRoot /grant "NT AUTHORITY\LOCAL SERVICE:(OI)(CI)RX" | Out-Null
& icacls $appRoot /grant "NT AUTHORITY\LOCAL SERVICE:(OI)(CI)RX" | Out-Null
& icacls $runtimeRoot /grant "NT AUTHORITY\LOCAL SERVICE:(OI)(CI)RX" | Out-Null
& icacls $dataRoot /grant "NT AUTHORITY\LOCAL SERVICE:(OI)(CI)M" | Out-Null
& icacls $logRoot /grant "NT AUTHORITY\LOCAL SERVICE:(OI)(CI)M" | Out-Null

$ruleName = 'Report Manager HTTP (LAN)'
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 80 -Profile Private -RemoteAddress LocalSubnet | Out-Null

Start-Service -Name 'ReportManagerNode'
Start-Sleep -Seconds 4
Start-Service -Name 'ReportManagerProxy'
Start-Sleep -Seconds 2

$nodeCheck = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3000/login' -TimeoutSec 15
$proxyCheck = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost/login' -TimeoutSec 15
if ($nodeCheck.StatusCode -ne 200 -or $proxyCheck.StatusCode -ne 200) {
  throw 'La verificación HTTP no recibió 200 en uno de los servicios.'
}

$accessFile = Join-Path $InstallRoot 'initial-access.txt'
Set-Content -LiteralPath $accessFile -Value @(
  "URL: $publicUrl",
  "Usuario: $InitialAdminEmail",
  "Contraseña temporal: $initialPassword",
  'Cambie esta contraseña después del primer acceso.'
) -Encoding utf8
& icacls $accessFile /inheritance:r | Out-Null
& icacls $accessFile /grant:r 'BUILTIN\Administrators:F' 'NT AUTHORITY\SYSTEM:F' "$OwnerPrincipal:F" | Out-Null

Write-Host "Despliegue terminado. Abra $publicUrl"
Write-Host "Credenciales iniciales guardadas en $accessFile"
