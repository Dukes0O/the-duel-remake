# OPEN-T-LIGHTS

- Lights on the Whites plays under `story-choices` (`dev`), with timed lamps and white haze, the seeded Bell Buoy, sounding crew, the Patience ladder and watch, and the original dialogue.
- Rescue by car is reusable: seat-limited loads, waiting or guided pickups, and a search after the lamp expires. The outward drive and sounding use reach, and the walking line uses escort.
- The published shared-day decision in OPEN-APPRENTICE-RUN supplies dark and the outing hook. Its branch is awaiting merge. The Five Cold Nights watch bargain and promise/raid settlement still need their act hooks.
- Node 22.23.5, memory only. The guided rescue completed through the app simulation on `86d6a0883`. The named laptop scenario also parses every page string.
- Rule 23 plus the affected open-land, deck, and scenario suites passed 15/15 on `de657c963`. Core passed 804 checks, race replays 306, combat replays 12, and world composition 65.
- The focused rerun passed 7/7 on `bec72e2bd`, including all three guards. `npm run build` passed on that commit with Vite's chunk-size warning. The PR has the exact filter commands.
- `node tools/thread-crossings.mjs --check` reports Lights sound and exits 1 with the same two Burned Camp gaps (`alone`, `drain`) as `158b4ee6d`. Board and repo-hygiene checks passed.
- **Changed assertions** None in existing suites. The dialogue counts and replay and composition pins are unchanged.
- **Look owed** Astra should review the warm points against white haze, the lopsided buoy and bell, the cart and lamp, the borrowed crew figures, and the three salt-scoured hulls and rigging.
- **Sound owed** OPEN-SOUND has `open.lamps.seen`, `open.lamp.out`, `open.haze.down`, `open.basket.lit`, `open.buoy.bell`, `open.crew.aboard` and `open.site.found`.
- **For Claude to run** `node tools/run-browser-scenarios.mjs --scenarios open-lights-on-the-whites --jobs 1`, the merged-batch hand drive and look/listening pass, and `npm run build` after merging.
- Merge `8797de752` settled in `07bece773`; `eb81a0207` preserves both named cue moments and ordered route moments. Memory-only checks: 18/19 requested suites passed (11 affected suites rerun on `eb81a0207`, the other seven on `07bece773`); core 804, race replays 306, combat replays 12, world composition 65, and build passed on `eb81a0207` (dynamic-import and chunk-size warnings). `test-open-sites` fails at the second Bell Buoy (`ships-in-sand, 3800, 250`): `roadWay` returns null for nearest `ridge-spur` access; buoy coordinates and road/way/ground files are unchanged from pre-merge `5209c1484`. No assertions changed; no browser scenarios ran.
- **Removed** None.
