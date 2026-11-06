# TOWN-HEALTH

## Changed

Added a daily seeded health simulation for unsafe or short water, missing
latrine capacity, crowded shelter and winter canvas homes. Illness can spread
within a household, records its cause and recovers over time. Three or more
new cases raise the existing sickness report. A completed clinic treats up to
40 people per day when clean water covers the town's 15 litre daily minimum.
Health steps run once per game day and do not use graphics or browser state.

## Checks

- `node tools/test-town-health.mjs`: passed.
- `npm run build -- --outDir .qa-dist/build`: passed with Vite warnings for an existing mixed import in `src/game.js` and large chunks.
- Browser and look checks: Claude should confirm the sickness report reads
  clearly and that the map presents the outbreak pattern. No browser check was
  run in this lane.
- Lane tier: Claude runs it.
- Changed assertions: none.
- Race fingerprints and course signatures: not applicable; this is a pure town
  simulation system.

## Removed

Nothing was replaced or removed.
