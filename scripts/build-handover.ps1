$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Running validation..."
npm run typecheck
npm test -- --run --passWithNoTests
npm run lint

$Output = Join-Path $Root "handover"
if (Test-Path $Output) {
  Remove-Item -LiteralPath $Output -Recurse -Force
}
New-Item -ItemType Directory -Path $Output | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Output "scripts") | Out-Null

Copy-Item -LiteralPath "apps", "packages", "services", "docs", "package.json", "package-lock.json", "tsconfig.base.json", ".env.example", ".gitignore", "README.md" -Destination $Output -Recurse
Copy-Item -LiteralPath "scripts\start-gym-erp.cmd", "scripts\open-gym-erp.cmd", "scripts\configure-gym-erp.cmd", "scripts\install-gym-erp.cmd" -Destination (Join-Path $Output "scripts")
Copy-Item -LiteralPath "scripts\install-face-models.cmd", "scripts\face_recognition_service.py", "scripts\ensure-gym-erp-certificate.ps1" -Destination (Join-Path $Output "scripts")
if (Test-Path "models") {
  Copy-Item -LiteralPath "models" -Destination $Output -Recurse
}
$NestedDependencies = Get-ChildItem -LiteralPath $Output -Directory -Recurse -Force | Where-Object { $_.Name -eq "node_modules" }
foreach ($DependencyDirectory in $NestedDependencies) {
  Remove-Item -LiteralPath $DependencyDirectory.FullName -Recurse -Force
}

Write-Host "Handover source bundle created at $Output"
Write-Host "This bundle is not a signed Windows installer or Android APK."
