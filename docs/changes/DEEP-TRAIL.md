# DEEP-TRAIL: the Kelp Coast loop (switch `the-deep`, dev)

Gives The Deep its first real dive. Everything stays behind `the-deep` (dev);
with it off, or with the ramp unused, Pacific Canyon runs exactly as before
(replays and fingerprints are checked by the lane guards and by the new test).

## What was built

- `src/deep/zones/kelp-coast.js`: `kelpCoastProvider(ramp)` returns the zone as
  plain data. The loop is authored in the ramp's own frame (straight out from
  the ramp's foot, and to its left) and turned into world metres per route, so
  one shape fits Routes A, B and C. About 3.08 km in 379 points, 8 m apart:
  a stem straight out over open sand and seagrass (Ramp Shallows, 5.8 to
  9.8 m deep), a ring offshore, west through The Kelp Forest (10.9 to 19.5 m,
  `kelp` 1), round the far end and east along The Drop-off lip (20.1 to
  25.6 m, `rock` 0.95, 14 m wide), round the east end and back down a second
  lane. Widths are 14 to 20 m. The tightest bend is 34.7 m (a 25 m limit); the
  ring's bends are 60 m and more.
- Two gullies from the trail's own depths: 32 m stretches, 3 m deeper, lips
  either side, one in the shallows and one in the forest.
- Pearls `kelp-1` (shallows), `kelp-2` (forest), `kelp-3` (on the lip);
  creature spots for the seven Kelp Coast creatures (turtle, ray and crab in
  the shallows; sardines, sea lion and otter in the forest; whale at the lip);
  the six finds in story order: the badge 24 m from the ramp's foot,
  steering wheel and front wheel in the forest, the bonnet at the forest's
  edge, the door on the lip, and `sirena-car` on the ledge with `below: 3`.
- `src/deep/deep-zone.js`: the optional `finds` field (ids unique, `trailIndex`
  in bounds, `offset` and `below` finite, `below` 0 to 10, `below` defaults to 0).
  A zone without it loads exactly as before (no `finds` key).
- `src/main.js`: one line passing the provider to `App` (`deepProviders`).

Four design calls (6 m width at the ramp's foot, the V turn at the foot, no
title for the returning forest stretch, deep water beyond the lip left to the
look) were approved by Claude; the answers are on the DEEP-TRAIL card, and
DEEP-SIRENA-VIEW now says the seaward side of the lip must read as a real drop.

## Changed assertions (for Claude's written review, AGENTS rule 18)

Both follow from the card's own hooks; neither loosens what the test checks.

- `tools/test-career-backup.mjs`: finds the app construction with
  `new App(` instead of `new App()`, because `src/main.js` now passes
  `{deepProviders:[kelpCoastProvider]}`. The check is still that the browser entry
  backs up raw and imported careers before `App` can migrate.
- `tools/test-deep-look.mjs`: the approved-import list gains four exact
  entries (`src/main.js` importing `./deep/zones/kelp-coast.js`, and the new
  test importing `deep-ramp.js`, `deep-zone.js` and `zones/kelp-coast.js`). Every
  other `src/deep` import is still refused.

## Checks (Linux cloud)

- `tools/test-deep-kelp-coast.mjs` (new, 8 tests): the zone loads on all three
  routes and matches its ramp; loop length, widths, depths per place and bend
  radii in range; two gullies in the right places and lengths; every trail
  point (and 3 m either side of its width, every 4 m) passes the dry-terrain
  check on all three routes; pearl, spot and find counts, ids and places, the
  badge within 40 m of the foot, `sirena-car` 3 m below; `main.js` passes the
  provider; the switch off and the unused ramp leave Pacific Canyon identical to
  no provider; a real dive on each route, a Node drive of the whole loop on the
  sea-floor surface at 40 mph without leaving the trail, then up the ramp and out.
- `tools/test-deep-zone-format.mjs`: 2 new `finds` cases (11 existing unchanged).
- Lane tier `--changed --jobs 8 --keep-going`: 26 of 29 suites pass, including the
  replay, world-signature and Deep suites (`test-deep-zone`, `-ramp`, `-save`,
  `-look`, `-audio`). The three failures are Windows-only and unrelated:
  `test-earned-cars-ui`, `test-medals` and `test-course-kit` ("test cleanup
  requires the Recycle Bin"). `npm run build` passes. The two changed assertions
  above were found by the lane tier and fixed.
- Not run here: those three suites, the full tier, and every browser scenario
  (none was needed or added by this card).

## Removed

Nothing. The test-only `test-kelp` zone stays in `tools/test-deep-zone.mjs`,
which checks the format.
