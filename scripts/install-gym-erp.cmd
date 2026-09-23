@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required for this development handover package.
  echo The production installer must bundle the runtime before customer delivery.
  exit /b 1
)

call npm install --omit=optional
if errorlevel 1 exit /b %ERRORLEVEL%
call "%ROOT%\scripts\install-face-models.cmd"
if errorlevel 1 exit /b %ERRORLEVEL%
call "%ROOT%\scripts\configure-gym-erp.cmd"
if errorlevel 1 exit /b %ERRORLEVEL%
echo Installation complete. Use the GYM ERP desktop shortcut to launch the system.
