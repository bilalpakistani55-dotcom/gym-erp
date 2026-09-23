@echo off
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo Windows PowerShell is required to create shortcuts.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path '%ROOT%').Path; " ^
  "$shell = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$startup = [Environment]::GetFolderPath('Startup'); " ^
  "$targets = @(@{Path=(Join-Path $desktop 'GYM ERP.lnk'); Target=(Join-Path $root 'scripts\open-gym-erp.cmd'); Work=$root}, @{Path=(Join-Path $startup 'GYM ERP.lnk'); Target=(Join-Path $root 'scripts\start-gym-erp.cmd'); Work=$root}); " ^
  "foreach ($item in $targets) { $shortcut = $shell.CreateShortcut($item.Path); $shortcut.TargetPath = $item.Target; $shortcut.WorkingDirectory = $item.Work; $shortcut.Description = 'GYM ERP local desktop system'; $shortcut.WindowStyle = 7; $shortcut.Save() }"
if errorlevel 1 (
  echo Shortcut creation failed.
  pause
  exit /b 1
)

echo Created:
echo   Desktop shortcut: GYM ERP
echo   Automatic startup: GYM ERP
echo.
echo Double-click the desktop shortcut to start the server and open the ERP.
echo Windows will start the server automatically after the next sign-in.
pause
