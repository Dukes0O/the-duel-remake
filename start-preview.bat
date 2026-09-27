@echo off
setlocal
title The Duel Preview - close this window to stop the preview
cd /d "%~dp0"

set "PREVIEW_PORT=5195"
set "PREVIEW_FLAGS=scrapdome,crash-physics,crash-effects,titan-climb,muddy-hollow"
set "PREVIEW_PATH=/tools/preview.html?flags=%PREVIEW_FLAGS%"

echo.
echo  ============================================
echo    The Duel Preview - temporary saves only
echo    Closing this window stops the preview.
echo  ============================================
echo.

rem A second click opens the preview that is already served from this port.
node tools\launcher-port.mjs --port %PREVIEW_PORT% --preview
if errorlevel 20 goto port_conflict
if errorlevel 10 goto open_existing
if errorlevel 1 goto probe_failed

if not exist node_modules\vite (
  echo The locked dependencies are missing from this integration checkout.
  echo Run npm ci in this folder, then start the preview again.
  pause >nul
  exit /b 1
)

echo Building the latest memory-only QA preview...
call npm run qa:build
if errorlevel 1 (
  echo.
  echo Preview build failed. Press any key to exit.
  pause >nul
  exit /b 1
)

if not exist .qa-dist\tools\preview.html (
  echo The QA build did not create .qa-dist\tools\preview.html.
  pause >nul
  exit /b 1
)

node node_modules\vite\bin\vite.js preview --config tools\vite-qa.config.js --host 127.0.0.1 --port %PREVIEW_PORT% --strictPort --open "%PREVIEW_PATH%"
if errorlevel 1 (
  node tools\launcher-port.mjs --port %PREVIEW_PORT% --preview
  if errorlevel 20 goto port_conflict
  if errorlevel 10 goto open_existing
  goto probe_failed
)

echo.
echo Preview stopped. Press any key to close.
pause >nul
exit /b 0

:open_existing
echo Opening the running preview at http://127.0.0.1:%PREVIEW_PORT%%PREVIEW_PATH% ...
start "" "http://127.0.0.1:%PREVIEW_PORT%%PREVIEW_PATH%"
exit /b 0

:port_conflict
echo.
echo Port %PREVIEW_PORT% is in use by another service.
echo Close that service or the existing preview, then try again.
pause >nul
exit /b 1

:probe_failed
echo.
echo Could not check preview port %PREVIEW_PORT%. The preview was not started.
pause >nul
exit /b 1
