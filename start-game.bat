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

rem A second desktop click should reuse the live game without rebuilding it.
node tools\launcher-port.mjs
if errorlevel 20 goto port_conflict
if errorlevel 10 goto open_existing
if errorlevel 1 goto probe_failed

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
if errorlevel 1 (
  rem Another launch may have won the port between our check and Vite startup.
  node tools\launcher-port.mjs
  if errorlevel 20 goto port_conflict
  if errorlevel 10 goto open_existing
  goto probe_failed
)

echo.
echo Server stopped.  Press any key to close.
pause >nul
exit /b 0

:open_existing
echo Opening the running game at http://localhost:5174/ ...
start "" "http://localhost:5174/"
exit /b 0

:port_conflict
echo.
echo Port 5174 is in use, but it is not serving The Duel.
echo Close the other server before starting the game.
echo Press any key to close.
pause >nul
exit /b 1

:probe_failed
echo.
echo Could not check port 5174. The game was not started.
echo Press any key to close.
pause >nul
exit /b 1
