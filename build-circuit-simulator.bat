@echo off
setlocal
cd /d "%~dp0"
echo.
echo ========================================
echo   EcEHub Circuit Simulator Builder
echo ========================================
echo.
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :fail
)
echo Building simulator...
call npm run build:circuit-simulator
if errorlevel 1 goto :fail
if not exist circuit-simulator.bundle.js goto :fail
if not exist circuit-simulator.css goto :fail

echo.
echo ========================================
echo BUILD SUCCESSFUL
 echo ========================================
echo.
echo Created:
echo   circuit-simulator.bundle.js
echo   circuit-simulator.css
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo BUILD FAILED
echo ========================================
echo.
echo Check the error above.
pause
exit /b 1
