# LAB-ART, the Lab hangar and its benches: look rounds (24 October 2026)

All models are original, written by `tools/art/lab-props.mjs` (recipes in
`lab-hangar.mjs`, `lab-dressing.mjs`, `lab-benches.mjs`, `lab-benches2.mjs`,
`lab-benches3.mjs`, a small kit in `lab-kit.mjs` and `lab-common.mjs`) into `public/assets/models/lab/`: one GLB for
the hangar and one per bench, plus `manifest.json` with where each bench stands
and every movable part's pivot. No downloaded model or texture. Sheets are
rendered in Blender:

```
node tools/art/lab-props.mjs --review .evidence/lab
blender -b --factory-startup --python tools/blender/lab-review.py -- --root . --glb .evidence/lab/layout.glb --out .evidence/lab/<round>/layout --views overview,back-wall,left-side,right-side,weigh-pad
blender ... --glb .evidence/lab/layout-closed.glb --out .evidence/lab/<round>/layout-closed --views door
blender ... --glb .evidence/lab/<bench>.glb --out .evidence/lab/<round>/<bench> --views three-quarter
python tools/art/lab-sheet.py .evidence/lab/<round> docs/board/looks/lab/round-<n>.jpg "<title>"
```

## Round 1 (sheet removed when round 2 was committed; one version per binary)

Claude's verdict: hangar shell, rust streaks, floor stains, weighing pad, fire
pit, drop tower, pendulum, rotor stand, map table and snow trays right; the Node
recipe is fine. Round 2: a real wind tunnel, a lived-in workshop, a sturdier
launcher, more floor wear and warm work lights over each bench.

## Round 2

1. **Wind tunnel:** a thick lofted duct about 11.6 m long: a flared, rolled
   bellmouth with a honeycomb screen and the smoke rake in it, a glass test
   section (steel frame, two big windows each side, rolling road with four wheel
   scales and restraint struts) built for a car and a half, a diffuser, a flanged
   fan housing with a nine-blade fan behind a caged guard, a motor pod, saddles
   and a plinth; the control desk with the fan dial and the REVERSE switch (its own
   part) on the near side.
2. **Lived-in workshop:** two long workbenches (drawers, vices, grinder, drill
   press) under a bigger pegboard with 33 tools and a shelf of parts bins, a red
   and a blue rolling tool chest, a spare rotor blade on wall brackets, a parts
   rack with tyres, oil drums and a drip tray, a coffee corner (fridge, table,
   kettle, mugs, tin, a shelf of mugs), cable runs with yellow ramps. The
   walkways between benches stay clear: the test checks that no two benches
   overlap.
3. **Launcher:** a steel tripod with a hinge head, a 90 degree angle quadrant
   with a tick every 5 degrees, a pneumatic barrel (breech block, sight rail,
   muzzle ring) tilting about the head, an air tank on a cradle with a hose and
   pressure dial, a 3 m tape and cones.
4. **Floor and light:** oil spots with crisp edges, patched concrete, rust-brown
   stains, tyre-mark pairs from the open door to the pad and the benches, joints
   and safety lines as strips; a warm work lamp over each station (16 in all)
   with a warm tint on the floor beneath.

Also: the snow trays moved beside the pad (turned to face it) to make room for the
longer tunnel; the map table's frame and instruments now follow its sloped top.

Sizes: the hangar 2.2 MB, the benches 2.4 MB, 4.58 MB in all (budget about 6 MB).

## Verdict

Accepted by Claude, round 2 of 3 (24 October 2026). The tunnel reads as a real tunnel, the workshop and coffee corners make the hangar lived-in, and the launcher is believable.
