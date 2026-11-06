# TOWN-PACE

## Changed

- Moved arrival pace tuning values into `src/town/content/pace.js`. The monthly arrival target now starts at one person in Year 1 and keeps rising with mood and game year. This targets the roughly 30 people by the first winter and roughly 100 by Year 2 in `docs/WASTELAND_TOWN.md`, section 2. The rate has no ceiling.
- Added a ten-seed player-path check for the first winter and first two years. It reads NEXT, uses the real test-pit and well commands, and waits for those jobs to complete. It also checks a town that ignores NEXT and a supported town that loses people under neglect then recovers.
- Added the requested 30-year, ten-seed soak. It records population, buildings, book and Old Ground entries, saved bytes and elapsed simulation time each year. It checks that saved bytes per retained record do not more than double and yearly sim time per resident does not more than quadruple from Year 1. These trend checks allow unlimited town growth. It also checks the 10,000-person, 5,000-building daily target from section 10.
- The current town code does not yet connect food and housing construction to population conditions. The pace player therefore starts with the founders' basic provisions, follows the available pit and well NEXT actions, then models the measured support state after later services are built.
- The tuning values are game-balance values derived from the milestone ranges in section 2, not claims about real-world rates.

## Checks

- `node tools/test-town-pace.mjs`: passed, 155 checks across ten seeds. First winter: 20 to 21 people. Year 1: 22 to 23. Year 2: 82 to 87.
- `node tools/soak-town.mjs`: an initial run passed 32 checks across ten seeds and 30 game years. Year 30 populations were 5,758 to 6,004; the largest save was 17,686,521 bytes; the slowest full 30-year run took 62,670.5 ms. The 10,000-person, 5,000-building day took 8.25 ms, under the 30 ms target. After adding save-size and sim-time trend assertions, the updated run exceeded the 30-minute investigation limit and was stopped without output; those new assertions remain unverified.
- `npm.cmd run build`: passed. Vite reported the existing `src/game.js` static/dynamic import warning and large-chunk warnings.
- Browser and look checks: Claude to run. Please check that NEXT stays useful for a player who ignores it, and that the first-winter and Year 2 population milestones feel right in a played town.
- Lane tier: Claude to run as requested.

## Changed assertions

No existing assertions changed. New pace and soak checks were added for this card.

## Race fingerprints

Not applicable. This change only touches the Wasteland town simulation and content.

## Removed

None.
