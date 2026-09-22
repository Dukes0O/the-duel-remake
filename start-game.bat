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

if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.  Press any key to exit.
    pause >nul
    exit /b 1
  )
)

rem Vite opens the browser only after this game's server starts successfully.
rem strictPort in vite.config.js prevents falling back to a different port.
call npm run dev -- --open

echo.
echo Server stopped.  Press any key to close.
pause >nul
