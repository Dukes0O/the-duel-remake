@echo off
setlocal
title The Duel  -  close this window to stop the game
cd /d "%~dp0"

echo.
echo  ============================================
echo    The Duel
echo    Closing this window stops the game server.
echo  ============================================
echo.

if not exist node_modules\vite (
  echo Installing dependencies for the first time...
  call npm ci
  if errorlevel 1 (
    echo.
    echo npm ci failed.  Press any key to exit.
    pause >nul
    exit /b 1
  )
)

if not exist dist\index.html (
  echo Building the game for the first time...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Build failed.  Press any key to exit.
    pause >nul
    exit /b 1
  )
)

rem Serve a finished build. Source edits cannot reload a race in progress.
rem Keep localhost:5174 so existing browser careers remain available.
node node_modules\vite\bin\vite.js preview --host localhost --port 5174 --strictPort --open

echo.
echo Server stopped.  Press any key to close.
pause >nul
