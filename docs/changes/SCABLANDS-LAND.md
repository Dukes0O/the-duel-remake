# SCABLANDS-LAND

Built by a Sonnet helper for Claude, 12 November 2026. No switch: the Scablands is drawn this way whenever it is
drawn (the stories that use it are still off). The design is the card's (`docs/board/cards/SCABLANDS-LAND.md`); this
note lists what was built, what moved and what differs from the card.

## What changed

- **Colours (part 1).** `scablands-tintown.py`, `-kit.py`, `-everburn.py` and `-boneyard.py` no longer draw a material's
  colour through a noise node. Each material keeps one plain base colour and metal of .2 or less; the four models are
  rebuilt with no change to any shape, name, size or place. Where the old colour was a two-colour noise (the Everburn's
  ash-grey paint, the Boneyard's aluminium and enamel) the new colour is the middle of its two colours; everywhere else
  it is the colour the recipe named.

  | Model | Materials without colour before | after | File size (limit) |
  | --- | --- | --- | --- |
  | `tintown.glb` | 10 of 10 | 0 of 10 | 1,448,388 B (2.5 MB) |
  | `kit.glb` | 12 of 12 | 0 of 12 | 527,152 B (1.5 MB) |
  | `everburn.glb` | 4 of 9 | 0 of 9 | 954,396 B (1 MB) |
  | `boneyard.glb` | 3 of 7 | 0 of 7 | 1,964,048 B (2 MB) |

- **Wear (part 2).** `tintArt` in `src/world/scablands-scene.js` draws `createScrapWear({paint:1})` over every material
  of every place's art: one wear for each place, with the place's own ground point as its origin (set once, since a place
  does not move). Parts that glow (lamps, embers, flames, anything with emission) and the people in `folk.glb` are left
  clean. Old Smoke and Big Bess keep their own wear.
- **The ground (part 3).** One `createGroundLook()` is applied to the near tiles, the far ground, the road and the
  edited-ground chunks (`createGroundView` now takes the material).
- **The road (part 4).** `Scablands dirt road` is a flat ribbon on the same oval, 1.2 times the road's half width to each
  side, cut across at 20 points, every point 6 cm above the ground; its own darker packed colour, two ruts (darker
  strips, drawn as vertex colour) and the ground look. It is rebuilt where the old tube was (open marks changed) and also
  when a ground edit is committed (`updateGroundView`). The round tube is gone.
- **The far ground (part 5).** Lowered 40 m wherever the four near tiles cover it, and further where a straight far slope
  would still show through the near ground (see "Differs from the card"). Unchanged elsewhere, also after a rebuild.
- **Tin Town's gate (part 6).** `src/world/tin-town-gate.js` (new): a group named `Tin Town gate` at (575, 62), built
  from boxes, drums and corrugated sheets, merged by material (nine draw calls): two posts of stacked drums and girders
  7 m tall with a 9 m opening between them, a girder beam, three lamps hanging under it (they glow a little), a tin
  sign reading TIN TOWN on both faces standing on the beam, and 14 m of corrugated fence each side. The scene gets it
  with one call, and the gate fire now stands on the beam (`fireHeight`), its three tongues along the beam.

## Differs from the card

- **The Boneyard stood on end; fixed in its own commit.** Its recipe was authored +Y up and exported with the exporter's
  own Y-up turn, so every plane stood upright and the 180 by 150 m dirt slab stood up as a wall (the fault in
  `docs/ART_LINE.md`, "A vehicle standing on its nose in the game"). `export_yup=False`. Not on the card; it showed in the
  Boneyard picture of the look sheet. Revert commit "the Boneyard stood on end" to undo it.
- **The gate's direction.** The brief's line from (610, 170) to (430, 70) does not pass through (575, 62) (at x = 575 it
  is at z = 150). It is the direction the furnace's two legs bend around the gate, so the gate's driving direction is that
  line's direction and it stands at (575, 62). Both legs cross the gate's plane at its middle.
- **The road follows the ground as drawn, not the land's own height.** The near ground is 23 by 17 m cells, and at the
  foot of the north and south ridges the drawn ground is up to 8 m off the land's height at the same place (the road would
  have been buried or hung in the air there). Every road point takes the lowest drawn ground within 1.5 m, plus 6 cm.
  On flat ground this is the land's height plus 6 cm, as the card says. The road is never more than 0.1 m above the
  drawn ground; where the ground falls away steeply its outer edge is tucked into the slope (sunk more than 0.5 m at a
  few of the steepest edge points).
- **The far ground has a finer grid and lowers more than 40 m in places.** With 280 by 200 m cells the edge of the near
  tiles cut cells in half, and those cells rose up to 110 m above the near ground at the cliffs. The far cells are now
  140 by 125 m (20 by 16), so the near edge falls on a cell line, and its corners drop 40 m under the near ground and
  further wherever a straight far slope would still show through (a check at the near ground's own bends). Beyond the near
  tiles it is the land's height as before.
- **Near tiles were rebuilt 350 by 250 m off.** `refreshOpenMarks` passed `offsetX - 350, offsetZ - 250` to `makeGround`
  for a near tile whose own position is already its centre, so after any change of open marks the drawn ground showed
  land from the wrong place. Fixed (it would have buried the new road).
- **No collision for the gate or its fence.** The card draws the gate; the solids list is unchanged.

## Checks

- `node tools/test-scablands-scene.mjs`: passes. New: every material of all eight model files has a colour that is not
  white (or a picture) and, in the four rebuilt files, metal of .2 or less; the road is cut at 3 or more points, is 1.2 times
  the road's half width each side, has ruts and the ground look, is never more than 0.3 m above the ground as drawn
  (highest 0.10 m), every face looks up, and it is rebuilt after an edit; the far ground lies below the near ground at
  more than 5,000 places; the gate stands at (575, 62) with a 9 m opening, 7 m posts, 14 m of fence each side, its
  sign, glowing lamps, wear on all but the lamp glass, and the fire on its beam; wear on every place's materials with the
  place's ground point as origin and each place its own; the ground look on every ground material.
- `node tools/test-blender-output.mjs`: 397 checks, 0 failed.
- `node tools/test-old-smoke.mjs`: 480 checks. `node tools/test-run-gas.mjs`: 888 checks. `node tools/test-town-view.mjs`:
  passes (it loads `tintown.glb`).
- No replay fingerprint or world signature moved. No height or collision was touched.
- Lane tier (`--changed --jobs 4 --keep-going`): 57 passed, 0 failed. `npm run build`: pass. Browser check `everburn-well`: pass
  (2 screenshots, 0 warnings, 0 errors).
- Frame check: not run (rule 9); owed before the Scablands is opened to players beyond the story's switch.

## Look

`.evidence/land-look/sheet-a.jpg` and `sheet-b.jpg` (kept in the lane's ignored evidence folder): Tin Town from the road, the gate, the
Boneyard's planes, the Everburn well, the open flats with the road, a hillside on the Ridge; before on the left, after on
the right.

## Removed

The round tube road (`TubeGeometry`, its point list and `roadGeometry`). The noise-texture colours and bump nodes in the
four recipes. `detailCounts.far = 10` (now a 20 by 16 grid).

# Follow-up (12 November): Tin Town's shacks

Built by a Sonnet helper for Claude. Tin Town grows, drawn in code the way the gate is (`src/world/tin-town-shacks.js`,
one group named `Tin Town shacks`, added to the scene with one call).

## What changed

- **45 shacks** of three sizes (3 x 3 x 2.6, 4 x 3 x 2.6 and 5 x 4 x 3 m): four walls of corrugated sheet, a sloping tin roof
  that overhangs, a dark doorway with a frame, one or two shuttered window holes, one or two patches of other sheet and
  sometimes a warm lamp by the door. Colours are tintown.glb's own (steel, rust, wood, cloth, paper); each shack differs by a
  fixed seeded sequence.
- **Stacked one, two or three high on scaffold legs** (four girders to the ground, each standing on the ground at its own
  point and 5 cm in, braced between levels) with plank decks, a walkway and rail on the front of each upper level and a ladder
  to the next.
- **Six clusters** of six slots each (three along, two across, alleys 2.5 m wide), found by a fixed search near these angles
  round (600, 0): the first spot that keeps every rule below. A cluster stands 35 to 80 m from the centre. East and west
  clusters are turned so that their long side runs round the ring. The water tower (tank on four girder legs, 11.7 m) is in
  cluster 1 and the radio pole (13 m, a glowing lamp on top, four guys) in cluster 3.
- **Washing lines** (a thin line with small coloured cloths) between some stacks, and **warm lamps** (small glowing boxes,
  the only part not worn) by some doors.
- **A tin fence** of 2 m sheets on posts along the outside of the ring (88 m from the centre), beginning where the gate's own
  fence ends and running round to the north, with a gap wherever a road comes in or the ground is not flat.
- **Four meshes** in all (sheet, scaffold and planks, washing, lamps), one per material with each piece's colour in its
  vertices: 4 draw calls. 22,996 triangles. Built in about 50 ms.
- **Collision:** one solid for each cluster (`tin-town-cluster-1` to `-6`, 12 m tall) and two for the gate's posts
  (`tin-town-gate-post-left` and `-right`) in `SCABLANDS_SOLIDS`, 16 in all.

## Differs from the brief

- **The gate now faces north and south.** With the gate turned along the line from (610, 170) to (430, 70), the gas run's
  Boneyard road (from (447, 308) to the gate) ran along the gate's beam into a post (0.0 m clearance). The gate's driving
  direction is now straight north and south: the furnace comes in 18 degrees and the Boneyard road 27 degrees from straight, and
  the road goes on to the town's centre 22 degrees off. The gate's two posts then clear the Boneyard road by 3.5 m. A gate
  cannot face the furnace's way in, the Boneyard road and the furnace's way out west all at once: the furnace's last piece
  (from the gate to (430, 70)) starts inside the west post. It is an actor that turns round there, and the gate's west fence
  also lies across that piece (nothing collides with the fence). Claude to decide whether to move a path.
- **Two tests changed, for the gate's posts only** (`tools/test-old-smoke.mjs`, `tools/test-run-gas.mjs`): a path must keep
  3.4 m from the gate's post boxes instead of 8 m, and the furnace's piece that leaves the gate may touch them. Every other
  solid still needs 8 m and no other assertion moved. Needs Claude's written review (rule 18).
- **The shack layout avoids the gate's fence too** (a box 553 to 597 by 58 to 66), besides the roads, the 24 m circle, the
  existing model and its solid box.
- **Cluster places are the first that keep the rules.** With the roads and the ridge at the east edge (the ground climbs from
  x = 660), the free ring is the north and east; the six clusters stand at (585, -48), (620, -46), (647, -18), (648, 15),
  (626, 43) and (614, 67). Every cluster's ground varies by 1.5 m or less (the ground at Tin Town is flat), so no shack was
  skipped.

## Checks

- `node tools/test-scablands-scene.mjs`: new checks: 40 to 50 shacks (45), six clusters, three sizes, stacks, the tower and
  the pole, at most 12 draw calls (4) and under 60,000 triangles, wear on everything that does not glow, nothing drawn within
  24 m of (600, 0) or within 10 m of the roads (read from the real job paths: the furnace's path pieces, both gas-run roads,
  job 4's road, the yard line and the gate line), every foot within 0.15 m of the ground, one solid for each cluster and
  two for the gate's posts, every shack inside its cluster's solid, and both ways in cross the gate's opening.
- `node tools/test-old-smoke.mjs` (614 checks), `node tools/test-run-gas.mjs` (1,044 checks), `node tools/test-everburn-easy.mjs`:
  pass; every path still clears every cluster by more than 8 m and the Easy driver won every road.
- Lane tier (`--changed --jobs 4 --keep-going`): 27 passed, 0 failed (the replay fingerprints, 297 checks, and the world
  composition checks are unchanged). `npm run build`: pass. Browser checks `everburn-well` (2 screenshots) and `run-gas`
  (3 screenshots): pass, 0 warnings, 0 errors.
- No replay fingerprint or world signature moved. Frame check: not run (rule 9); the town adds 4 draw calls and about 23,000
  triangles.

## Look

`.evidence/land-look/sheet-c.jpg` (the six viewpoints, before above after) and `sheet-d.jpg` (the town from the gate, from
200 m, an alley, the town from 60 m up, the washing lines and the gate burning from three places).

## Removed

Nothing replaced; the gate's first direction (towards (430, 70)) is replaced by north and south.

# Follow-up 2 (12 November): the furnace stops in front of the gate, the road goes through it, Tin Town from far off

Built by a Sonnet helper for Claude, to the card's section "Tin Town's shacks: built, merged and judged".

## What changed

- **The furnace stops in front of the gate** (`src/world/jobs/everburn.js`): the gate waypoint is now `tin-town-gate-front`
  at (575, 82), 20 m south of the gate, and the next place stays (430, 70), so the furnace turns west along the outside of the
  fence. `gateWaypoint` follows the new place (still the 13th). The rules in `old-smoke.js` did not change.
- **The Boneyard road passes squarely through the gate** (`src/world/jobs/gas-run.js`): a new place `tin-town-gate-approach`
  at (575, 112), so the truck drives north through the middle of the opening.
- **Seen from far off** (`src/world/tin-town-shacks.js`): three shacks (the top of slot 2 in clusters 1, 3 and 5) have a
  stovepipe and a plume of chimney smoke (`createTinTownChimneySmoke`: 8 puffs each from `createSmokeMaterial(0x6a655e)`,
  rising 14 m, drifting towards +x and +z at 4.5 and 1.8 m over the climb, placed from the clock in the scene's `animate`; the
  puffs fade to .55 at most). A 16 m watchtower of girders (braced every 3 m, plank platform and rail, a roof, a warm lamp under
  it, a ladder) stands in slot 6 of cluster 6, the cluster nearest the gate. The sheet colours are the old model's rust and
  orange (five of six), with one steel sheet in six, and one patch in four is grey-blue.
- **Counts:** the shacks are still 4 draw calls; 24,084 triangles (22,996 before). The smoke is a separate group, 24 soft
  cards in one material (the gate's own smoke is 12), so the scene adds 28 draws for Tin Town in all.

## Re-recorded numbers

| Where | Was | Now | Why |
| --- | --- | --- | --- |
| `tools/test-old-smoke.mjs`: the path's places | gate at (575, 62) | `tin-town-gate-front` at (575, 82) | the furnace stops in front of the gate |
| Furnace path length | 3,250.6 m | 3,232.1 m | the two pieces round the gate are 18.5 m shorter |
| Furnace path time at base pace (14 m/s) | 232.2 s (3 min 52 s) | 230.9 s (3 min 51 s) | the same |
| `tools/test-run-gas.mjs`: the Boneyard road's places | ... (447, 308), (575, 62), (600, 0) | ... (447, 308), (575, 112), (575, 62), (600, 0) | the road passes squarely through the gate |
| Boneyard road length | 1,252 m (+/- 5) | 1,259 m (+/- 5); exactly 1,258.8 | the last two pieces are 6.8 m longer |
| `GAS_RUN_AMBUSH_METRES.boneyard` | 970, 1100 | 977, 1107 | the two marks after the Boneyard place keep their distance from Tin Town |
| Tightest clearance of the Boneyard road from a solid | 3.5 m (a post) | 3.8 m (a post) | squarely through the opening |

## Changed assertions

- `tools/test-old-smoke.mjs`: both allowances for the furnace's path are REMOVED (the 3.4 m rule for the gate's posts and the
  exemption for the piece leaving the gate). The furnace's path keeps 8 m from every solid, as before the gate's posts; the
  well's own box stays exempt for the first and last pieces. Tightest clearance 15.1 m.
- `tools/test-run-gas.mjs`: the allowance stays, in its own words: a road that passes through the gate keeps at least 3.4 m from
  each post box and every other solid keeps 8 m ("an opening is meant to be driven through").
- `tools/test-scablands-scene.mjs`: the one assertion that named the job's gate at [575, 62] now names the furnace's stopping
  place [575, 82], "the furnace stops in front of the gate"; the gate's own place is checked separately as 20 m north of it. The
  old check that the furnace crosses the gate's opening is replaced by one that the Boneyard road does, squarely
  ((575, 112) to (575, 62)). New: the watchtower is 16 m tall and stands in the cluster nearest the gate; three chimneys in three
  clusters, each plume eight puffs rising about 14 m and drifting the same way, light.

## Checks

- `test-scablands-scene`, `test-old-smoke` (616 checks), `test-run-gas` (1,088 checks), `test-run-gas-medium` (the card's
  targets are met), `test-everburn-easy`, `test-ember-lines` (47 captions): pass.
- The shack layout did not move (the cluster search reads the new furnace and road lines from the same list).

## Look

`.evidence/land-look/sheet-e.jpg` (the six viewpoints) and `sheet-f.jpg` (Tin Town from 200 m, from the gate, from 60 m up and
the gate burning from 45 m, 20 m, the town side and 120 m down the furnace's approach).
- Lane tier (`--changed --jobs 4 --keep-going`): 48 passed, 0 failed; replay fingerprints (297 checks) unchanged. `npm run build`:
  pass. Browser checks `everburn-well` and `run-gas`: pass, 0 warnings, 0 errors. No world signature moved.

# Round 3 fixes (12 November): the well, the Dead Mall and the Boneyard

Built by a Sonnet helper for Claude, from the card's section "Round 3" and the round 3 sheet. One commit for each fix. No switch:
the Scablands is drawn this way whenever it is drawn.

## What changed

1. **The Everburn's fire and smoke are drawn in code** (`src/world/everburn-fire.js`, new). Three flame tongues 5 to 7 m tall on the
   derrick's top (8.25 m up), firelight on the sand round its foot, 26 sparks, and a column of 16 smoke puffs that rises 85 m and leans
   22 m east and 9 m south with one fixed wind. It burns all the time, as the model's own flame did. The seven grey spheres
   (`mastAndSmoke`, now `radioMast`) and the model's flame solids (`everburn-flame-core`, `-outer` and the merged
   `everburn-burning-flame-*` meshes, taken out of the loaded copy) are gone. Past 280 m the well's stand-in is a 8.25 m dark mast, not a
   32 by 12 by 24 m box (the other places keep the box). Cost: 21 draw calls.
2. **The mall's sign lettering sits on its boards.** Cause: `scablands-mall.py` put each word's left edge at the sign's middle minus
   2.8 m, and the half turn that faces the three words on the entrance side toward the entrance sent the text the other way. Words
   are now centred on their signs (`align_x='CENTER'`), and `mall.glb` is rebuilt (1,049,760 to 1,050,856 bytes). Checked in the file:
   every word's box lies inside its board's box. The kind of fault is in `docs/ART_LINE.md`.
3. **The mall's nine flat rocks go** (`addMallRubble`), and so do the four sand drifts: a first try that laid them low and wide on the
   ground's own material still read as cushions and barrels in the 25 m and close pictures, so, as the card says, they go too.
4. **The Boneyard's dirt slab is not drawn** (`Boneyard_ground_*` removed from the loaded copy). The model file keeps it.
5. **The three wrecks differ** (`src/world/boneyard-wrecks.js`, new). At load each wreck is lifted out of the model and set down
   again: the north wreck at (418, 272) turned 8 degrees; the east wreck at (466, 338) turned -30 degrees, beyond the Boneyard road;
   the south wreck at (372, 296) turned 62 degrees and rolled 40 degrees onto a wing. Gaps are uneven (see the test). Each rests on the
   ground (lowest part within 0.12 m); the engine pods of the two level wrecks are sunk no deeper than 0.15 m (the buried landing gear
   is not counted, it is broken on purpose). The one box `boneyard-planes` (it covered only part of one wreck) is replaced by three,
   `boneyard-wreck-north`, `-east` and `-south`, each covering all of its wreck. Both gas-run roads, the furnace's path and every other
   path the tests read stay 8 m or more clear. Big Bess's resting place is now (464, 262), turned 2.2 rad, 5 m or more from every
   wreck (it was inside the north wreck).
6. **The mall is drawn in one piece for each surface** (`mergeBySurface`, using `mergeGeometries`, the helper the game's other scenes
   use): 254 meshes become 7. Each part's place is baked in; a surface with one part keeps its name and glow. The model file is
   unchanged.
7. **The well is not alone on its disc** (`src/world/everburn-props.js`, new). Eleven props cut from the Ridge's kit model (already
   loaded, so no new file): three fire pots, two tyre-and-slat barricades, a signpost, a radio mast and four basalt rocks, in one
   cluster 20 to 30 m north-east of the well (about (-414, 282)). It stays 14 m or more from the raiders' way in (-448, 288) and hold
   (-426, 303), 12 m or more from the furnace's parking place (-406, 304) and the car's start at the well. Drawing only; no solid.

## Differs from the card

- Fix 5: the card says "both roads stay 6 m clear". The existing checks ask 8 m of every solid and are not loosened, so the
  wrecks keep 8 m. The east wreck left the original row because the furnace's path (345, 246) to (545, 252) runs 15 m north of the
  old row and the Boneyard road ran through the south wreck.
- Fix 5: a solid is an axis-aligned box in every test and in the game, so each wreck's box is the box round the turned wreck (38 by 23,
  33 by 30 and 20 by 38 m), larger than the wreck itself.
- Fix 3 went further than the card's first step (see above).

## Re-recorded assertions

`tools/test-scablands-scene.mjs` only (`test-run-gas`, `test-old-smoke` and `test-field-battle` are untouched):

- The smoke pillar check now looks for `Everburn fire and smoke` (the spheres are replaced by it).
- The solid count is 18, not 16 (`boneyard-planes` became three wreck boxes).
- "Outside a job, Big Bess stands at her Boneyard place (the place's own spot plus 18 m)" and "she keeps her Boneyard turn" now name her
  new resting place and its turn (`BESS_REST`): the old spot was inside the north wreck.
- The check that the mall has rubble now checks that it has none.
- New: the fire (three tongues of 5 to 7 m, firelight, 14 to 18 puffs, the column to about 90 m, one lean, the mast stand-in), the
  model's flame solids and the dirt slab are not drawn, the mall's sand drifts are not drawn, the mall's merge (parts, place, glow),
  the wrecks (own solid, inside it, on the ground, pods, three headings, one roll, uneven gaps, 8 m from both roads and the furnace's
  path, Big Bess 5 m clear) and the props (8 to 12, small, on the ground, clear of four named places, five kinds).

## Checks

- `test-scablands-scene` (every new check above; no count printed), `test-scablands-ground` (5), `test-scablands-job-map` (20 checks),
  `test-run-gas` (1,116 checks, untouched: both roads keep 8 m from every solid, the three wreck boxes included), `test-old-smoke`
  (650 checks, untouched; the card's 616 grew with the two extra solids it measures every path piece against), `test-field-battle`
  (792 checks, untouched; the card's 750 grew the same way), `test-everburn-easy` (pass, the Easy driver brought Big Bess home 10 of 10
  on every road and the battle), `test-review-evidence` (9), `test-board` (629 checks), `test-repo-hygiene`: pass.
- Lane tier from PowerShell (`--changed --jobs 4 --keep-going`): 71 passed, 0 failed, 0 not run (896 s). `npm run build`: pass.
  Browser scenarios `everburn-well`, `run-gas` and `field-battle` (`--jobs 2`): 3 of 3 passed, 0 warnings, 0 errors (2, 4 and 7 screenshots).
- Not run: `test-blender-output` (it rebuilds every recipe in the repository); the mall recipe was run by hand, writing only the
  model, and the rebuilt file was read back (each word's box inside its board's box).
- Frame check: not run (rule 9); owed before the Scablands is opened beyond the story's switch. Render numbers before and after are in
  `round-4-review.md`: the mall falls from 635 to 769 draw calls to 143 to 291, the well rises by 14 to 30.

## Look

`docs/board/looks/scablands-land/round-4.jpg` and `round-4-review.md` (the same twelve views, with the render numbers before and
after).

## Removed

- The seven grey smoke spheres (`Everburn smoke pillar visible across the Scablands`) and the `mastAndSmoke` function's smoke half.
- The model's flame solids in `everburn.glb` (removed from the loaded copy; the file keeps them, a rebuild without them is a later
  clean-up).
- The nine flat rocks (`addMallRubble`, group `Dead Mall sand drifts and rubble`) and the four sand drifts (removed from the
  loaded copy of `mall.glb`).
- The Boneyard's dirt slab (`Boneyard_ground_*`; removed from the loaded copy of `boneyard.glb`).
- The solid `boneyard-planes`, and Big Bess's resting place at the Boneyard's own spot plus 18 m.
- The 32 by 12 by 24 m far stand-in of the well.
- The mall's 254 separate meshes (now merged at load).
