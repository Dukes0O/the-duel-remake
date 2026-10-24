# LAB-ART, the Lab hangar and its benches: look rounds (24 October 2026)

All models are original, written by `tools/art/lab-props.mjs` (recipes in
`lab-hangar.mjs`, `lab-benches.mjs`, `lab-benches2.mjs`, a small kit in
`lab-kit.mjs` and `lab-common.mjs`) into `public/assets/models/lab/`: one GLB for
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

## Round 1

A 30 x 18 m hangar with its big door open on the +Z side onto the pad: concrete
floor with oil pools, rubber marks and yellow safety lines, corrugated steel
with rust streaks, trusses, strip lights, steel workbenches under a pegboard of
tools, shelves, drums, tyres. Thirteen bench models stand in it by
`HANGAR_LAYOUT` (the test checks none overlap and all fit):

weighing pad (with the weight-against-lift board), weights and cans, drop tower
over a sand pit with a target, fire pit (lid, logs, buckets, gas bottle, three
switches), pendulum frame (three cords of 1, 3 and 5 m and a heavy bob, stopwatch
board), rotor test stand, bending rig (three bars, ram, load dial), nail jars
(four glass jars), turning arm (car-sized cradle, g-board), map table (the home
valley map, compass, ruler), wind tunnel (inlet, test section, rolling road with
scales, nine-blade fan, smoke rake, control desk, hidden-until-secret REVERSE
switch), launcher ramp (protractor arc, tape measure) and snow trays with skis.
Movable pieces are separate parts: cords, stopwatch hand, carriage, lid, logs,
rotor, bars, ram, jars, arm, plumb bob, ruler, compass needle, belt, fan, smoke
rake, ramp arm, trays and the dials' needles.

Known weak points we would fix in round 2 if you agree: the workbenches and
pegboard are small in these views; the wind tunnel reads as a box from outside
(the belt and fan are inside); the launcher is thin; the floor could carry more
oil and wear.

Sizes: hangar 1.6 MB, the benches about 2.0 MB, 3.6 MB in all (budget about 6 MB).
