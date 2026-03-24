@echo off
title Work Permit App [DEV] - SHE Department
echo ========================================
echo  Work Permit App [DEV] - สหมิตรถังแก๊ส
echo ========================================
echo.
echo Killing process on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Done.
echo.
echo Starting DEV server on http://localhost:3002
echo.
cd /d "%~dp0"
start http://localhost:3002
npm run dev
