# R34 shape: round 3, final self-review

Claude scored round 2 NOT YET, about 2.5/5. The earlier self-score of 4 was
not supported by the reference comparison. This is round 3 of 3. Stop here.

The sheet compares the supplied front, rear, side and three-quarter reference
pictures with the actual runtime factory exported and rendered in Blender.
It also shows the full top view. There is no supplied top reference; that
cell is labelled. These are model renders, not game captures or frame checks.
No maker model, logo or reference texture enters the game.

## Result

**Self-verdict: NOT YET, resemblance 3/5.** This improves the construction and
some shapes, but does not meet the 4/5 resemblance target. Claude decides the
art verdict. No further round is started or promised.

The main shell is now a connected Blender mesh, with glass face regions,
a solid roof, painted pillars, rounded shoulder transitions and flared wheel
openings. It is subdivided, then decimated. Zero-weight border vertices
protect glass outlines during collapse. Rounded cutters make real recesses
for the intakes, lights and rear ring panel. The bonnet has a centre bulge.
Long angular lenses sweep back around the front corners. The wing sits below
the roof on two boot uprights. Six tapered, bevelled silver spokes, dark
barrels, tyre sidewalls, red calipers and the single right outlet remain.

## Scores, 1 to 5

- Resemblance: 3. The overall coupe and four-lamp rear are more specific, but
  the stamped surfaces and front face remain too simple.
- Static readability: 3.5. The stance, wing and lamps read at sheet size.
  Driving readability is unmeasured.
- Grounding: 4. The contract checks actual tyre contact, clearance and tumble.
- Consistency: 3.5 in this neutral studio. Course lighting is unmeasured.
- Geometry cost: 4, for 55,688 visible triangles and 52 draws under 60,000/56.
  This is not a frame-cost score or release approval.

## Five largest remaining differences

1. The bumper face is still too flat and rectangular. Its rolled corners,
   lower ducts and mesh lack the reference's layered depth and curves.
2. Headlight outlines sweep back, but their simple lenses and round projector
   discs lack the reference's reflector shapes and clear lens detail.
3. Roof bow, window proportions and pillar transitions are still too angular.
   Black surrounds are separate trim and do not yet look like fitted rubber.
4. Quarter panels and bonnet reflections are uneven. Door seams and skirts
   look applied rather than formed in a stamped panel.
5. The rear wing is a square section with simple supports; rear lamps lack
   reflector depth, and the wheel faces need the reference's concavity.

## Checks and construction corrections

The headless GLB and runtime contract passes 294 checks. It retains all
original damage, fracture, reset, sibling isolation, grounding, footprint and
budget assertions. The Blender shell has 6,544 polygons before GLB export and batching with
details. No player storage is accessed.

Before final export, the unchanged checks caught trim above the height limit,
a 63,534-triangle candidate and side fracture samples too near the glass edge.
The trim is now straight between its fitted corners, decimation reaches the
budget, and the visual damage mapping samples inside the new glass. An
independent code review caught an ignored material-delimiter setting in
Blender collapse mode. Protected border weights replace it; the reviewer
confirmed the fix. The tapered spoke merge, winding and private buffers are
clear. No assertions or tolerances were loosened.

Final sheet size, copy hash and lane/build results are in the change note.

## Rebuild

1. Run Blender with `-b -t 2 --python tools/blender/cars/nissan-skyline-gtr-r34.py -- --root .`.
2. Run `node tools/art/skyline-export.mjs .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round3/skyline.glb`.
3. Run Blender with `-b -t 2 --python tools/art/skyline-review.py -- --root . --glb .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round3/skyline.glb --out .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round3`.
4. Run `python tools/art/skyline-sheet.py .evidence/2026-10-28/NISSAN-SKYLINE-GTR-R34-V2-round3`.

Use a free heavy-job slot. No frame check applies. Keep the runtime GLB and
recipe, not a blend file. Recycle raw review output after recording a verdict.
