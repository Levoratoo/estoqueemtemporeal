# Clona ou atualiza o projeto na pasta Documents do usuário.
$ErrorActionPreference = "Stop"

$TargetDir = "C:\Users\pedro.levorato\Documents\estoque em tempo real"
$RepoUrl = "https://github.com/Levoratoo/estoqueemtemporeal.git"

$DeployBranch = "cursor/docker-deploy-estoque-3390"

if (Test-Path (Join-Path $TargetDir ".git")) {
  Write-Host "Atualizando repositório em: $TargetDir (branch $DeployBranch)"
  Push-Location $TargetDir
  git fetch origin
  git checkout $DeployBranch
  git pull origin $DeployBranch
  Pop-Location
} elseif (Test-Path $TargetDir) {
  Write-Host "Pasta existe sem .git — copiando conteúdo do repositório..."
  $Temp = Join-Path $env:TEMP "estoqueemtemporeal-clone"
  if (Test-Path $Temp) { Remove-Item -Recurse -Force $Temp }
  git clone $RepoUrl $Temp
  Copy-Item -Path (Join-Path $Temp "*") -Destination $TargetDir -Recurse -Force
  Remove-Item -Recurse -Force $Temp
  Push-Location $TargetDir
  git fetch origin
  git checkout $DeployBranch
  git pull origin $DeployBranch
  Pop-Location
} else {
  Write-Host "Clonando repositório em: $TargetDir"
  git clone $RepoUrl $TargetDir
  Push-Location $TargetDir
  git fetch origin
  git checkout $DeployBranch
  git pull origin $DeployBranch
  Pop-Location
}

Write-Host "Projeto pronto em: $TargetDir"
