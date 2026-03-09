@echo off
title Work Permit App - SHE Department
echo ========================================
echo  Work Permit App - สหมิตรถังแก๊ส จำกัด
echo  หน่วยงานความปลอดภัย (SHE)
echo ========================================
echo.
echo Starting server on http://localhost:3001
echo.
cd /d "%~dp0"
start http://localhost:3001
npm start
