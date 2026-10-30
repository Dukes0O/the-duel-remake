---
task: SAVE-BUDGET-FIGURE
status: ready
kind: test-limit
---

# Save-size planning figure before the start-up move (30 October 2026)

Kyle chose this ("Raise the limit") when the Kogane release took the eight-full-player model in `tools/test-storage-budget.mjs` to 4,053,224 bytes before the start-up move, 53,224 over 4 MB (three Kogane record events: 72 more leaderboard rows; the Skyline: 5,886 bytes).

## Changed assertion

- `tools/test-storage-budget.mjs`: the first check (the modeled origin before the start-up move) now compares with `PRE_MOVE_BUDGET = 4_250_000` instead of 4,000,000. This is a deliberate easing of one planning figure, decided by Kyle. Unchanged and still at 4 MB: the origin after the archive move (3.73 MB now), the 64-player hard boundary after the origin move, and the failing-archive scenario. No game code or save shape changed.
- `SPEC.md` FND-10 line says the same.

## Tests

`node tools/test-storage-budget.mjs` passes. Lane tier and build: see the run log.

## Removed

Nothing.
