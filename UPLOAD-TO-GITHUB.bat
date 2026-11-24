@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Users\Koushal\.gemini\antigravity\scratch\tools\mingit\cmd;C:\Users\Koushal\.gemini\antigravity\scratch\tools\bin;C:\Users\Koushal\.gemini\antigravity\scratch\node22\node-v22.14.0-win-x64;%PATH%"

echo ================================================================
echo             UPLOAD OMNIBRAIN AI TO GITHUB
echo ================================================================
echo.

gh auth status >nul 2>nul
if errorlevel 1 (
    echo [Step 1/2] Connecting to GitHub...
    echo A browser window will open and show a one-time activation code.
    echo Approve the login in your browser to continue.
    echo.
    gh auth login -p https -w
    if errorlevel 1 (
        echo.
        echo GitHub authentication cancelled or failed.
        pause
        exit /b 1
    )
)

echo.
echo [Step 2/2] Creating GitHub repository and pushing code...
gh repo create omnibrain-ai --public --source=. --remote=origin --push
if errorlevel 1 (
    echo.
    echo If repository already exists, pushing directly:
    git push -u origin main
)

echo.
echo ================================================================
echo              UPLOAD TO GITHUB COMPLETE!
echo ================================================================
echo.
pause
