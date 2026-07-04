# Samarqand Aqlli Sug'orish — toza ishga tushirish
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

function Stop-Port([int]$Port) {
  Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host "==> Eski jarayonlarni to'xtatish..." -ForegroundColor Cyan
Stop-Port 3000
Stop-Port 5173
Stop-Port 5174
Start-Sleep -Seconds 2

Write-Host "==> Docker..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop ni yoqing va qayta urinib ko'ring." -ForegroundColor Red
  exit 1
}

Write-Host "==> Postgres kutish..." -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
  docker exec suv-postgres pg_isready -U suv -d suv_shaxar 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
}

$env:DATABASE_URL = "postgresql://suv:suv_secret@localhost:5433/suv_shaxar"

if (-not (Test-Path "node_modules")) {
  Write-Host "==> npm install..." -ForegroundColor Cyan
  npm install
}

Write-Host "==> Shared + DB..." -ForegroundColor Cyan
npm run build -w @suv/shared
npm run db:migrate
npm run db:seed

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PORTAL:     http://localhost:5170  (tanlash)"
Write-Host "  Operator:   http://localhost:5173"
Write-Host "  Hokimiyat:  http://localhost:5174"
Write-Host "  API:        http://localhost:3000/api"
Write-Host ""
Write-Host "  Operator:  +998901111111 / Admin123!"
Write-Host "  Hokimiyat: +998903333333 / Admin123!"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Servislar ishga tushmoqda (Ctrl+C bilan to'xtatiladi)..." -ForegroundColor Yellow

Start-Process "http://localhost:5170"

npm run dev
