@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

if not exist "%ROOT%\node_modules" (
  echo GYM ERP dependencies are missing. Run install-gym-erp.cmd first.
  pause
  exit /b 1
)

set "DATA_ROOT=%LOCALAPPDATA%\GYM ERP"
set "READY_FILE=%TEMP%\gym-erp-ready-%RANDOM%.txt"

start "GYM ERP Server" /min cmd /d /c ""%ROOT%\scripts\start-gym-erp.cmd" > "%READY_FILE%" 2>&1"

set /a ATTEMPTS=0
:wait
set /a ATTEMPTS+=1
>nul 2>&1 curl.exe --silent --insecure --fail https://127.0.0.1:5178/api/status
if not errorlevel 1 (
  start "" https://localhost:5178
  del /q "%READY_FILE%" >nul 2>&1
  exit /b 0
)
if %ATTEMPTS% GEQ 30 (
  echo GYM ERP did not start. Check the minimized GYM ERP Server window.
  type "%READY_FILE%" 2>nul
  del /q "%READY_FILE%" >nul 2>&1
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait
