@echo off
setlocal
title The Duel Preview (starting)
cd /d "%~dp0"

rem One Preview only (docs/OPERATIONS.md, "Two places to play"). It builds into
rem its own folder, emptied on every build, so test runs never touch it and
rem old builds never pile up.
set "PREVIEW_PORT=5195"
set "PREVIEW_DIR=.preview-dist"
set "PREVIEW_FLAGS=scrapdome,titan-climb,muddy-hollow"
set "PREVIEW_PATH=/tools/preview.html?flags=%PREVIEW_FLAGS%"
set "PREVIEW_COMMIT=unknown"
for /f %%c in ('git rev-parse HEAD 2^>nul') do set "PREVIEW_COMMIT=%%c"

echo.
echo  ============================================
echo    The Duel Preview - temporary saves only
echo    Closing this window stops the preview.
echo  ============================================
echo.

rem Reuse a running Preview only if it was built from the current work.
node tools\launcher-port.mjs --port %PREVIEW_PORT% --preview --expect-commit %PREVIEW_COMMIT%
if errorlevel 20 goto port_conflict
if errorlevel 11 goto replace_stale
if errorlevel 10 goto open_existing
if errorlevel 1 goto probe_failed
goto build

:replace_stale
echo Newer work is ready. Stopping the old preview...
taskkill /FI "WINDOWTITLE eq The Duel Preview - close*" /T /F >nul 2>&1
set /a WAITED=0
:wait_free
node tools\launcher-port.mjs --port %PREVIEW_PORT% --preview >nul 2>&1
if not errorlevel 1 goto build
set /a WAITED+=1
if %WAITED% GEQ 20 goto stop_failed
timeout /t 1 /nobreak >nul
goto wait_free

:build
title The Duel Preview - close this window to stop the preview
if not exist node_modules\vite (
  echo The locked dependencies are missing from this integration checkout.
  echo Run npm ci in this folder, then start the preview again.
  pause >nul
  exit /b 1
)

echo Building the latest memory-only preview...
call node node_modules\vite\bin\vite.js build --config tools\vite-qa.config.js --outDir %PREVIEW_DIR% --emptyOutDir
if errorlevel 1 (
  echo.
  echo Preview build failed. Press any key to exit.
  pause >nul
  exit /b 1
)
if not exist %PREVIEW_DIR%\tools\preview.html (
  echo The build did not create %PREVIEW_DIR%\tools\preview.html.
  pause >nul
  exit /b 1
)
node tools\preview-stamp.mjs %PREVIEW_DIR% %PREVIEW_COMMIT%

node node_modules\vite\bin\vite.js preview --config tools\vite-qa.config.js --outDir %PREVIEW_DIR% --host 127.0.0.1 --port %PREVIEW_PORT% --strictPort --open "%PREVIEW_PATH%"
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

:stop_failed
echo.
echo The old preview did not stop. Close its black window, then try again.
pause >nul
exit /b 1

:probe_failed
echo.
echo Could not check preview port %PREVIEW_PORT%. The preview was not started.
pause >nul
exit /b 1
