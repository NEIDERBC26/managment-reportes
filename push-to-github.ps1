# Script para hacer push a GitHub
$gitPath = "C:\Program Files\Git\cmd\git.exe"
$env:Path += ";C:\Program Files\Git\cmd"

# Configurar git
& $gitPath config user.email "test@example.com"
& $gitPath config user.name "Test User"

# Hacer push a main
Write-Host "Haciendo push a GitHub..."
& $gitPath push -u report_manager main -v

# Verificar el estado
Write-Host ""
Write-Host "Estado después del push:"
& $gitPath branch -vv

Write-Host ""
Write-Host "Push completado!"
