---
task: FND-08
status: merged
kind: tooling
flag: none
player_facing: no
---

## What changed

Added a browser harness with no new package dependency. It builds the QA bundle, starts Vite preview on a free localhost port above 5190, and drives headless Chrome through the DevTools protocol with Node's built-in WebSocket. Chrome gets a temporary profile that the harness removes after the run. The smoke scenario uses the existing QA page, which installs in-memory storage before loading the game. It checks the menu and an active race in High and Performance, then saves four screenshots and a JSON report in ignored `.qa-dist/browser-output/`.

The harness fails on browser console errors, uncaught exceptions, failed network requests, or scenario assertions. A tiny inline favicon is added only to the generated QA page to prevent Chrome's missing-favicon request from creating a false console error. Run a named scenario with `node tools/browser-harness.mjs scenario <name>`.

## Evidence

- `node --test tools/test-browser-harness.mjs`: 3/3 passed (arguments, private ports, console classification).
- `node tools/browser-harness.mjs smoke`: passed on private port 40328 with Chrome sandbox enabled; High and Performance each reached an active race; four unobstructed screenshots, zero warnings and zero console errors.
- `node tools/browser-harness.mjs smoke --inject-console-error`: failed with exit code 1 and reported `FND-08 deliberate console error`, as required.
- Inspected the High race screenshot: the rendered car, road, HUD and rear view were present during active driving.
- `node tools/run-tests.mjs --filter browser-harness`: passed; `npm run build`: passed (existing large-chunk warning).
- `node --check` for both harness and scenario; `git diff --check`: passed.

## Behavior and test changes

No game code or existing assertions changed. Screenshots and reports from a run remain in `.qa-dist/browser-output/` until the next QA build clears `.qa-dist`.
