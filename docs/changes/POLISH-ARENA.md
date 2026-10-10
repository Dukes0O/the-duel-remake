# POLISH-ARENA

Status: round 2 of 2 approved FINAL by Claude/Kyle on 10 October 2026. Labels approved by Claude/Kyle on 10 October;
the other three round-1 differences were too subtle. No label or rule changes.

## Design settled before code
- Add approved wreck-shell and loose-part stacks only inside the solid inner island.
  Rebuild the existing recipe; Course geometry and driving band stay unchanged.
- Vary seeded salt ridge width from 0.65 to 1.65 of its existing width.
  Keep the atlas and outside-ground shader in step; unchanged band tint and relief scale.
- Keep distant tanker warning lamps at readable size and a brighter roof plate.
  Near geometry and lamp timing remain unchanged.
- Pack floating label rectangles vertically with a 6 px gap after measuring text.
  Clamp complete labels within the viewport; race state is read only.
- Director added the combat-hud.js positioning hook, focused test/browser scenario,
  round sheet/review paths and the rebuilt Salt GLB. No new sound event.

## Round 2 design settled before code
- Keep all six current island footprints. Add 45 approved wheel-less shells
  in three roof-supported tapered stacks, about 9 m high: 48 -> 93 shells compared
  with round 1. All new geometry stays behind the existing island barrier.
- Make seeded crust ridges visibly narrow or broad (about 0.10 to 0.96 m);
  preserve the Course, driving-band tint, boundary solids and relief rules.
- Give far tanker lenses separate bright emission with the same native on/off
  signal; strengthen the roof plate's textured contrast. Near view unchanged.
- Compare released art at 3af7f15c against round 2 in both qualities. Show the
  uncropped native tanker at 85-90 m first; any inset must be labeled.
- Director approved this design. Show actual visual differences before changing
  exact GLB or LOD test pins. Broad lane gate waits for final art approval.

## Round 1 verification
- Focused label test: 18 center/edge fixtures; native tanker LOD and disposal pass.
- Existing native Salt boundary suite: 29/29; Course envelopes unchanged.
- Actual memory-only browser, both qualities: 8 matched views, zero errors/warnings;
  each rendered pose leaves race state byte-identical; clustered labels have gaps.
- Quiet paired frame capture: 240 real rAF intervals per quality/version at the frozen matched convoy pose.
  High P95 16.8 -> 16.8 ms; Performance 16.8 -> 16.8 ms (10% limit passes).
  Means 16.67 ms. Native draw calls 599 -> 612 High, 332 -> 332 Performance.
- Director independently reviewed source and viewed sheet on 9 October: clear;
  approved exact asset SHA/triangle pins for the shown visual difference.
- Salt GLB SHA256: 7520ed6b33959af8bc1c97a76275704bfe72caea06be24c093e27018430ded92.
  Mesh draws stay 172; triangles 184,340 -> 200,420. GLB grows 1,746,780 bytes
  for the two approved donor scrap stacks and regenerated salt atlas.
- Changed assertions: only exact SHA/triangle pins in salt-flats-render/effects,
  approved after visual review; no tolerances or race fingerprints regenerated.
- First lane run found an incomplete DOM double in test-arsenal-wave3:
  getBoundingClientRect was missing. Director approved adding fixed rectangles
  to that double. Existing Tesla/recharge assertions and tolerances stay exact.
- Lane tier rerun: 364 passed, zero failed (824.16 s); npm run build passed.
  Focused repaired DOM-double suite: 99/99. Build and gate logs are in evidence.
- Sheet: docs/board/looks/polish-arena/round-1.jpg (443,390 bytes).
  Raw files live under integration .evidence/2026-10-09/POLISH-ARENA/.

## Round 2 verification
- Director reviewed matched native frames on 10 October: taller stacks, narrow
  and broad ridges, and lit distant lamps/roof visibly differ from released art.
  Technical asset-pin approval preceded Claude/Kyle final art approval.
- Native boundary acceptance: unchanged 29/29. Native render and outside effects:
  8/8 each. Label fixtures: unchanged 18/18. Build passed.
- Exact asset pins updated after visual review: SHA256
  f85c07082ab80e6b6c751ab97bd0bce570e80e5dde8a4f4fc100a5c0181e7449;
  232,100 triangles and unchanged 172 draws. Runtime GLB 28,308,656 bytes
  (round 1: 25,030,172). Growth is the 45 approved donor shells and new atlas.
- Director separately approved replacing far-lamp shared-material/1.6-scale
  assertions with distinct-material/3-scale assertions. Exact near intensity
  1.2, far intensity 4.5, off 0, tell color and flash timing now checked together.
  Shared textures, plate emission and disposal pass. No tolerances loosened.
- Matched seed-1989 native High/Performance screenshots: zero browser errors or
  warnings; all six rendered poses leave race state byte-identical. Course,
  physical rules, labels, RNG and replay assertions are unchanged.
- Sheet keeps the full native tanker frame first, then a labeled 3.5x detail.
  Private fixture pins camera position before drawing to avoid vertical damping
  in distance witnesses. Both versions require two lit far lamps at 85-90 m.
- Height combination review: stacks remain unreachable to vehicles (unchanged
  arena clamp +/-18; UFO destinations +/-16; fighters/boarding stay within
  +/-20.66). The 9.03 m stacks are scenery without Course colliders. Projectiles
  can pass through them, as through the existing visual-only island salvage.
  Director accepted this existing presentation limitation; no physics edit.
- Quiet actual released/candidate pair: 240 rAF intervals each per quality.
  High P95 16.8 -> 16.8 ms; Performance 16.8 -> 16.8 ms. Means 16.667 ms;
  unchanged +10% frame limit passes. Native camera exactly 89.16794 m for both
  versions/qualities, with two lit far lamps; zero warnings/errors.
  High calls 488 -> 488; Performance 299 -> 312. Final private baseline removed.
  Final c911a420 sync: lane 369/369 passed in 618.11 s; production build passed.
- Recipes: tools/scenarios/polish-arena.mjs and tools/art/polish-arena-sheet.py.
  Sheet: docs/board/looks/polish-arena/round-2.jpg. Raw review evidence:
  integration .evidence/2026-10-10/POLISH-ARENA/.

## Integration sync
- ac01cbe6 (Height and accepted Seekers) merged cleanly into this lane.
  Final art approval is recorded with this real sync, not a status-only commit.
  Focused Arena/labels/tanker and Salt render/effects pass; Height confirms
  43,745 unchanged grounded sweeps and 21 native car crossings.
- Merge order remains Smoke, Flame, Arena. Final Arena gate/build runs only
  after the Flame merge and latest integration sync; no release work in this lane.
- Final c911a420 sync is clean; approved round-2 runtime/art remains unchanged.
  First fresh lane stopped at 188 pass / 1 fail: the older native tanker fixture
  still required shared warning materials and far intensity 1.2. Director approved
  its hook and exact distinct-material / near 1.2 / far 4.5 expectations. Native
  geometry/atlas, all eight valve states, tell timing, other surfaces and disposal
  retain coverage; no runtime or tolerance change. Focused native checks: 62/62.
  Fresh lane: 369 passed, 0 failed/unrun (618.11 s); npm run build passed.

## Removed
Replace the current Salt GLB in place. No duplicate runtime asset or old label path.
