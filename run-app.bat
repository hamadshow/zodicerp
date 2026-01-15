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

echo Starting Laravel Backend...
:: Using cmd /k to keep the window open so you can see errors
start "Laravel Backend" cmd /k "%PHP_BIN% artisan serve"

echo Starting Vite Frontend...
start "Vite Frontend" cmd /k "npm run dev"

echo.
echo ========================================================
echo  Servers are running in separate windows.
echo  DO NOT CLOSE those windows.
echo  
echo  App URL: http://localhost:8000
echo ========================================================
echo.
pause
