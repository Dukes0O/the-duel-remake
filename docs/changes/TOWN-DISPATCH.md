# TOWN-DISPATCH

## Changed

- Added a pure town dispatch module and registered its daily system and command.
- Dispatch chances use the town design's skill, vehicle, standing and difficulty
  formula, clamped from 10% to 95%, with a word label and a numeric percent.
- Crew roles give job-kind skill. Dispatch use builds training over in-game
  years, and crew age advances with town years.
- Successful scouts reveal their target map chunk and eight neighboring chunks.
  Dispatch results and 90 short voice-specific log lines are kept in town data
  and the Town's Book.
- Settled design details are recorded on the card for Claude's review.

## Checks

- `node tools/test-town-dispatch.mjs`: passed, 28 checks.
- `npm.cmd run build`: passed. Vite reported a static and dynamic import warning
  for `src/game.js` and large chunk-size warnings.
- Lane tier: not run, as assigned to Claude.
- Browser and look checks: not run, as assigned to Claude.
- Changed assertions: none. Race fingerprints and world signatures: unchanged
  and not re-recorded.

## Claude should look at

- Review each crew member's log wording and the chance label bands.
- Run the lane tier and the browser checks for the town integration.

## Removed

- Nothing. This card adds the first town dispatch implementation.
