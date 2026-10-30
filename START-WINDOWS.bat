@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js 20.19+ / 22.12+ is required. Install it from https://nodejs.org/
 pause
 exit /b 1
)
if not exist node_modules (
 echo Installing dependencies from npm...
 call npm install
 if errorlevel 1 (
   echo Dependency installation failed. Check your internet connection.
   pause
   exit /b 1
 )
)
echo Launching FRAMEWORK development server...
call npm run dev
pause
