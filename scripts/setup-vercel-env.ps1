# Vercel API environment variables (suv-shaxar-api)
# Run from repo root: .\scripts\setup-vercel-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Write-Error ".env topilmadi. Avval DATABASE_URL ni .env ga qo'ying."
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL .env da yo'q"
}

if (-not $env:JWT_SECRET) {
  $env:JWT_SECRET = "suv-shaxar-prod-jwt-" + (Get-Random)
}
if (-not $env:JWT_REFRESH_SECRET) {
  $env:JWT_REFRESH_SECRET = "suv-shaxar-prod-refresh-" + (Get-Random)
}

$apiDir = Join-Path $root "apps\api"
Push-Location $apiDir

function Set-VercelEnv($name, $value) {
  Write-Host "Setting $name ..."
  $value | npx vercel env add $name production --force 2>&1 | Out-Host
}

Set-VercelEnv "DATABASE_URL" $env:DATABASE_URL
Set-VercelEnv "JWT_SECRET" $env:JWT_SECRET
Set-VercelEnv "JWT_REFRESH_SECRET" $env:JWT_REFRESH_SECRET
Set-VercelEnv "DISABLE_BACKGROUND_SERVICES" "true"
Set-VercelEnv "CORS_ORIGINS" "https://suv-shaxar-portal.vercel.app,https://suv-shaxar-obodon.vercel.app,https://suv-shaxar-hokimiyat.vercel.app"

Write-Host "Redeploy: npx vercel --prod"
Pop-Location
