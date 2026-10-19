# Copia/atualiza pasta local e faz deploy no servidor Docker (rede 192.168.x).
param(
  [string]$RemoteHost = "192.168.1.82",
  [string]$RemoteUser = "pedro-levorato",
  [string]$RemoteDir = "/opt/sites_dev/estoque-em-tempo-real",
  [int]$AppPort = 3012
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ScriptDir "setup-windows-local.ps1")

$ProjectDir = "C:\Users\pedro.levorato\Documents\estoque em tempo real"
$Remote = "${RemoteUser}@${RemoteHost}"

Write-Host "==> Criando diretório remoto..."
ssh $Remote "mkdir -p '$RemoteDir'"

Write-Host "==> Enviando arquivos (rsync via WSL ou scp)..."
if (Get-Command wsl -ErrorAction SilentlyContinue) {
  wsl rsync -avz --delete `
    --exclude node_modules --exclude .git --exclude out --exclude .next `
    "/mnt/c/Users/pedro.levorato/Documents/estoque em tempo real/" `
    "${Remote}:${RemoteDir}/"
} else {
  scp -r "$ProjectDir\*" "${Remote}:${RemoteDir}/"
}

Write-Host "==> Docker compose no servidor..."
ssh $Remote @"
set -e
cd '$RemoteDir'
docker compose build --pull
docker compose up -d
docker compose ps
echo ''
echo 'URL: http://${RemoteHost}:${AppPort}/dashboard/'
"@

Write-Host "==> Deploy concluído."
