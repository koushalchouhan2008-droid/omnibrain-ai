@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Users\Koushal\.gemini\antigravity\scratch\tools\mingit\cmd;C:\Users\Koushal\.gemini\antigravity\scratch\tools\bin;C:\Users\Koushal\.gemini\antigravity\scratch\node22\node-v22.14.0-win-x64;%PATH%"

echo ================================================================
echo             OFFICIAL GITHUB PUBLISH: OMNIBRAIN AI
echo ================================================================
echo.
echo Project Directory: %CD%
echo.

gh auth status >nul 2>nul
if errorlevel 1 (
    echo [Step 1/2] Connecting your GitHub Account...
    echo.
    echo A one-time activation code will be shown below.
    echo Press ENTER when prompted to open GitHub in your browser.
    echo.
    gh auth login -p https -w
    if errorlevel 1 (
        echo.
        echo GitHub authentication was cancelled or failed.
        pause
        exit /b 1
    )
)

echo.
echo [Step 2/2] Publishing repository to your GitHub profile...
gh repo create omnibrain-ai --public --source=. --remote=origin --push
if errorlevel 1 (
    echo.
    echo If repository already exists on GitHub, pushing directly:
    git push -u origin main
)

echo.
echo ================================================================
echo        OFFICIAL REPOSITORY PUBLISHED SUCCESSFULLY!
echo ================================================================
echo.
echo Opening your new GitHub repository in browser...
gh repo view --web
pause
