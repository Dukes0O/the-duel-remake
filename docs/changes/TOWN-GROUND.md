# TOWN-GROUND

## Changed

- Added a pure, seed-and-location based groundwater field. Its depth and daily
  yield stay unknown until a test pit finishes.
- Added town commands to start a three-day test pit, build a well from a tested
  site, and draw water from a well. Well digging takes one game day per metre
  of tested depth, rounded up.
- Added daily well recovery and drawdown. A dry spell lowers the local water
  table and slows recovery.
- Registered the ground system and exported `groundWaterAt` from the town entry.
- Settled the open well work-rate choice on the card for Claude's review.

## Checks

- `node tools/test-town-ground.mjs`: passed. It covers hidden discoveries,
  same-seed repeatability, seed variation, pit timing, depth-based well work,
  drawdown, recovery, drought depth and save/load.
- `npm.cmd run build`: passed. Vite reported its existing dynamic-import and
  large-chunk warnings.
- Lane tier, browser scenario and look check: Claude owns these checks.
- Race fingerprints and course world signatures: not measured; this sim-only
  card does not change race code or course data.
- No existing test assertions changed.

## Claude should review

- Check the groundwater depth and yield range against the Wasteland town
  design, including whether the creek-shaped field feels right.
- Review one-day-per-metre well work time and the plain command messages.
- Browser and look checks are not applicable to this pure simulation card.

## Removed

- Nothing was replaced.
