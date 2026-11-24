@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo.
 echo ERROR: Node.js not installed or not in PATH.
 echo Download and install Node.js v22.13 or later from https://nodejs.org/
 echo After installation, restart the computer and run this file again.
 echo.
 pause
 exit /b 1
)
node scripts\launch.js
if errorlevel 1 (
 echo.
 echo Could not start OMNIBRAIN AI. Take a screenshot of the errors above.
)
echo.
echo Press any key to close this window.
pause >nul
