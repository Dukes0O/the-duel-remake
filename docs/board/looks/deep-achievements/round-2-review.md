# Shelf tiles

Claude's round-1 verdict: works and good hints, but default browser bullets.
Kyle requested this look-only pass: garage panels, gold earned medallions,
dim unearned outlines, italic hints, compact rows and known dates only.

The actual memory-only garage now shows three columns at 1280 px and two
at 800 px. All names and hints fit; earned and hinted tiles are distinct.
The small CSS medallions match the warm metal of the existing upgrade tiles.
No unknown-date text appears. The live-switch view still has one achievement.
Browser scenario: three pictures, zero warnings/errors. No save or rule changes.

Reproduce: `node tools/browser-harness.mjs scenario deep-achievements`.
Picture: `round-2.jpg`, actual 1280 by 900 garage screenshot.
