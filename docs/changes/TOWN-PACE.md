# TOWN-PACE

## Changed

- Moved arrival pace tuning values into `src/town/content/pace.js`. The monthly arrival target now starts at one person in Year 1 and keeps rising with mood and game year. This targets the roughly 30 people by the first winter and roughly 100 by Year 2 in `docs/WASTELAND_TOWN.md`, section 2. The rate has no ceiling.
- Added a ten-seed pace check for the first winter and first two years, a town that ignores NEXT, and a supported town that loses people under neglect then recovers.
- Added the requested 30-year, ten-seed soak. It records population, buildings, book and Old Ground entries, saved bytes and elapsed simulation time each year. It also checks the 10,000-person, 5,000-building daily target from section 10.
- The tuning values are game-balance values derived from the milestone ranges in section 2, not claims about real-world rates.

## Checks

- `node tools/test-town-pace.mjs`: passed, 45 checks across ten seeds. First winter: 22 people for all seeds. Year 1: 28 for all seeds. Year 2: 90 to 95.
- `node tools/soak-town.mjs`: passed, 32 checks across ten seeds and 30 game years. Year 30 populations were 5,758 to 6,004; the largest save was 17,686,521 bytes; the slowest full 30-year run took 62,670.5 ms. The 10,000-person, 5,000-building day took 8.25 ms, under the 30 ms target.
- `npm.cmd run build`: passed. Vite reported the existing `src/game.js` static/dynamic import warning and large-chunk warnings.
- Browser and look checks: Claude to run. Please check that NEXT stays useful for a player who ignores it, and that the first-winter and Year 2 population milestones feel right in a played town.
- Lane tier: Claude to run as requested.

## Changed assertions

None. This card adds new acceptance checks and does not change existing assertions.

## Race fingerprints

Not applicable. This change only touches the Wasteland town simulation and content.

## Removed

None.
