param(
  [Parameter(Mandatory = $true)]
  [string]$DataRoot,
  [string]$Sans = "localhost,127.0.0.1",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$certDir = Join-Path $DataRoot "data\certs"
$pfxPath = Join-Path $certDir "server.pfx"
$cerPath = Join-Path $certDir "gym-erp.cer"

New-Item -ItemType Directory -Force -Path $certDir | Out-Null
if ((Test-Path $pfxPath) -and -not $Force) { exit 0 }
if (Test-Path $pfxPath) { Remove-Item -LiteralPath $pfxPath -Force }
if (Test-Path $cerPath) { Remove-Item -LiteralPath $cerPath -Force }

$names = @($Sans.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($names.Count -eq 0) { $names = @("localhost", "127.0.0.1") }

$parts = New-Object System.Collections.Generic.List[string]
foreach ($name in $names) {
  if ($name -match '^\d+\.\d+\.\d+\.\d+$' -or $name -match ':') {
    [void]$parts.Add("IPAddress=$name")
  } else {
    [void]$parts.Add("DNS=$name")
  }
}
$san = [string]::Join("&", $parts)

$certificate = New-SelfSignedCertificate `
  -Subject "CN=GYM ERP LAN" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotBefore (Get-Date).AddMinutes(-10) `
  -NotAfter (Get-Date).AddYears(3) `
  -KeyExportPolicy Exportable `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -KeyUsage DigitalSignature, KeyEncipherment `
  -TextExtension @("2.5.29.17={text}$san", "2.5.29.37={text}1.3.6.1.5.5.7.3.1")

$password = ConvertTo-SecureString -String "gym-erp-local" -AsPlainText -Force
Export-PfxCertificate -Cert $certificate -FilePath $pfxPath -Password $password | Out-Null
Export-Certificate -Cert $certificate -FilePath $cerPath -Type CERT | Out-Null
Remove-Item "Cert:\CurrentUser\My\$($certificate.Thumbprint)" -Force
Write-Host "Created local HTTPS certificate at $pfxPath"
