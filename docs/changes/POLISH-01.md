---
task: POLISH-01
status: ready-to-merge
kind: fix
flag: none
player_facing: yes
---

## What changed

The menu reserves the title's full height before placing the player and race setup controls on desktop viewports shorter than 850 pixels. At narrow desktop widths, the footer wraps its control hints and build details so they remain inside the screen. The phone layout keeps its existing stacked spacing.

## Evidence

- Before the fix at 1280x800, the title extended to y=284 while the player row started at y=200, an 84-pixel overlap. After the fix, the title ends at y=228 and the player row starts at y=244, leaving 16 pixels.
- An isolated browser layout check passed at 1280x800, 1280x720, 900x800, 851x800, 768x800, 701x800, and 390x844. It checked title/player and setup/footer spacing, horizontal overflow, and console output. Eight screenshots were inspected or saved; zero warnings and zero errors. The 1280x720 menu scrolls vertically by 52 pixels so the footer remains reachable.
- `node tools/browser-harness.mjs smoke` passed on private port 45717: High and Performance each reached a race; four screenshots, zero warnings and zero errors.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8 --keep-going` passed 149/149 jobs in 380.55 seconds. The runner selected all jobs for the CSS change.
- `npm run build` passed with the existing Vite large-chunk warning.

## Behavior and test changes

Only menu layout CSS changed. No game logic or existing assertions changed. QA screenshots and reports are in ignored `.qa-dist/browser-output/` until the next QA build clears the directory.
