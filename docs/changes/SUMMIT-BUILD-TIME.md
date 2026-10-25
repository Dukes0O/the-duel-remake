---
task: SUMMIT-BUILD-TIME
status: done
player_facing: no
---

# SUMMIT-BUILD-TIME: Summit's world builds in about 0.85 s, not 1.45 s

Claude (Sonnet 5.5 side session), 25 October 2026. Card
`docs/board/cards/SUMMIT-BUILD-TIME.md` (its old process sections are not
followed; this note follows AGENTS.md Gates). Nothing that is drawn changes:
every course's world is bit-for-bit what it was (evidence below).

## Result

Same laptop, same recipe, eight cars on Summit Finish, headed, one run per
quality (the Summit selector of `e5f24864` merged into a measuring copy only,
once on the integration tip and once on this branch, back to back):

| | Integration tip | This branch |
| --- | --- | --- |
| World build, High | 1444 ms | **845 ms** |
| World build, Performance | 1451 ms | **890 ms** |
| p95, High / Performance | 18.7 / 18.4 ms | 18.8 / 18.2 ms |
| Full first load, High / Performance | 7.3 / 5.0 s | 6.7 / 4.4 s |

- The limit is under 1000 ms: **met at both qualities**, with about 11% to 15%
  to spare.
- **p95 is not a result of this change and I cannot certify it.** Frames are
  drawn exactly as before, and both columns read the same (18.2 to 18.8 ms, p50
  17.5 to 17.7). The release check read 16.8 ms. I could not switch the
  laptop's own screen off (Win+P is a system setting; I do not change those)
  and Kyle's Chrome windows were open, so these p95 figures are above the
  environment of the 16.8 run, in both columns. Rule 8 wants the quiet run
  with the panel off; the world build number does not depend on it, the p95
  number does. High read 18.8 and 18.7 against the limit of 18.5.
- Headless browser runs (first page load, 2 to 3 repeats): about 1420 to 1555
  ms before, 840 to 1000 ms after. Node, the same build without a browser:
  1333 to 1540 ms before, about 790 ms after; without the snow, 969 to 1031 ms
  before and about 595 ms after.

## What grew, measured

A CPU profile of the real build in the browser (unminified QA bundle, 200 µs
samples) and of the same build in Node, High, before any change (about 1430
ms in `buildEnvironment`):

| Part | ms |
| --- | --- |
| The always-on snow's coverage of the ground (`applySnowTerrain`, a nearest-road query for every one of 298,000 vertices) | 430 |
| Far terrain (206,000 vertices: a route query, the ground height, the tint) | 470 |
| Near terrain ribbon (92,000 vertices) | 240 |
| Landscape detail (grass, grit, stones) | 107 |
| Snow world (ponds, plough banks, poles) | 77 |
| Everything else (strips, structures, scenery) | about 100 |

Inside those, the cost was spread over a few helpers that run hundreds of
thousands of times: the route index query (about 28% of the build), building
a whole road frame (with its height and tunnel test) when only four numbers
were needed, parsing the same few tint colours once per vertex, and
three.js's normals pass. The post-scatter scenery filter is before the
timer; the Gallery corner fit is 5 ms. Neither grew the build.

## Changed (all exact; nothing drawn differs)

- `src/polyline-index.js`: the route index query walks flat arrays instead of
  closures and recursion, remembers the last answer's segment as a first guess
  (a guess never changes the answer, since every other segment still has to
  lose to it), and has `lookup()`, the same answer without a new object per
  query. `query()` is unchanged for callers.
- `src/course.js`: `nearest()` takes its three Newton steps from the road
  samples directly (`_refineS`) instead of building a whole frame each time;
  `nearestS(x, z)` is `nearest(x, z).s` without the rest; `at()` splits into
  `_frame()` (no tunnel test) and the tunnel flag, and `worldAt()` uses
  `_frame()`; `phase()` is written as comparisons; `_relief()` finds its
  section once, works out the wave terms once per call, and, when a stretch
  blends a ground type with itself, uses that type (`a + (a - a) * t` is `a`).
  A course whose `at` was replaced (tests do this) keeps the old path.
- `src/snow-world.js`, `src/world.js`: the snow coverage and the foliage test
  call `nearestS`.
- `src/world-surfaces.js` and the new `src/fast-normals.js`: the terrain,
  far terrain, strips and plough banks compute vertex normals with the same
  arithmetic as three.js `computeVertexNormals`, on the arrays directly; the
  far terrain's quad test no longer builds an array per vertex.
- `src/terrain-style.js`: the five tint colours are parsed once (keyed by
  colour management mode).
- `src/circuit-hills.js`: a point certainly past a basin's fade skips the
  angle and sine work (`basinOutOfReach`).
- `src/ribbon-ground.js`: a column whose nearest route segment is already
  farther than the "another road is nearer" limit returns at once; the full
  `nearest()` runs only when it could matter.

## Proof that nothing drawn changed

- `tools/test-world-build-exact.mjs` (new, 156,726 checks) compares each
  change with a short copy of the old arithmetic, bit for bit: the nearest
  road point (every course, near and far points), `nearestS`, `worldAt`,
  `phase`, the frame's fields and their order, a replaced `at`, the new
  normals against three.js (Summit terrain and far terrain, plus a mesh with
  unused vertices and a degenerate face), Summit's snow coverage on both
  meshes against the plain nearest-point rule (including that it is part
  winter and part not), the terrain tint on every course with colour
  management on and off, the ribbon rule on five courses (with Summit really
  lowering columns), and the basin shortcut against `basinGround`. Two
  deliberate breaks (the Newton step's lower bound, one normal's rounding)
  each made it fail.
- `tools/test-polyline-index.mjs` gained `lookup` agreement on every query and
  a case that asks the same points in different orders (near, far, back).
- All 23 events were built with and without snow before and after (Node,
  with the real track kits) and every drawn attribute, index, group, material
  and instance matrix hashed: **identical for all 26 builds**, which includes
  Summit and Summit Time Attack with the snow on. (`salt-flats` is its own
  scene and was not touched.) `test-world-composition` (the reviewed
  signatures) is in the lane run below.

## Changed assertions

None. Added: the lookup and history cases in `test-polyline-index.mjs`.

## Removed

Nothing.

## Checks

- `node tools/test-world-build-exact.mjs`: 156,726 checks passed.
- `node tools/test-polyline-index.mjs`: passed (269,799 checks).
- Lane tier and build: see the end of this note.
- Frame check: as in Result. One run per quality; measuring copies in scratch
  worktrees, deleted.

## Not done

- The p95 under quiet conditions (panel off) is for Kyle's step or the full
  check; it is unaffected by this change.
- Ideas I did not take because they could change a result or move work around
  the measure rather than remove it: computing the far hills' snow coverage
  from the far mesh's coarser route query (not exact near a hairpin), and
  filling the far terrain after `build()` while the shaders compile (the build
  number would drop, the load would not).

## Lane tier and build

(Filled in at the end of the card.)
