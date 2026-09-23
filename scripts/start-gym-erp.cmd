@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist "%ROOT%\node_modules" (
  echo GYM ERP dependencies are missing. Run install-gym-erp.cmd first.
  exit /b 1
)

set "DATA_ROOT=%LOCALAPPDATA%\GYM ERP"
set "PFX_PATH=%DATA_ROOT%\data\certs\server.pfx"
if not exist "%PFX_PATH%" (
  echo Creating the local HTTPS certificate for phone camera access...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\scripts\ensure-gym-erp-certificate.ps1" "%DATA_ROOT%"
)
echo Starting GYM ERP...
call "%ROOT%\node_modules\.bin\tsx.cmd" "%ROOT%\apps\desktop\src\main.ts" --data "%DATA_ROOT%" --https-pfx "%PFX_PATH%"
exit /b %ERRORLEVEL%
