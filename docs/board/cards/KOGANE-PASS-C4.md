# KOGANE-PASS-C4: Kogane Pass scenery

Owner: codex. Lane: ART. Needs C1. Next: C5.
Judge: Claude, on pictures. Round 2 of at most 3. Stop after round 2.

## Scope and settled choices

Use the approved [packet](../../courses/kogane-pass.md) and
[factory course line](../../FACTORY.md#3-the-production-lines).
Scenery owns the kit rows in src/circuits/kogane-pass.js, recipes and measured
settings in tools/blender/kogane/, runtime High/LOD kits and their approved ids
in src/track-kits.js. Holds track-kit-placement for ids and wall anchoring.
Road geometry, physical script walls, pace, lake and torii keep their owners.
No new game event or sound cue. The kogane-pass switch stays dev.

Reuse firs for cedars, existing autumn maple kits, armco, concrete, lanterns,
shopfronts and Harbour lamp rows. Original recipes supply retaining stone,
curve mirror, chevron, tea house and vending row. White rail reuses the armco
mesh and its donor credit, within the same 156/72 triangle caps.

Round 2 named renderer hooks: src/world.js single-yellow centre marking;
src/track-script-scene.js opt-in kitSafetyWalls and roadKerbs options;
src/night-wash.js optional fixed lamp pools; src/vegetation.js opt-in cloned
near-tree materials. These hooks are needed to show open rail instead of
plain boxes over the collision walls, remove race kerbs, and light nearby
rail and trunks. Ordinary courses retain their defaults. Collision is exact.

Round 2 checker hooks: src/kit-footprints.js and tools/course-ground-checks.mjs
recognize white rail and retaining stone. The existing footprint contract in
tools/test-circuit-barriers.mjs also reads Kogane's measured scenery.json for
these ids, with the same .02 m tolerance. The P4 manifest stays exact.

## Claude answers: round 2, 28 October 2026

Round 1 verdict: NOT YET. It reads as a highway between concrete walls and
most views are too dark to judge.

- Edges: replace most tall grey concrete with low Japanese white steel rail
  on posts, open to forest and the drop. Concrete only outside the tightest
  hairpins. Uphill stone must show texture and moss.
- Forest: close cedars and red, orange and yellow maple groups, with visible
  trunks and fallen verge leaves. The aerial hairpin must thread dense trees.
  Keep scenery off the road and the next-turn sightline open.
- Hardware: an orange mirror on a pole, outside yellow and black chevrons,
  and orange rail reflectors at every hairpin.
- Road: two narrow lanes at the packet's unchanged width, with one Japanese
  centre line style. Codex chose solid yellow before code.
- Pictures: six views in actual upper dusk and lower night, plus daylight
  exposure companions for the car hairpin and stone wall. Show sodium pools
  on wet road and nearby lit rail and trees at night.

Approved: add the new white rail, retaining wall and other new barrier ids to
the existing footprint and barrier tables, with every limit unchanged. Rerun
the complete drive-through and fix real findings. White rail and stone are
the only new barrier ids: 4 x .85 x .349 m and 4 x 2.54 x .796 m respectively.
No extra collision boxes are needed; script walls still own collision.

Codex chose staggered stone joints and a baked 128 px mineral/moss tile;
orange donor fixing faces within the unchanged rail topology; closer fir
bands and small outside maple groups; clear zones inside hairpins; and fixed
sodium lamp pools without dynamic lights. Near-tree clones preserve the
original crown shader. Distant crowns retain their original material.

## Checks and round 2 handoff

1. Course test and actual High/LOD clearance: passed, 1,232 placements.
2. Complete drive-through: passed on Easy, Medium and Hard; zero findings
   across 1,194 grounded objects and sixteen 70/110 mph barrier probes.
3. Native browser views: passed, eight screenshots, zero warnings or errors,
   no race/profile writes and no crashes/resets through 4,190 m. No timing.

[Round 2 sheet](../looks/kogane-pass/round-2.jpg): 461,674 bytes. The requested
scratchpad copy matches exactly. Round 1 was recycled. All model caps hold;
white rail 156/72 triangles, stone 552/180. No third round started.

[Round note](../looks/kogane-pass/round-2-review.md) and
[change note](../../changes/KOGANE-PASS-C4.md) record the results, choices,
changed assertions and removals. Independent source review is clear after
two tree-material faults were fixed and confirmed.
Lane tier: all 137 selected suites passed, retaining 108 passes and recovering
only the evidence-index failure and 28 unrun suites. Production build passed
(600 modules, Vite 1.13 s). Claude's art and written assertion reviews
remain pending before integration. No merge, push or release in this lane.
