# PERF-GROUND-ROWS

Status: ready for review. Branch `cloud/perf-ground-rows`, built in a cloud session (Claude), Linux container, no
browser and no laptop graphics. Nothing that is drawn changes: every height, buffer and scenery instance is
bit-for-bit what it was (evidence below).

## What changed (all exact)

- `src/rendered-ground.js`: the ground rows the reader keeps are `Float32Array`s (x, y, z per column) instead of an
  object per vertex, so a row is the same Float32 numbers the terrain buffer holds. The index of drawn quads
  (hairpins can overlap, so a lookup tests only the quads near its point) is a dense grid in compressed form (a counting
  sort: start offsets and member lists in `Int32Array`s, boxes in `Float64Array`s) instead of a `Map` of arrays of objects.
  The triangle arithmetic is the same operations in the same order; the result is still a maximum over the same
  triangles. A row the terrain drew with fewer columns than the reader wants (chase and city courses) is no longer
  rebuilt column by column: the shared columns are copied from the drawn row and only the extra ones are worked out.
- `src/world-surfaces.js`: `terrainGeometry` fills a `Float32Array` row for the reader; `farTerrainGeometry` hands its
  grid corners (heights as first computed, before the hidden-road cut and the muddy-hollow fit move any vertex, and the
  distances) to the far-terrain height reader.
- `src/far-terrain-surface.js`: the reader takes the four corners of a sample straight from that grid (array reads, no
  objects) when the geometry exists, and works them out as before when it does not or the point lies outside; corner
  queries use `lookup()` (no object per query).
- `src/landscape-detail.js`: the nearest-road test uses `lookup()`, and `foliagePoint` no longer asks the same question twice
  about the final position (it is a pure function of the point, so the answer is the same).

Not done: the cached "road within 8 m" cell grid the card suggested. For the road test to skip a cell exactly, the
cell must be far from the main road **and** from every shortcut corridor, and the shortcut test depends on where the
nearest road point lies, which can jump at hairpins, so no safe bound exists; for the courses with no shortcut it would
have saved about 1 percent. Not worth the risk.

## Proof that nothing drawn moved

New test `tools/test-ground-rows-exact.mjs` (52 s alone), written to the same pattern as `test-world-build-exact.mjs`:

- Every course: 35,000 rendered-ground heights (random points near the route and across its box, with and without
  `requireSurface`, plus points on the route) compared with `Object.is` against a plain reader kept in the test: object
  rows computed from scratch with `ribbonGroundAt` (never the rows the terrain seeded), every drawn triangle tested, no
  index.
- The far-terrain reader against a plain one (every corner from its own polyline query), both before the geometry exists
  and after, so both the worked-out and the shared-grid paths are checked.
- `tools/fixtures/ground-rows-hashes.json`, recorded on the code **before** this change (`--record` run on the
  integration tip): per course, hashes of the near terrain buffers, the far terrain buffers and every grass, tuft and
  grit instance (matrices, colours, counts, and the road-avoid counts). The new code reproduces all of them.
- The existing world-signature suites (`test-world-composition` and the rest of the lane tier) pass unchanged.

## World build time, `buildEnvironment`, milliseconds

Whole scene, a fresh process per run, the course constructed first as in the game, trees run alternately
(interleaved) and best of seven. "Pre-grass" is the code before FIX-GRASS-GROUND (`1508d596^1`, which also lacks
SUMMIT-BUILD-TIME's faster route queries); "tip" is `integration/wasteland` before this change; "mine" is this branch.
The container is shared and noisy (single runs swing 10 to 25 percent; best of seven lands within about 3 to 5), so
treat differences under about 4 percent as level. The laptop's own numbers are the real measure.

| Course | Pre-grass | Tip | This branch | Tip vs pre-grass | This branch vs pre-grass | Tip vs no-grass tip | This branch vs no-grass tip |
|---|---|---|---|---|---|---|---|
| pacific-canyon | 663 | 689 | 648 | +3.9% | -2.3% | +6.5% | +0.2% |
| high-country | 737 | 763 | 722 | +3.5% | -2.0% | +13.4% | +7.3% |
| harbor-highlands | 998 | 1046 | 1005 | +4.8% | +0.7% | +4.7% | +0.6% |
| midnight-chase | 1142 | 1204 | 1185 | +5.4% | +3.8% | +8.4% | +6.7% |
| ridge-rally | 906 | 861 | 862 | -5.0% | -4.9% | +0.0% | +0.1% |
| neon-drift-trial | 1164 | 1211 | 1123 | +4.0% | -3.5% | +7.5% | -0.4% |
| timberline-rush | 938 | 974 | 886 | +3.8% | -5.5% | +7.6% | -2.1% |
| eifel-crown | 857 | 856 | 847 | -0.1% | -1.2% | +16.1% | +14.9% |
| alpine-serpent | 722 | 742 | 668 | +2.8% | -7.5% | +17.2% | +5.5% |
| azure-riviera | 790 | 787 | 778 | -0.4% | -1.5% | +7.7% | +6.4% |
| red-mesa | 593 | 526 | 541 | -11.3% | -8.8% | +6.9% | +10.0% |
| neon-docks | 1532 | 1505 | 1461 | -1.8% | -4.6% | +1.1% | -1.9% |
| cloudbreak-skyway | 885 | 799 | 763 | -9.7% | -13.8% | +2.7% | -1.9% |
| tremblant-woods | 1240 | 1233 | 1125 | -0.6% | -9.3% | +15.3% | +5.2% |
| tremblant-snow | 1316 | 1350 | 1252 | +2.6% | -4.9% | +15.6% | +7.2% |
| harbour-lights | 1856 | 1576 | 1382 | -15.1% | -25.5% | +1.1% | -11.4% |
| panorama-ridge | 1609 | 911 | 840 | -43.4% | -47.8% | +6.7% | -1.6% |
| summit-run | 2032 | 1655 | 1538 | -18.6% | -24.3% | +10.6% | +2.8% |
| summit-time-attack | 2148 | 1596 | 1556 | -25.7% | -27.6% | +7.1% | +4.4% |

"No-grass tip" is a measuring copy of the tip with the grass change switched off (flat piece heights, no road test),
the fairest "cost of the grass fix on today's code": over all 19 courses the grass fix added **+7.8 percent** at the
tip and adds **+1.9 percent** now. Against the old pre-grass code, every course is within 5 percent (most faster, since
SUMMIT-BUILD-TIME is in). Ardennes Forest cannot be built headless here (its beeches need the prepared track kits), so it
is not in the table; its card number was already faster than before.

Where the remaining cost sits (instrumented, Tremblant Woods): about 33 ms to build the quad index once, 3 µs per ground lookup
and 1.5 µs per road query over about 15,000 pieces, in a build of 1.1 s.

## Checks

On this branch, merged with `origin/integration/wasteland`, Linux cloud container:

- `node tools/test-ground-rows-exact.mjs`: 35,076 heights plus the far reader and the 20 courses' hashes, all exact.
- Lane tier: 470 suites, 458 passed, 12 failed. All twelve also fail on the untouched front branch (the Windows-only
  suites course-kit, earned-cars-ui, full-check, drive-through, medals, salt-flats, salt-flats-art; p4-kits, compact-binaries
  and tanker-valve-source need `C:/Users/kyleb/dev/art-library` files; vesper-art needs Blender; lab-radio).
- `npm run build`: passes.
- No frame check: nothing per-frame changed (the lookups run at load; AGENTS rule 9).

## Removed

The object-per-vertex row and the `Map`-of-quad-objects index in `rendered-ground.js` (replaced in place). Nothing else.
