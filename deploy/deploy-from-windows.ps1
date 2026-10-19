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
$SshOpts = "-o StrictHostKeyChecking=accept-new"
$UseSshPass = [bool]$env:SSHPASS -and (Get-Command wsl -ErrorAction SilentlyContinue)

function Invoke-RemoteShell {
  param([string]$Command)
  if ($UseSshPass) {
    wsl env SSHPASS="$env:SSHPASS" sshpass -e ssh $SshOpts $Remote $Command
  } else {
    ssh $SshOpts $Remote $Command
  }
}

Write-Host "==> Criando diretório remoto..."
Invoke-RemoteShell "mkdir -p '$RemoteDir'"

Write-Host "==> Enviando arquivos (rsync via WSL ou scp)..."
if (Get-Command wsl -ErrorAction SilentlyContinue) {
  if ($UseSshPass) {
    wsl env SSHPASS="$env:SSHPASS" rsync -avz -e "sshpass -e ssh $SshOpts" --delete `
      --exclude node_modules --exclude .git --exclude out --exclude .next `
      "/mnt/c/Users/pedro.levorato/Documents/estoque em tempo real/" `
      "${Remote}:${RemoteDir}/"
  } else {
    wsl rsync -avz --delete `
      --exclude node_modules --exclude .git --exclude out --exclude .next `
      "/mnt/c/Users/pedro.levorato/Documents/estoque em tempo real/" `
      "${Remote}:${RemoteDir}/"
  }
} else {
  if ($UseSshPass) {
    throw "SSHPASS definido, mas WSL não está disponível. Use WSL com sshpass ou configure chave SSH."
  }
  scp -r "$ProjectDir\*" "${Remote}:${RemoteDir}/"
}

Write-Host "==> Docker compose no servidor..."
$RemoteScript = @"
set -e
cd '$RemoteDir'
docker compose build --pull
docker compose up -d
docker compose ps
echo ''
echo 'URL: http://${RemoteHost}:${AppPort}/dashboard/'
"@
if ($UseSshPass) {
  $RemoteScript | wsl env SSHPASS="$env:SSHPASS" sshpass -e ssh $SshOpts $Remote "bash -s"
} else {
  $RemoteScript | ssh $SshOpts $Remote "bash -s"
}

Write-Host "==> Deploy concluído."
