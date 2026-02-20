@echo off
setlocal

:: Define PHP Path
set PHP_BIN=c:\xampp\php\php.exe

:: Check if PHP exists
if not exist "%PHP_BIN%" (
    echo Error: PHP not found at %PHP_BIN%
    pause
    exit /b
)

:: Ensure we are in the project root
cd /d "c:\xampp\htdocs\zodicerp"

echo Starting Vite Frontend...
start "Vite Frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo  Frontend Server (Vite) is running in a separate window.
echo  Backend Server is XAMPP Apache (Port 80).
echo  DO NOT CLOSE the Vite window.
echo  
echo  App URL: http://localhost
echo ========================================================
echo.
pause
