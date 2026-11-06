# TOWN-DISPATCH

## Changed

- Added a pure town dispatch module and registered its daily system and command.
- Dispatch chances use the town design's skill, vehicle, standing and difficulty
  formula, clamped from 10% to 95%, with a word label and a numeric percent.
- Crew roles give job-kind skill. Dispatch use builds training over in-game
  years, and crew age advances with town years.
- Successful scouts reveal their target map chunk and eight neighboring chunks.
  Failed jobs stay open with their stage and progress, release the crew to rest,
  and can be retried by another crew member against the same job id.
- Dispatch results keep the latest 40 entries, with lifetime and yearly totals
  by kind. Yearly totals appear in the Book and are then cleared. The Book gets
  first-of-kind entries, failures and rescues, rather than every success.
- Delivered trade trucks leave the active list; `tradeRuns` preserves the count.
  Older saves trim completed dispatches and delivered trucks when loaded.
- Settled design details are recorded on the card for Claude's review.

## Checks

- `node tools/test-town-dispatch.mjs`: passed, 44 checks, including failed scout
  retry and a 30-year daily dispatch and trade save under 5 MB.
- `node tools/test-town-outposts.mjs`: passed, including delivered truck cleanup
  and old-save trimming.
- `node tools/test-town-farm.mjs`: passed, 27 checks.
- `node tools/test-town-core.mjs`: passed, 638 checks; 100,000 ticks repeat.
- `npm.cmd run build`: passed. Vite reported a static and dynamic import warning
  for `src/game.js` and large chunk-size warnings.
- Lane tier: not run, as assigned to Claude.
- Browser and look checks: not run, as assigned to Claude. Claude should check
  that the town UI exposes retry for an open dispatch and confirms the same job
  remains on the map/report after failure.
- Changed assertions: added regression assertions for open retry, preserved
  stage and progress, crew rest, bounded history, old-save trimming, delivered
  truck removal and the 30-year save budget. Existing assertions were unchanged.
  Race fingerprints and world signatures: unchanged and not re-recorded.

## Claude should look at

- Check the failed-dispatch retry in the town UI and the annual Book total.
- Run the lane tier and browser checks for the town integration.

## Removed

- Removed unbounded completed-dispatch records and delivered trucks from the
  active lists; durable totals and the Town's Book retain the useful history.
