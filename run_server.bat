@echo off
echo ==============================================
echo   2D Virtual War Learning System
echo ==============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b
)

echo [OK] Node.js found.
node -v
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo [SETUP] Installing dependencies...
    call npm install
    echo.
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Dependencies already installed.
)

echo.
echo ==============================================
echo   Starting server...
echo ==============================================
echo.

node server/server.js

pause
