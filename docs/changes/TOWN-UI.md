# TOWN-UI

## Changed

Added the town screen markup and styles, data-driven build tabs and entries,
and delegated mouse and keyboard input. It shows the town metrics, date,
always-visible NEXT line, build plans and lock reasons, reports, overlays,
speed controls and navigation. Selecting a plan then dragging to a map cell
sends a `placeBuilding` command. R rotates the footprint. Escape and right
click cancel. All host actions use explicit callbacks.

The markup functions are pure and can be checked in Node. The town view still
needs to supply map cells and live values when the screen is wired in.

## Checks

- `node tools/test-town-ui.mjs`: passed, 37 checks.
- `npm.cmd run build`: passed. Vite reported its existing dynamic import and
  large chunk warnings.
- `npm run build`: did not start because PowerShell blocked its `npm.ps1`
  shim. The same package build passed through `npm.cmd`.
- Lane tier: not run, per the card. Claude runs it.
- Browser check and look check: not run. Claude should mount the screen with
  the town view, check placement at a valid and refused cell, check keyboard
  controls, and review the yard palette and panel fit at laptop size.
- Race fingerprints: unchanged. No race or replay files changed.
- Changed assertions: none.

## Removed

Nothing replaced.
