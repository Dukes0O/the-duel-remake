---
task: PREVIEW-WARLORDS
status: review
kind: tooling
player_facing: preview only
---

# The Preview turns on the warlord fights (30 September 2026)

WAR-02a-FORMAT put every warlord fight behind a new `warlords` development
switch, but the Preview launcher still requested a hand-kept list
(scrapdome, titan-climb, muddy-hollow), so Sal could not be reached in the
Preview for WAR-SAL-TUNE. The three listed switches are now released.

## What changed

- `start-preview.bat` requests `warlords`.
- `tools/test-preview-launcher.mjs` reads the development switches from
  `src/feature-flags.js` (all except career-backup, since Preview saves are
  memory-only) instead of a fixed list, so a new switch cannot be missed.
- `docs/OPERATIONS.md` describes the rule instead of naming switches.
- Board: WAR-02a-SAL merged after Claude's review; WAR-SAL-TUNE waits for
  Kyle and Gratian.

## Changed assertions (reviewed)

The launcher check asserted three named switches; it now asserts every
development switch in the catalog and fails first on `warlords` (it did,
before the launcher change). Stronger than before.

## Removed

The released switch names from the Preview launch URL.
