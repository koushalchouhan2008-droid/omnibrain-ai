@echo off
setlocal
cd /d "%~dp0"
echo ================================================================
echo             STARTING OMNIBRAIN AI LIVE ONLINE
echo ================================================================
powershell -ExecutionPolicy Bypass -File "C:\Users\Koushal\.gemini\antigravity\scratch\run_live_service.ps1"
pause
