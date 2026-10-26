# SUMMIT-GROUND-GAPS

Status: built and reviewed; two existing checks need Director disposition. Scenery repair;
existing `summit-run` switch. No merge, push or live installation in this lane.

## Design

Follow Claude's card: fill the visible hillside beneath the upper switchbacks,
join cliffs to ground, and keep all road geometry, collision and race rules exact.
Kyle's five originals (15–19.webp) were inspected before source work. Their
areas are Desert Foothills, Pine Switchbacks, Snowfields and the Gallery.
The fifth picture also shows a separate gallery-wall issue owned by
SUMMIT-TUNNEL-WALL; this lane checks its surrounding ground only.

Checks: matched five-view native browser comparison, drive-through on Summit,
manual `node tools/test-circuits.mjs`, lane tier with four jobs, production build.
No frame timing; Claude checks scene cost before release if needed.

## Cause and repair

The far terrain omitted every 16 m cell with a corner within 40 m of any road.
The near-road ribbon covered that opening from above, but its single-sided
surface was invisible from a lower switchback. This exposed sky beneath the
upper road and its scenery. Simply filling the cells also exposed coarse
terrain above the asphalt, so the completed repair has three parts:

- Summit opts into continuous backing beneath the road ribbons.
- Backing corners stay below all nearby main-road and branch samples.
- Outward-facing sides close each ribbon onto a buried floor. Segments near
  another road or the Gallery branch are omitted to keep that road clear.

Owned runtime files: `src/circuits/summit-run.js`, `src/world-surfaces.js`,
`src/far-terrain-surface.js`. Both Summit events inherit the repaired scenery.
Terrain verification also owns `tools/test-ground-rows-exact.mjs` and
`tools/fixtures/ground-rows-hashes.json`, plus the card's new regression and
comparison recipes.
No road samples, physical features, random sequence, saves or race rules change.
The driveable hillside remains driveable; the new faces have no collision.

## Pictures and review

`docs/board/looks/summit/round-1.jpg` is 277,463 bytes. It compares the same
five native camera poses before/after at seed 1989, High quality, with authored
lighting and approved kits. The poses reconstruct the areas in Kyle's pictures
15–19; the originals do not contain exact saved camera coordinates. The Gallery
pose is centered on the road, so it does not reproduce Kyle's side-on wall view.
That wall is SUMMIT-TUNNEL-WALL's responsibility.

Independent code review found branch penetration and an endpoint-only skirt
gap. Both were fixed and confirmed. Native inspection also caught a folded
skirt crossing the lower snow road; the road-margin exclusion fixes it.
Final independent picture review: openings filled, scenery supported, cliffs
join ground; no ground-gap defect visible in the five views. Gallery unchanged.
The reviewed sheet supports refreshing the two Summit scene signatures.

## Checks and assertions

- New focused regression passes: unchanged road samples and physical features;
  main-road and branch backing clearance every 2 m; local hillside support rays;
  upward headroom rays every 4 m. No existing assertion was loosened.
- Manual `node tools/test-circuits.mjs`: PASS, 174,850 checks, 23 events, four seeds.
- Native browser comparison: PASS, 10 pictures, memory-only, no warnings/errors.
- Drive-through: ground PASS (106,650 road samples); three laps complete, but
  overall FAIL at Glacier Hairpin, s=8565.152, lateral=6.0023–6.0024 against a
  6 m edge. A single baseline run with the scenery repair disabled reproduces
  every issue, lap time and ground result exactly. Director follow-up required;
  this lane does not change the driver, physics or assertion to hide it.
- Initial lane tier: 45 passed, one expected-reference failure in
  `test-ground-rows-exact`, 29 unrun, four jobs, 389.1 s. The old reference
  demanded the removed Summit cutouts. Its continuous-ground branch now
  compares the sampler to an independently built actual Float32 mesh, both
  before and after grid seeding, with strict `Object.is` unchanged. Other
  courses retain the old reference. Record run: PASS, 35,056 exact comparisons.
  Failed/unrun continuation: 29/31 passed, zero unrun, four jobs, 289.6 s.
  The sheet's original filename failed placement; renaming it to `round-1.jpg`
  fixes that check (unchanged hygiene suite PASS). Across the final selection,
  75/76 suites pass; only `test-yeti.mjs` remains failed. Its legacy
  GP-career-off fixture inherits integration's newly-on career flag and gets
  2,160 credits instead of its expected 1,400. Disabling this scenery repair
  reproduces that exact assertion and location. No Yeti, reward, save or
  feature-flag code/assertion was edited; Director follow-up required.
- Replay fingerprints: PASS, 225 checks, 25 cases, 23 events, nine categories,
  three frame rates and three repeats; every existing pin unchanged.
- `npm run build`: PASS, 1.13 s, System32 first on PATH. Existing chunk-size
  and ineffective-dynamic-import warnings only. No frame timing.

Changed existing assertions: the expected complete-scene hash for `summit-run`
and `summit-time-attack` changes from `717f2986…` to `fa6b9ba2…`, for the
reviewed backing and joined cliff faces. Node/mesh/instance/resource counts
stay exact. Both signatures were captured from the real definitions; all
other scene baselines remain unchanged. No replay pin is changed.

The strict terrain/scenery component pins also change, only for the two Summit
events, after the same reviewed pictures. Each event has these three changes:

- Near terrain `88df680e…` → `84562638…`: joined ribbon side faces.
- Far terrain `621f020a…` → `69a91699…`: complete backing below all roads.
- Scenery `70d7b189…` → `1a05c479…`: tufts seat on the repaired drawn surface.

Cell counts and road-avoidance counts are unchanged. Independent review of
the reference and fixture changes passes; no assertion or tolerance is removed
or loosened. Claude's written review of these expectation updates is pending.
Cockpit task T-056 links this card under Mountain courses; board sync owns status.

Open before merge/release: Director disposition of the existing drive-through
and Yeti fixture failures, Claude's test/scene-pin review, and Claude's Summit frame check because
terrain cost changed. No timing was run in the lane.

## Removed

Removed the Summit-only cutouts beneath upper roads; other courses retain
their original terrain. No superseded runtime asset or alternate code path
was kept. Raw comparison pictures are recycled after the committed sheet and
review verdict; Kyle's originals are untouched.
Generated QA/production bundles, superseded comparison attempts and the scratch
Cockpit-link script were recycled. Only the compact sheet, recipes and the
small gate/build/baseline reports needed for handoff remain.
