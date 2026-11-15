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

## Round 3 follow-up: the `everburn` browser scenario's `isReady` error (12 November)

**Fault.** With the round 3 fixes and Codex's Everburn work on one branch, the `everburn` scenario failed 3 times in 3 with
`Uncaught: TypeError: Cannot read properties of undefined (reading 'isReady')` inside three's `compileAsync`. It passed without the
fixes.

**Cause (measured, not assumed).** Three's `compileAsync` collects the scene's materials and polls each one's `currentProgram`
every 10 ms; a material disposed while the poll is open has no program, so the poll throws. The scenario starts job 1 and leaves
for the menu at once. An instrumented run (hooks on `renderer.compileAsync` and the renderer's property store, in an unminified
bundle) showed the first `compileAsync` of the world's warmup opening at 13.4 s and still open at 15.5 s. At 15.05 s `frame()` in
`src/render3d.js` retired the combat explosion effects (`combatPlayerExplosion.dispose()` and the opponents', because the mode left
`wasteland`), disposing an unnamed `ShaderMaterial` straight away; the poll threw 23 ms later. It was not the Scablands scene's
materials: every material the new Scablands code makes was still alive. The retirement was an old race that the round 3 fixes moved
inside the window by making the warmup poll longer.

**Fix.** `src/render3d.js` (the block that retires the explosion effects, near the `armoredField` check): the effects leave the scene
at once and release their materials through `warmup.releaseWhenIdle`, the rule `retireObject` already follows, so they are disposed
once no native poll remains. A player who starts a job and leaves at once no longer raises the error.

**Checks.** `everburn` 3 passes in 3; `everburn-play`, `everburn-well`, `run-gas` and `field-battle` once; `test-scablands-scene`,
`test-render-warmup` (304), `test-render-warmup-key` (39), `test-render-warmup-passes` (143), `test-render-readiness` (65); lane
tier (84 passed, 0 failed); build (pass); the four other scenarios 4 of 4.

## Round 4 slice 1: the larger land (14 November 2026)

Built by a Sonnet helper for Claude. Card: `docs/board/cards/SCABLANDS-LAND.md`, "Round 4: a larger land", slice 1. No switch
changed: `story-everburn` and `scablands-runs` stay `dev`, so nothing here reaches a player.

### Stage A: what was found before anything was changed

Measured with a throwaway probe against the real `Course` (deleted afterwards), not read off the code alone.

**1. What the car's frame needs for a land 14 km by 10 km.** The frame is the oval of `SCABLANDS_VENUE` (about 606 m by 434 m
once its length of 3,290 is scaled to a closed curve; the `SCABLANDS_LAYOUT` radii of 600 and 430 are a little off it and are
used only by the dirt ring). A car is kept as `(s, lateral)` and turned to world `(x, z)` by `worldAt` and back by `nearest`
(a normal-projection solve, 40 steps of up to 16 m each). The sim moves an arena car in world space and re-projects it every
step (`src/sim-driving.js`, the `freeHeading` branch), so what matters is that the round trip is exact and that nothing
jumps. Findings:

- **The frame's size and shape do not need to change, and neither does any other arena venue or the car physics.** On a grid of
  2,347 points over the whole land (every 250 m, the four corners, and points 8.6 km and 9 km out) the round trip is exact to
  1e-9 m once the seam below is mended. The corner (7000, 5000), 8,050 m from the oval, comes back to 1e-9 m.
- **One real fault, in the Scablands' own definition: the seam.** `lengthU: 3290` is not a whole number of the course's 8 m
  steps (3,290 / 8 = 411.25), so the last segment of the frame is 2 m long but is read as 8 m. Near the seam a point far from
  the oval comes back wrong by its lateral distance times the angle error: 13 m at (4000, 0), 16.6 m from about x = 5,740 on
  the line from the yard to Tin Town, and 22 m at (6750, 0). The seam lies exactly on the east axis, where Tin Town now
  stands, so this is the line every east-west drive crosses. The fix is one number in `SCABLANDS_VENUE`: `lengthU: 3288` (411
  whole steps). The frame shrinks by 0.06 percent (the oval is 605.6 m by 433.8 m instead of 605.9 by 434.1). With it, a
  drive in 0.25 m steps from the yard to 6 km along the east axis stays within 1e-9 m of the true line. The same holds for
  `lengthU` 3,296, 3,200 and 3,360, so the cause is the whole-step count and nothing else.
- **The floor must be widened.** The floor limit (`floorHalfWidth`, 2,000) is the largest lateral distance from the oval a car
  may have; `containInArena` pushes a car back at it. The furthest corner of the land is 8,050 m from the oval, so
  `floorHalfWidth`, `wallOffset` and `outerWallOffset` become 9,000. Only the Scablands' own layout object changes; the
  Scrapdome, Salt Flats and Pit layouts are not touched.
- **Known and unchanged: the frame's own medial axis.** Inside the oval, along the east axis from the yard to x = 292 m, the
  nearest point on the oval flips between the top and the bottom branch from one step to the next, so `s` jumps by half a lap
  (about 1,630 m). The world position, the speed and the heading come back exactly (1e-13 m) because the car's pose is
  re-derived from the world point each step and `headingError` is recomputed against the new frame heading. It is the same
  today at the yard (0, 0), which stands on that axis. Nothing in the world-job mode reads the player's `s` as a distance. A
  player cannot feel it, and the new suite checks position and speed, not `s`.
- Cost: a ground height costs about 1.9 microseconds, so a full redraw of a 61 by 61 point detailed ground is about 7 ms and one
  strip of 61 points about 0.1 ms (the detailed ground follows the player a strip at a time).

**2. Everything else that assumes the present size.**

| Where | What it assumes | Change |
| --- | --- | --- |
| `src/world/scablands.js` | places on the oval (600, 430), `halfWidth` 700, `halfDepth` 500, floor 2,000, `lengthU` 3,290 | places by name at ten times the distance; half size 7,000 by 5,000; floor 9,000; `lengthU` 3,288 |
| `src/world/scablands-height.js` | the ridge (edge .94 to 1.08) and the wall (from 1.25) are fractions of 700 by 500 | the same ridge and wall profile in metres, moved to the new edge |
| `src/world/scablands-scene.js` | four near tiles of 700 by 500 at the origin; one far mesh of 2,800 by 2,000 dropped 40 m under them; road ribbon on the oval; every place always updated | detailed ground follows the player on a fixed grid; the coarse ground covers the whole land with a hole where the detailed ground is; places updated only when near |
| `src/world/scablands-ground.js` | the dirt ring (`ellipseClosest`, 600 by 430, 36 m) is the only road | unchanged: the ring stays round the yard |
| `src/world/regions.js` | the Whites at (1500, 0) and the branch cut from (560, -120): east of the old ridge | held as offsets from the land's east edge |
| solids table | boxes at places plus absolute wreck and Tin Town boxes | all offsets from a place |
| arena bounds | `onfoot.js` line 49 keeps a walker inside 700 by 500; `crew-gear/boarding.js` uses `wallOffset` | the first reads the layout; the second follows the new 9,000 |
| AI and targeting | none: the Scablands runs no computer cars (`opponents: 0`); raiders and the furnace move by world position | nothing to change |
| projectiles | ranges are in metres from the shooter, not from the frame | nothing to change |
| small and big maps (`world-hud.js`, `route-map.js`, `scablands-land.js`) | fit themselves to the job's own points; the small map adds a 120 m margin to a step with no road | nothing to change in this slice (the maps are slice 4); checked that they still draw |
| camera far 2,400 m, fog 260 to 1,650 m | the horizon | unchanged: nothing beyond 2.4 km is drawn, so the land's edge is never seen from the middle |
| `src/machines/dig-sandbox.js` | protects each place's disc ("Dig around it") | follows the places; see point 4 |
| `src/town/view/town-scene.js` | draws a ground of the land's size at fixed segments | follows the new size (a development screen) |

**3. Every position written as numbers.** About 40 points in `everburn.js` (every job's path points, the side jobs' points, the
ambush places, the lamps, the forge, the car starts), `gas-run.js` (both roads, the ambush and battle marks in metres along a
road, the furnace's wreck, `comesOutAt`), `furnace-sightings.js` (the skyline, the leaving path), `scablands-road.js` (the
delivery road's six points), `tin-town-gate.js` (the gate), `tin-town-shacks.js` (the centre, 11 road lines for the shack
layout, three keep-off boxes), `boneyard-wrecks.js` (three wrecks and Big Bess's rest), `everburn-props.js` (already offsets
from the well), the scene (the radio mast at (-601, 0); the solids table is already offsets for most boxes), `iron-line.js`
(27 points on the rail), `regions.js` (the Whites and its cuts), and the pinned values in about 14 test files.
`old-smoke.js` holds no position (only speeds and times).

**4. The Home Yard.** The Home Yard players have today is the Scrapdome yard that stands at the end of the Hidden Road
(`src/scrapdome-yard.js`, drawn on the hidden-road course with `yard.glb`). It is not drawn from the Scablands scene and reads
no Scablands height or place. The Scablands scene is drawn only for the `scablands` venue, whose only way in is a world job
(`startArenaEvent` with mode `world-job`, which needs `story-everburn`, `dev`). The one other reader of the Scablands' land is
the machine yard (`src/machines/dig-game.js`, behind `wasteland-town`, `dev`): it draws an 800 by 800 m floor from
`scablandsNaturalHeightAt`, so its four corners, which climb the old ridge's foot (up to about 9 m at (400, 400)), become
flat plain. That is the only visible change near the yard, and it is nothing a player can reach today. Reported for Claude.

### Stage B: what was built

The stop rule did not apply: nothing in how every arena venue keeps positions, and nothing in car physics, changed.

- **Size.** `src/world/scablands.js`: the eight places moved to ten times their distance from the yard (Tin Town (6000, 0), the Boneyard
  (4240, 3040), the Dead Mall (0, 4300), the Everburn (-4240, 3040), the Iron Line (-6000, 0), the Dry Dam (-4240, -3040), the Ships (0, -4300),
  the Ridge (4240, -3040)), each with its own `flatRadius` and height. `halfWidth` 7,000 and `halfDepth` 5,000. The yard and the Scrapdome gate
  (0, -92) did not move. The frame: `lengthU` 3,288 (the seam fix); `floorHalfWidth`, `wallOffset` and `outerWallOffset` 9,000 (the furthest corner
  is 8,050 m from the oval). `src/onfoot.js` keeps a walker inside the layout's half sizes instead of 700 by 500.
- **The ridge and the wall** (`src/world/scablands-height.js`): the same profile in metres as on the old land, standing at the new edge
  (`edgeScale` 10 turns a distance past the new edge into the same distance past the old one). The ridge climbs to about 108 m just past 7,000 m
  east and the wall stands 175 m high beyond about 7,200 m.
- **Positions by name** (`src/world/scablands-names.js`, new). `createLand(table)` gives `at(place, dx, dz)`, `between(a, b, share, dx, dz)`, `yard`,
  and three named points (`safe-road`, `ash-barricade-1`, `ash-barricade-2`). Built from it, each as a function of a land with the real land's
  value exported under the old name: `buildEverburn(land)` (all jobs and side jobs), `gasRunPaths(land)` and `gasRunWreck`, `furnaceMarks(land)`,
  `deliveryRoad(land)`, `tinTownGateFor(land)`, `tinTownRoads(land)` and `tinTownLayout(land)`, `boneyardWrecks(land)` and `bessRest(land)`,
  `ironLineFor(land)`, `scablandsSolids(land)`. The radio mast stands at the Iron Line. The Whites (`regions.js`) are offsets from the land's east
  edge. The gas road's ambush marks, the battle's come-out point and its ambushes are shares of the Boneyard road's length. The road test and
  the ember rule (`scablands-road.js`) take the moved points as input.
- **Drawn near, not everywhere** (`src/world/near-ground.js`, new, and `scablands-scene.js`). The detailed ground is one window of 60 by 60
  cells (1,400 m by 1,000 m, cells 23.3 m by 16.7 m, the size the whole old land was) that follows the player in whole cells on one fixed lattice.
  A move copies the heights it still holds and works out only the new strip (about 120 heights, well under a millisecond); nothing is allocated
  after it is built. The coarse ground is one mesh of 100 by 80 cells (140 m by 125 m) over the whole land, 35 cm below the land, with a hole
  cut out of its fragments where the window is (the hole is a metre smaller each way than the window). A place's models are drawn by the LOD at
  full detail to 280 m, as a far shape to 1,800 m and not at all beyond; the gate, the shacks, the chimney smoke, the well's fire and the radio
  mast are shown and updated only within 1,800 m of the player; places do not recalculate their matrices. No new lights. The player's position is
  read from the game's state with no allocation. Nothing collides now (the solids are data for the tests, as before), so there is nothing to
  stop colliding with when far.
- **The Whites, the dig yard, the town screen.** `regions.js` offsets from the east edge; `dig-sandbox.js` and `town-scene.js` read the places and the layout
  and needed no change.

### Numbers chosen

Places 10 times as far; half size 7,000 by 5,000; `edgeScale` 10; floor 9,000; `lengthU` 3,288; window 60 by 60 cells of 23.33 by 16.67 m; coarse
ground 100 by 80 cells, 0.35 m below the land; hole 1 m smaller each way; draw range 1,800 m (the far shape from 280 m, as before); the delivery
road (7,984 m), the halfway camp at .526 of the way from the yard to the Boneyard (7.06, -9.84 m off the line), the barricades at .392 and .873
of it; free points of every path as shares between two places with the old offsets kept; road lengths: Boneyard road 12,349 m, long road 18,626 m,
the furnace's path 35,961 m, delivery road 7,984 m, rail 17,241 m.

### Job timers and limits (for Claude, who sets the play numbers)

Changed in `src` (each only where a job would otherwise be impossible or wrong):

1. **The ember's cold rate: 0.33 to 0.15 a second** (`src/world/jobs/ember-rule.js`). At 0.33 a driver going straight at Tin Town over rock (the child-pace
   Easy driver) never arrived: it takes 610 s at the free speed and the pot is dead at 303 s (0 of 10 finished; 0 of 4 at 0.2, 4 of 4 at 0.15). At
   0.15 the pot is full to dead in about eleven minutes. Effect on the road: about 200 s at 150 km/h costs about 30 of the 100, so a good drive arrives alive
   and near the bright line (70); at 0.33 even the best drive would arrive barely alive.
2. **The roll into the well** (`src/world/jobs/old-smoke.js`, new `rollInMaxMps` 46). It took 5 s from wherever the third door was hit; the last leg is now
   2,278 m, which would have been 456 m a second on screen. It now takes 5 s or the distance over 46 m a second, whichever is longer (the same 5 s
   from 229 m, as before).

Left as they were, and now long (not impossible):

3. **The bolt after a hit** (36 m/s Easy, 45 Medium and Hard): about 21 km to the Boneyard ground, 578 s on Easy and about 460 s on the others, where it was
   under 50 s. The second bolt is 12.7 km (352 s on Easy). The wait with no door to hit was the reason for the bolt; on this land it is back.
4. **The furnace's pace** (base 14 m/s): its whole path is 42 minutes 49 seconds at the base pace (3 minutes 51 seconds). Door 2 glows after 467 s and door 3
   after 284 s of play in the scripted chase.
5. **The Boneyard gas road** takes Big Bess (9 m/s) 23 minutes; the long road 34 minutes. The battle's furnace comes out about 610 s into the drive (at .4449
   of the road, where it was 560 m of 1,259 m) and the drive after it is about 6.9 km. Raids and ambush marks are the same shares of the road, so
   there are the same number of raids over ten times the road (a raid every 1.5 to 2 km instead of every 150 m).
6. **Raid and ambush distances, the furnace's head start, `AMBUSH_ALERT_METRES` 160, the furnace's sighting offsets (90 m north, 40 m ahead, gone after 220 m)**
   are in metres from the thing they follow and are unchanged. The sighting furnace of job 4 turns away after 141 m of Big Bess's drive past 70 percent.
7. **Job 1's furnace skyline** moved to the middle of the road's second leg, 233 m north of it (it was 233 m north of the old road there), so that Cinder's
   line still plays when the player passes. Its `sayNear` radii (260, 60, 170 m) are unchanged.
8. **Time limits in the scripted drivers** were raised (listed below); no rule has a time limit of its own.
9. **Job 3 (Run Him Down) now has a start of its own** (`src/world/jobs/everburn.js`): open ground 163 m from the Boneyard, facing it. It had none: the arena put the
   car on the oval, which on the first land happened to be 163 m from the Boneyard and is 4.7 km from it now (the child-pace driver finished 0 of 10, the thief
   being 4.7 km past the 150 m leash). The same offset as the notice-board jobs' start beside the Boneyard.

### What looks or drives wrong on the larger land (honest)

- The yard is on the frame's medial axis: along the east axis from the yard to x = 292 m the car's `s` flips by half a lap from one step to the next
  (position and speed are exact). It is how it was.
- A drive of 6 km to Tin Town is two minutes of empty plain. That is the slice's point; roads, ground that makes routes and things beside the road are
  the next slices. The dirt ring road (606 m by 434 m) still lies round the yard and now joins nothing.
- The delivery road bends by up to 80 degrees where its legs, kilometres long, meet at the second barricade; a car at 150 km/h cannot turn in the road's 14 m,
  so the scripted driver slows to 80 km/h for each corner.
- The coarse ground can stand up to a few metres off the detailed one along the hole's edge where the land climbs fast (the ridge foot), seen at
  700 m; on the plain the difference is a few centimetres.
- The Hot Delivery marker on the big and small maps now sits 6 km away; the maps fit the job's own points and were not changed (slice 4). On the big map
  "TIN TOWN" is left off in job 2 because the lamps lie within four pixels of it (a rule in `src/route-map.js` counts pixels, not metres); two of
  the suites accept the missing name (see changed assertions).
- The scenarios `everburn-ember`, `everburn-frames`, `everburn-well`, `run-gas`, `field-battle` and `everburn-side-jobs` still place the car at coordinates of the old
  land; they were not run or changed in this slice.
- The machine yard (`dig-game.js`, `wasteland-town` is `dev`) loses the ridge's foot at its four corners (up to 9 m), as stage A says.

### Changed assertions

All are pins that moved because the land grew; none was loosened. Each is re-recorded as a claim of the same kind.

`tools/test-scablands-scene.mjs` (13): the near ground is one window of 61 by 61 corners where it was four tiles (and the coarse ground covers the
whole land, has a hole where the window is, lies 35 cm below the land and below the window along the hole's edge, where the far ground had been
dropped 40 m); the edit check reads the coarse corner at the yard; the gate, the gate's road, the fire, the furnace skyline, its leaving path and the
roads and lines checked against the shacks are read from `LAND` instead of typed at (575, 62), (300, -60), (140, 470) and so on; the job 4 furnace
turn is tested at 40.5 m past the 70 percent mark (it was .76 of a 680 m road; the same 63 m of travel); the well's raiders' way in is an offset
from the well.

`tools/test-scablands-ground.mjs` (4): the places are not on the oval, so the two oval checks use eight ring stops (where the places stood) and say
"on the dirt ring"; the fighter's walk crosses a line 40 m east of Tin Town's centre; the Ridge climb starts at the same distance past the ridge's edge.

`tools/test-ember-pot.mjs` (6): the delivery road at about 150 km/h arrives with the grade and pay the rule gives for what is left (it was bright and 120 on a
640 m road) and only cold takes ember, with the driver following the road's line and slowing to 80 km/h at the corners; the field at 45 km/h takes
nothing from rock and is not yet out after 100 s (it arrived on the old land); after a relight the pay is the rule's and never above 80; the
halfway camp tests use `LAND`; cold is 0.15 a second.

`tools/test-ember-lines.mjs` (4), `tools/test-everburn-line-audit.mjs` (3): the furnace skyline and the lines' places read from `LAND`.

`tools/test-everburn-play-start.mjs`, `test-everburn-screens-start.mjs`, `test-everburn-play-fixes-a.mjs`, `test-everburn-play-fixes-round4.mjs`
(a colleague, reviewed): positions typed at the old land read from `LAND` offsets (the drawn boxes of Tin Town, job 2's start and the forge, job 5's
mall and start, job 6's raider spots and derrick, the Tin Town solid, Hot Soup's end); job 5's and job 6's starts are on open ground and no longer on
the oval road (the road does not pass the mall or the well now: "start is more than 1,000 m from the oval road"); the furnace's glow waits 120 s to
900 s and the whole job 6 400 s to 1,500 s; the battle's Big Bess stands at `FIELD_BATTLE.comesOutAtMetres`; the big map's "TIN TOWN" name may be missing in
job 2 where the lamps lie within four pixels (two exemptions, "coveredByJob" and "coveredByLamps").

`tools/test-run-gas.mjs`, `test-run-gas-medium.mjs`, `test-field-battle.mjs` (a colleague, reviewed): the first raid wait 90 s to 400 s; the never-cleared
ambush run 900 s to 1,800 s; the road point lists are built from `LAND` calls instead of typed pairs; the Boneyard road is 12,349 m (1,259) and the long
road 18,626 m (1,640); "300 m shorter" is 3,000 m shorter; the battle comes out at .4449 of the road (5,494 m, was 560) and starts 5,414 m in; the drive
waits before the furnace is out gain the 611 s it takes Big Bess to reach the come-out point; both full battle plays 900 s to 3,000 s;
`MAX_SECONDS` in the Medium drivers 900 to 4,500.

`tools/test-old-smoke.mjs` (a colleague, reviewed, and mine): the path's 18 points are the same places built from `LAND`; "3,232 m", "3 minutes 51 seconds" and "229 m"
are the path's own sums and shares (35,961 m, 42 minutes 49 seconds, the last piece into the well, 2,278 m); the escape on Hard comes after about 43 minutes
(it was about four); run limits are the whole path at the base pace and a minute over; the bolt reaches the Boneyard ground at its own pace (distance over
bolt speed; was "within 50 seconds"); the roll takes 5 s or the distance over 46 m a second; the waiting car is 200 m north of the yard (2.4 km
from the path; checked); job 3's waiting point is 30 m west of the Boneyard.

`tools/test-everburn-easy.mjs` (1): `MAX_SECONDS` 720 to 3,000.

`tools/test-rail-region.mjs` (about 25 pins, one reason): its copy of the height function uses `edgeScale`, and the Whites' absolute positions (560, -120 ... 1520, 0) are
offsets from the east edge; "bank foot at the Scablands floor" is the Whites' own base height (1.21 m now, 1 m before: the rolling ground at the cut's start).
`tools/test-town-map-markers.mjs` (2): Tin Town at (6000, 0) and the legacy outpost on the Ridge at (4240, -3040).

The changed assertions in the suites above come to about 80 in all, grouped by suite.


### Results

- `tools/test-scablands-size.mjs` (new, 9 tests): pass. Round trip of 2,347 grid points, the four corners and both sides of every frame line to 1e-9 m;
  the 6 km drive at 100 mph takes the time distance and speed give (no step differs from its speed by 2 cm; the car holds within 150 m of the line); the
  same drive twice is identical; moving each of the eight places in a copy of the table moves exactly what belongs to it (jobs, side jobs, roads, gate and
  posts, shacks, wrecks, Big Bess's rest, rail, solids, the halfway camp by its share); no job, scene or road file holds a bare coordinate; the window
  keeps every corner on one lattice, equals a window built where it stands, replaces no array, and 200 one-cell moves cost under 400 ms; the scene follows
  the player and draws places only when near.
- Existing suites: `test-scablands-scene` pass; `test-scablands-ground` 5 of 5; `test-scablands-job-map` 42; `test-ember-pot` 44; `test-ember-lines` 56;
  `test-everburn-line-audit` 21 behaviour checks; `test-everburn-play-start` 358; `test-everburn-play-fixes-a` 291; `test-everburn-play-fixes-round4` 78;
  `test-everburn-screens-start` 9; `test-run-gas` 1,118 (27 s); `test-field-battle` 796 (54 s); `test-old-smoke` 655 (84 s); `test-run-gas-medium` pass (24 min 45 s,
  38 rows of 10 tries; targets met; the fighting driver wins the battle 7 of 10); `test-everburn-easy` pass (17 min 41 s: all nine jobs 10 of 10, both
  roads at every feud word 10 of 10, the battle home 10 of 10 and won 10 of 10); `test-world-jobs`, `test-world-job-mode`, `test-ember-save`,
  `test-ember-screens`, `test-ember-side-jobs` pass unchanged; `test-rail-region` and `test-town-map-markers` re-recorded and pass (see below).
- `tools/test-circuits.mjs`: pass (232,138 checks). `test-replays` 297 checks and `test-combat-replays` 12 checks: pass, no fingerprint moved (no Scablands
  job has a pinned replay). `test-feature-flags`, `test-repo-hygiene`, `test-review-evidence`: pass. No Scablands world signature exists in the repository
  (none of the signature suites names the Scablands), so none was re-recorded and there is no sheet `round-5.jpg`.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, PowerShell): 106 suites; 104 passed at first and 2 failed, both from
  the land's size and both re-recorded and rerun alone: `test-rail-region` (its copy of the height function and the Whites' coordinates; now from the
  east edge and `edgeScale`) and `test-town-map-markers` (Tin Town at 6,000 and the Ridge at (4240, -3040); the town view's farthest zoom, 2,450 m, could
  not show all eight pins on a land ten times as wide, so `TOWN_ZOOM.scablands` is 24,500 m, the camera's far plane 90,000 m and its pan speed at the
  farthest zoom 6,800 m a second: a development screen behind `wasteland-town`). The town suites (`test-town-view`, `-hooks`, `-ui`, `-visits`,
  `-wasteland-map`, `-world`) pass after it.
- `npm run build`: pass.
- Browser scenario `tools/scenarios/scablands-size.mjs` (new): pass, memory-only saves, headless, Performance, 120 delivered frames per view, with the
  laptop in use, so a guide only and not a frame check. First load 18.1 s (a fresh headless browser; over 5 s is a warning), world build 227 ms.

  | View | p50 | p95 | max | Draw calls | Triangles |
  | --- | --- | --- | --- | --- | --- |
  | The yard, looking east | 17.9 ms | 18.2 ms | 18.5 ms | 138 | 221,578 |
  | 1 km out | 18.0 ms | 18.2 ms | 18.6 ms | 121 | 166,932 |
  | 3 km out | 17.9 ms | 18.5 ms | 18.9 ms | 128 | 191,352 |
  | 5 km out | 17.9 ms | 18.1 ms | 18.6 ms | 172 | 196,560 |
  | Tin Town's gate | 17.9 ms | 18.1 ms | 18.5 ms | 277 | 273,044 |

  Every view sits at about 18 ms, which is the display's own refresh interval in that headless browser, not a measure of load; the draw calls and
  triangles are the useful numbers. Claude runs the real frame check.
- `tools/scenarios/everburn-play.mjs`: not run (known to fail on EVERBURN-REMAKE). `tools/test-review-evidence.mjs` does not fail (no sheet was made).

## Round 4 slice 2a: regions, roads and how the ground drives (14 November 2026)

Built by a Sonnet helper for Claude. Card: `docs/board/cards/SCABLANDS-LAND.md`, "Slice 2 design", build 2a. No switch changed: `story-everburn` and
`scablands-runs` stay `dev`. Solid ground (build 2b) is not started: a car can still cross the river anywhere.

### What was built

- **Roads.** `src/world/scablands-road.js` and `scablands-road-geometry.js`. Twelve roads (East, Boneyard, Tin, Salt, the Salt Road's spur to the Ridge,
  Ridge, West, Dam, Burn, Mall, Mall to the Everburn, Mall to the Boneyard), 54 km in all. Each is a list of nodes written through the land's names
  (`land.at`, `land.between`, named points), laid out with rounded corners (radius 700 m, 450 m before Tin Town's gate). A node that is worked out from others
  (a start 30 m from the yard, the straight beyond a crossing) is marked `derived`. The halfway camp is a node the East Road passes exactly. The roads are
  cut into 256 m cells, so "is this point on a road" asks only the segments in its cell.
- **Named points** (`scablands-names.js`): the eleven river nodes, the five crossings (shares of a stretch of the river), the camp and the two barricades. The
  names file now lets a named point stand on an earlier named point. `land.named` lists them for the moving-a-place check.
- **Regions, river, rises** (`src/world/scablands-regions.js`). `scablandsDriveAt(x, z)` gives the region and its driving numbers in about 0.7 microseconds; read
  in the card's order: roads, river bed, wreck fields (1,300 m round the Boneyard), sand (1,500 m round the Ships), the burn (1,600 m round the Everburn), salt
  pan, scab plates, flats. Edges are moved by one wave (`edgeWarp`, up to about 100 m), the same wave as in the ground's shader. The river is a curve through its
  eleven nodes and the five crossings; its cut (`riverDepthAt`) is 8 m with banks from 52 to 78 m from its middle. Rises (`RISES`, `riseHeightAt`).
- **How the ground drives.** `_drivingSurface` (`src/sim-driving.js`): for the Scablands only, the floor's grip, drag, shake and top speed come from the region.
  Every other venue returns the same object as before (a test checks the Scrapdome). On the Scablands' regions the pull toward the limit is 4 a second where it
  was 1.4, so that a car settles at the region's share of the floor's speed (measured below). A change of ground emits `groundChanged` (at most once in half a second).
- **The ember.** `emberLoss` takes `safeKmh` from the ground under the car (`world-job.js` asks `scablandsDriveAt`) in place of the road yes or no. Cold is 0.14 a second.
- **Drawn in code.** `src/world/scablands-ground-look.js` (new; the ground look moved out of `scrap-look.js`): each region has its own ground in the ground's shader;
  region edges use the same wave as the driving; cracks and plates are cut from a cell pattern worked out from the point (`gVoronoi`), so nothing repeats (the old cracks
  were read from a picture 413 m across, which showed as a grid); fine patterns fade to their average where their cells are under a few pixels. Roads
  (`createRoadLook`) are graded dirt with blade marks, a crown, two dark ruts, a gravel berm and an uneven soft edge. `src/world/scablands-draw.js`: the road ribbons (in
  pieces of about a kilometre, one built a frame when the player nears it), the gorge (bed and banks as ribbons; the ground is cut away where the river is, using a small
  picture of the river's distance made in code), the Girder Bridge (a deck and two trusses) and the Pipe (a one-car deck and a pipeline on piers). The far ridge is unchanged.
- **Felt.** Camera shake on rough ground grows with speed (`groundShake` x (speed/70)^1.4: scab plates 0.16 m, river bed 0.05, soft sand 0.07, sand 0.04). Dust takes the colour
  of the ground (`effects.js`). Cues (`sound-bank.js`, played by `audio.js`, from sounds the game already has): `world.ground.road`, `.flats`, `.salt-pan`, `.scab-plates`,
  `.river-bed`, `.river-soft`, `.sand`, `.wreck-fields`, `.burn`.
- **Scenarios put right:** `tools/scenarios/everburn-ember.mjs` and `everburn-frames.mjs` from the land's names. New: `tools/scenarios/scablands-regions.mjs`.

### Numbers chosen or changed, and why

- **Camp moved** from (2237, 1589) to (2001, 1199), the card's camp within 100 m. The East Road passes it exactly.
  The old camp was 540 m off the new road. Barricades are on the East Road, 220 m before the bridge and 900 m after it.
- **River nodes** are the card's, except the head: it starts 300 m east of the Dry Dam (so that the cut stays clear of the dam's flat ground) and the mouth
  stops 165 m short of the ridge at (1930, 4600) (a cut into the ridge would be a gorge 100 m deep). The crossings sit on the river's own line: the Pipe is 136 m
  from the card's spot.
- **East Road** is 7,838 m (card: about 7 km), because the bridge stands where the river runs north to south and the road must reach Tin Town's gate from the south.
- **Rises:** 26 m high (card 20 to 40), 920 m long along the road, 2,200 m across it, standing where the road is 1,500 m in a straight line from the place (1,700 m from the yard),
  or 42 percent of a short road. 30 m made the road's steepest grade 13.9 percent; at 26 m it is under 10 percent beyond the places' own ramps.
- **Ember:** cold 0.14 as the card says; nothing needed changing. Margin of the third drive is thin: 6 km at 30 km/h is 720 s and the pot is out at 714 s.
- **Ground pull 4 a second** (above). At the old 1.4 a car at full throttle settled 22 km/h over the road's limit and 29 km/h over the plates'.
- **Dust colours and shakes** are in `DRIVE` in `scablands-regions.js`.

### Checks

New: `tools/test-scablands-regions.mjs` (12 tests). Every road holds at the top speed of the quickest car (Koenigsegg Jesko, 253 km/h on the road) and of Hot Delivery's Falcone F42 (207 km/h): a driver
that aims 90 m ahead stays at most 2.4 m off the line on all twelve roads (the half width is 14 m), so the corners (700 m, 450 m at the gate) are not the limit; every point of a 150 m grid of
the land has one region and each of the eight is found where the card puts it; `DRIVE` is the card's table, and a car at full throttle in a real Duel settles at road 194, flats 146, scab plates 96, salt pan 240,
sand 74 and wreck fields 146 km/h (the road's limit is 185); the old ring and the delivery road are gone (a scan of the source and a check of 36 ring points); a place is hidden from the road before it by the rise between
(a camera 3 m up, 520 m past the rise, sees the top of the place's buildings 6 m up: hidden by 15 to 23 m of ground on the 16 road ends checked); rises 20 to 40 m, never within 600 m of a place, under 10 percent;
the steepest road grade is under 12 percent; the river is 8 m deep with banks, there are five named crossings on its line, a deck is level with the plain, and a road crosses the river only at one of them; a point is classified in
under 12 microseconds. `test-ember-pot` holds the ember's three drives. The three new files are in the no-bare-coordinate scan.

### Results

- `test-scablands-regions` 12 of 12; `test-scablands-size` 9; `test-scablands-scene` pass; `test-scablands-ground` 5; `test-ember-pot` 50 checks; `test-everburn-play-start` 358; `test-everburn-play-fixes-a` 291 and `-round4` 78;
  `test-run-gas` 1,118; `test-field-battle` 796; `test-old-smoke` 655; `test-everburn-easy` pass (18 min: all nine jobs, both roads); `test-run-gas-medium` pass (28 min); `test-circuits` 232,142 checks; `test-replays` 297 and
  `test-combat-replays` 12: no fingerprint moved. No world signature exists for the Scablands and none was regenerated.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, PowerShell): 131 suites. Two failed at first: `test-p4-audio` (the pinned old sound bank saw the nine new cues; they are excluded from the pin as the ember's three were: `GROUND_CUES`) and
  `test-review-evidence`, which fails until Claude writes `docs/board/looks/scablands-land/round-5-review.md` for the sheet `round-5.jpg` (expected). `npm run build`: pass.
- Browser scenarios (memory-only saves, headless, Performance, laptop in use, so a guide and not a frame check): `everburn-ember`, `everburn-frames`, `scablands-size` and `scablands-regions` pass.
  `everburn-frames`: p50 16.7 ms, p95 16.8 ms, max 17.8 ms. `scablands-size`: p95 16.8 to 16.9 ms; first load 23 s (a fresh headless browser); world build 134 to 146 ms.

  | View | Draw calls | Triangles |
  | --- | --- | --- |
  | yard, looking east | 140 | 184,292 |
  | 1 km out | 172 | 192,902 |
  | 3 km out | 132 | 180,680 |
  | 5 km out | 211 | 226,812 |
  | Tin Town's gate | 250 | 251,120 |

  `scablands-regions` (34 pictures): flats 146 / 185,104; scab plates 178 / 216,362; salt pan 129 / 177,080; river bed 138 / 186,930; wreck fields 156 / 182,354; sand 126 / 170,196; the burn 148 / 170,668; road 134 / 181,672;
  Girder Bridge 144 / 211,192 (from the air 76 / 138,946); Steps 139 / 208,312 (64 / 106,550); Wash 159 / 190,742 (75 / 138,998); Pipe 141 / 208,904 (66 / 108,742); South Ford 160 / 193,302 (64 / 107,538); the twelve roads 126 to 172 draw calls and
  171,000 to 199,248 triangles; from above the four ways 128 to 181 / 179,412 to 220,818. Slice 1 was 128 to 277 draw calls and 183,000 to 273,000 triangles.
  The sheet is `docs/board/looks/scablands-land/round-5.jpg` (310 KB): the plates, the pan, the river bed, the sand, the burn, the bridge, the pipe, the steps, the East Road, and the East Road, the scab plates and the river bed from above.
  Claude writes `round-5-review.md`.

### What looks or drives wrong (honest)

- The banks of the gorge read as wood grain from above (layered rock bent by noise); the river bed's soft patches show as long diagonal shapes; the sand is a flat pale plain with little to steer by.
- The burn's glints are bright orange at 300 m from the Everburn and read as lava rather than ash.
- The rises are felt more than seen from inside a car: the crest of each hides the place, but there is nothing on the rise itself.
- A car at 100 mph that meets a bank of the river leaves the ground off the far lip (seen at the Steps: the floor's launch limit comes from three old ramps of the first land's oval, which the sim still reads), and a car going down a bank drops 8 m in under half a second.
  Neither is a fault in the rules of 2a (a car can cross anywhere); 2b makes the banks solid.
- The ember's third drive has a thin margin (6 s of 720 s, and a car held at 29.9 km/h is out 16 m before the town's ring).
- Bess, the furnace and the other jobs' paths are the old straight legs between names, not the roads: the Boneyard gas road passes the Wash 600 m from the Boneyard Road. Only the halfway camp and the barricades moved (their shares changed). Job 1 uses the East Road.
- The East Road ends 47 m from Tin Town's centre at the gate (the last stretch is the town's own ground); the Steps have no road; the six old junk cars still stand on the oval round the yard, now 19 to 25 m off the East Road.
- A test car parked by the harness (the opposite point of the oval, 1,058 m east of the yard) stops a 45 mph drive along the east axis; the 100 mph drive passes it. Not investigated: it is old and not on a road.
- The gorge and the roads are drawn only within 3 km of the player, in pieces built one a frame; the coarse ground does not show the gorge (it is cut only where the ribbons are), so a distant river is a pale strip.

### Changed assertions, for Claude to review (rule 18)

`tools/test-scablands-size.mjs`: (1) the flat-land check uses (3500, 1500) in place of (3000, 2000), which is on a rise now; (2) the moving-a-place check
reads the named points and the net's non-derived nodes in place of the delivery road, and the camp moves .47 of the way (was .526); (3) the no-bare-coordinate scan
covers `scablands-regions.js`, `scablands-draw.js` and `scablands-road-geometry.js`; (4) the 6 km drive at 100 mph takes the distance over the speeds the car had (the plates hold
it to 52 mph) and no step changes the speed by more than 3.2 mph (was 2): the ground's pull, 3 mph at most.
`tools/test-scablands-scene.mjs`: the dirt-road checks are rewritten for the net (pieces built near the yard: 7 points across, 1.2 times the half width each side, no more than 0.3 m above
the ground, every face up, the middle on the land, the look has ruts and a soft edge); the edit check keeps the net's group.
`tools/test-scablands-ground.mjs`: the two ring tests are replaced: every road end is road, the yard and open ground are not; an ordinary car follows the East Road to the bridge and
stays on it. `tools/test-ember-pot.mjs`: the road question reads the East Road and the ground's safe speed; the delivery road drive is replaced by the three drives of the card
(East Road bright 72.5 left after 195 s; the short cut at 49.5 km/h arrives alive with 39.1 in 435 s; at 29.9 km/h the pot is out at 714 s, 5,966 m, before Tin Town; and by the road
at 714 s, 4,890 m); the Easy-halves check uses a safe speed of 50 and cold 0.14; the driver slows for the last 160 m (the town's ground is flats).
`tools/test-everburn-line-audit.mjs` (`safeKmh` 50 where `onRoad` was false); `tools/test-rail-region.mjs` (its copy of the land's height adds the rises and the river);
`tools/test-everburn-play-start.mjs` and `test-everburn-screens-start.mjs` (the starts of jobs 5 and 6 are 80 and 125 m from the nearest road: "more than 60 m from any road" where it said
more than 1,000 m from the oval road).

### Removed

The dirt ring round the yard (`ellipseClosest`, the oval road ribbon, `roadRibbon`, `scablandsSurfaceAt`'s ring), the delivery road (`deliveryRoad`, `DELIVERY_ROAD`), the ember's
road yes or no (`onRoad`, `roughFreeKmh`), the old crack picture (`createGroundLook` in `scrap-look.js`, replaced by `scablands-ground-look.js`).

## Round 4 slice 4: the map (14 November 2026)

Built by a Sonnet helper for Claude. Card: `docs/board/cards/SCABLANDS-LAND.md`, "Slice 4 design". Kyle: "that map is entirely ridiculous". No switch changed:
`story-everburn` and `scablands-runs` stay `dev`. The review note for the sheet is Claude's: `tools/test-review-evidence.mjs` fails until
`docs/board/looks/scablands-land/round-7-review.md` is written.

### What was built

- **One picture of the land** (`src/world/scablands-picture.js`). A grid of 560 by 400 cells of 25 m (224,000 cells) over the whole 14 km by 10 km. Each cell is asked what
  its ground is (`scablandsDriveAt`, the question the wheels ask) and how high it is (`scablandsHeightAt`), and is painted in a muted version of that ground's own colour
  (`GROUND_COLOURS`, now exported from `scablands-ground-look.js`: the table the shader reads) shaded as a soft relief lit from the north-west. The picture reads the height
  only through `scablandsHeightAt`, so the hills and scarps of slices 2b and 2c show without a change here. Where the land is 100 m or more high (the ridge's wall) the
  colour fades to rock. The marks are read from the tables: the twelve roads, the dry river, the five crossings, the eight places and the yard, the halfway camp, and a plan of
  each place made of its solid boxes (`SCABLANDS_SOLIDS`). The grounds are named where each is widest (found on a 100 m grid, ground by ground).
  **Size and time.** 224,000 cells, 0.9 MB. Made in one go it takes 340 to 390 ms of work on this laptop (node). It is made in slices from the first frame of a job:
  10 ms a frame while the countdown runs, 4 ms a frame once the car drives, 67 to 79 slices, none over 17 ms; until it is whole the maps show what is done. In the
  headless browser walk it took 640 to 1,100 ms by the clock, with the 3D scene drawing at the same time. 25 m is the finest cell that makes in this time; the roads, river,
  crossings, places and names are drawn as lines and writing on top, so they are sharp at any size.
- **The small map** (`drawSmallMap`, in `scablands-map.js`; mounted by `world-hud.js`). Always on the screen in a job, at the lower left where the circuit panel stood (the
  circuit panel is hidden there), on a dark panel with a 2 px border, 300 px wide or 40 percent of the screen's height, whichever is more. 2.5 km across, north up. The car
  is an arrow turned with it (white with an orange edge and a ring), always in the middle. The job's place is a gold ring; off the map it is a gold arrow on the edge pointing
  its way, with its name and the distance in km beside it. Roads are a dark edge and a pale line; the river is a dark cut with pale banks; each crossing has its own little picture
  (bridge, pipe, steps, wash, ford) and name; places have their plan and name, and the halfway camp too. Names are written only where there is room, never over the scale bar,
  the compass or the car. Drawn at most every 33 ms. A person on foot is the arrow.
- **What the player has learnt**, drawn and kept for the job (`createKnowledge`, `learn`): a barricade once the car is within 450 m of it (a cross), the crossing it stands
  at as held, by the holder named in the barricade's own id (a ring round the crossing), and the furnace's sight once the car is within 1,200 m of the furnace: a hatched outline
  cut by the ground's height (`sightOutline`, 48 rays, one every 40 m, the furnace's eye 5 m up, a car 1.5 m), which goes when the furnace goes.
- **The big map** (key M or the button). The whole land, the grounds, the roads, the river and the crossings named along their lines, every place with its plan, the halfway camp, the
  car, the job's place, what has been learnt, and the ways to the job's place as thin dashed lines with a letter each. At the side a list of the ways with what is known of each, and
  what has been learnt. The game stands still while it is open (the app pauses; the pause screen is not drawn over it; M or Escape or CLOSE lets it go). 1,400 by 1,000 pixels,
  shown 850 wide at 1280 by 720 and 1,060 wide at 1920 by 1080. Opening it costs 17 to 27 ms, once.
- **The ways** (`src/world/scablands-ways.js`). Written as legs of named things (a road of the net, a named point, the river's bed between two named points) and worked out from the
  data: the length along the line, the ground (every 25 m, `scablandsDriveAt`), the crossings on it (and whether it runs along the river under them), the barricades on it and the
  crossing they hold, and who can see it (the furnace on its skyline within 1,400 m, the Ridge's lookout within 3,000 m, each along a clear line over the ground). Hot Delivery has the card's
  four ways, from its own starting place, the yard: the East Road 7.9 km (road 99 percent, the Girder Bridge held by the Ash Men, both barricades, 2.9 km in the furnace's sight);
  across the scab plates 6.0 km (scab plates 84 percent, the Steps, 2.5 km in the furnace's sight); by the salt pan 8.9 km (road 98 percent, the Pipe, 3.0 km seen from the Ridge);
  along the river bed 9.4 km (road 41, scab plates 28, river bed 22 and soft sand 8 percent, under the bridge and the Steps, the Wash, 1.4 km in the furnace's sight). Any other job
  gets the way by the roads (a shortest path over the net's junctions) and the straight run, from the same data.
- **What the jobs already know that is wired:** a step's `barriers` (Hot Delivery's two barricades of the Ash Men), the furnace on its skyline (`furnaceSighting`: jobs 1, 3 and 4) and any furnace that is an
  actor of a job (the field battle's), the job's own start (`origin`) for the ways, and the next place the step asks for (`worldHudStep`'s target). **Not wired:** a barricade that has been burnt is still
  drawn (nothing in the job records it); the Ash Men's hold on a road "growing with the feud" (the card, item 10) has no data yet; a job's several places (the three lamps, the five flags, the people)
  are not drawn all at once, the map marks the next one (the numbered rings of EVERBURN-PLAY-FIXES' fourth round are gone with the job line); the Ridge's lookout is listed only for Hot Delivery's salt pan way.
- **Pause.** `createWorldHud({host, app})` pauses the app with `togglePause` and sets `app.worldMapOpen`; `screen-results.js`'s `modalScreen` draws no pause screen while it is set.

### Numbers chosen, and why

Cell 25 m (the finest that makes in under half a second); small map 2,500 m across on a 400 by 280 canvas (6.25 m a pixel); big map canvas 1,400 by 1,000 (10 m a pixel); relief: the vertical
stretched 9 times, a slope under 2.5 percent not drawn (the plain's own roll of 2 m over 700 m would stripe the whole land), light from the north-west; colours: each ground's own colour moved 36 percent
of the way to a dusty paper (so black plates stay dark and white salt stays pale), the soft sand in the bed a shade darker; the rim fades from 100 m to 150 m high; sight: furnace 1,400 m, eye 5 m; lookout 3,000 m,
eye 12 m; a barricade is learnt at 450 m and the furnace at 1,200 m (the scene draws things to 1,800 m); the small map is drawn at most every 33 ms.

### Checks

- `tools/test-scablands-map.mjs` (new, 1,798 checks): every place, road and crossing is on the picture at its own position, with its own line; along every road the picture is road; for 400 and more
  random points the colour is that ground's colour, muted and shaded (97 percent or more of points on the very ground, the rest within a cell of an edge); a hill gives a lit side and a shaded side and flat ground
  none; the small map's arrow, edge mark and distance for five places and five headings; names on the map only when the place is; what is learnt is learnt at the distances, kept, drawn and goes with the furnace; the four ways
  of Hot Delivery by their numbers; the same job run for 900 steps with the maps drawn every frame and the big map opened and shut is in the very same state as without them; nothing in the map is a bare position.
- `tools/test-scablands-size.mjs`: the no-bare-coordinate scan covers `scablands-picture.js`, `scablands-map.js`, `scablands-ways.js` and `world-hud.js`.
- Passing: `test-scablands-map`, `test-scablands-job-map` (42), `test-everburn-play-start` (358), `test-everburn-play-fixes-a` (388), `test-everburn-play-fixes-round4` (48), `test-everburn-screens-start` (9), `test-ember-screens` (20),
  `test-world-job-mode`, `test-scablands-size` (9), `test-replays` (297 checks), `test-combat-replays` (12). The lane tier and `npm run build`: see "Results" below.
- Browser: `tools/scenarios/scablands-map.mjs` (memory-only saves, Performance): the small map at the yard, on the East Road, at the Girder Bridge, on the salt pan and at Tin Town's gate, the big map for Hot Delivery at
  1280 by 720 and 1920 by 1080 and the small map at 1920 by 1080; the big map pauses the game, no pause screen is drawn, and closing lets it go. The sheet: `docs/board/looks/scablands-land/round-7.jpg` (380 KB).

### Cost

On the 2D canvas of the headless browser (software drawing, so slower than a laptop's own): a small map draw averaged 0.33 ms and took 3 ms at the slowest; it is drawn at most every 33 ms, so at 60 frames a second the
average is under 0.2 ms a frame. The HUD's whole update (the job's line, bars, learning, the small map) averaged 0.25 ms a frame once the picture was made. The picture's own slices were 1.1 ms a frame averaged over the
walk. The big map costs 17 to 27 ms once when it is opened (9 to 15 ms of it the ways) and nothing after: the game stands still.

### What reads badly (honest)

- On the big map a few road names still lie over something when there is no room: the Salt Road's long name over the Pipe, the Mall to the Boneyard over the South Ford, the Boneyard Road over Halfway Camp and part of WRECK FIELDS. Every road is named; some are cramped.
- The rises show as soft lumps like pebbles, because the land's rises are lumps; the scarps and hills to come will change that.
- At 25 m a cell the grounds' edges are soft and the road's cell leaves a faint wider halo round the pale line (the line is exact; the halo is the ground under it).
- The furnace's sight is a large hatched region and covers much of the map's left half near the bridge; the number of kilometres of each way in its sight is the better reading.
- The first second of a job shows the map filling in from the top, while the picture is made.
- Not driven in real time by Claude, and not seen on a laptop's own screen: the pictures are from a headless browser. A frame check (rule 8) is owed before players see the Scablands.

### Changed assertions, for Claude to review (rule 18)

By suite:
- `tools/test-everburn-play-fixes-a.mjs`, "third round, item 6" (the big map always has the land on it): was five places and the two gas roads of the jobs, with Tin Town's name allowed to be missing where a job's own place
  stood within 60 m (`coveredByJob`); now every place of the table and the yard, every road of the net and every crossing is named in every Everburn job, both gas runs and the battle, with no exemption, and no line of the
  job's own is drawn (only the roads and the river are strokes). Stronger, not looser. The old checks of the faint gas roads and of the small panel's job ground go: that drawing is gone.
- `tools/test-everburn-play-fixes-round4.mjs`, item 1 and 2 (numbered rings for a job's several places): the exemption `coveredByLamps` is gone (every land name is printed beside the three lamps); the numbered rings and badges
  are replaced by "the marker is the next lamp, the next flag", because the map marks one place, the next the job asks for. The checks of the style sheet and the mirror (item 3) are unchanged.
- `tools/test-scablands-job-map.mjs`: the check that a place-only job's drawing labels each place and strokes no road (the circuit panel's drawing) is replaced by: the circuit panel draws nothing in a world job.
- `tools/test-scablands-size.mjs`: the scan list gains the four new files (no assertion changed).
- `tools/test-everburn-play-start.mjs` has no exemption of that kind and is unchanged.
- No pinned number moved: the replay, combat replay and world-signature suites are unchanged.
- `tools/scenarios/run-gas.mjs`: its overlap check reads the small map's panel (`.world-hud-minimap`) where it read `#route-map`, which is hidden in a job now.

### Removed

The job's own line on the small map (`drawWorldJobMap`, `drawPlaceName`, `numberedPlaces`, the pixel rule that dropped "TIN TOWN", and the circuit panel's drawing in a world job) in `src/route-map.js`; the five-place, two-road
`src/world/scablands-land.js`; the two exemptions in `tools/test-everburn-play-fixes-a.mjs` (`coveredByJob`) and `tools/test-everburn-play-fixes-round4.mjs` (`coveredByLamps`). Other game modes use
`route-map.js` for their circuit map (`RouteMap`, `buildRouteMapGeometry`, the practice and hidden-road marks): all left exactly as they were.

## Round 4 slice 2b: the land's shape is solid, and every drawn thing is solid (14 November 2026)

Built by a Sonnet helper for Claude. Card: `docs/board/cards/SCABLANDS-LAND.md`, "Slice 2b design". No switch changed: `story-everburn` and
`scablands-runs` stay `dev`.

### Stage A: what was found before anything was changed

1. **How a Scablands car's height, slope, jumps and landings are worked out, and why the courses' rules are skipped.** The car's ground
   height is `course.groundAt`, which for the Scablands reads `scablandsSurfaceHeightAt` through the oval frame. Nothing else reads it for
   driving. The courses' climb and slope rules (`limitClimb`, `slopeSpeedDelta`, `src/offroad-physics.js`) are called only from
   `_offroadStep` (`src/sim-driving.js`), and `_offroadStep` returns at once unless `offroadCapability(car)` finds a rally car or a monster
   truck; an ordinary car has no slope rule on any course. For a rally car or a truck in the Scablands it still never reaches the rules:
   the floor is `road: true` there (`_drivingSurface`), and the rules run only "off the prepared route". `_jump` treats every arena as a
   ring of authored ramps (`arena = def.kind === 'arena'`): a car's upward speed is capped at the slope of the steepest authored ramp
   (`rampLaunchGrade`, read from `course.features.ramps`), a take-off needs a rising ground (`verticalSpeed > 1`), and a landing is scored
   only against a ramp's token. The Scablands inherits the Titan arena's three ramps (`course.js`: `else if (arena)` adds ramps at .17, .55
   and .78 of the oval and six junk cars; the Scrapdome branch skips the Scablands, the Titan branch does not), so the cap was the old
   ramps' slope (2.6 m over 38 m, about .24), which is why a bank of 8 m in 26 m was flown off in half a second with no harm and why a car
   going downhill falls with no landing at all. Nothing in the sim reads the ground's steepness, and `_supportAt` returns the plain
   ground for every car but a rally car or a truck.
2. **What already stops a car in an arena.** Four things: `containInArena` (the floor limit by distance from the oval: a hit at 30 mph or
   more takes armour through `applySceneryArmorDamage`, a glancing touch slides); `_staticContacts` (the swept box test `sweepObstacle`
   against `course.obstaclesNear`: pushed out along the nearest face, the speed along the face kept, `speed *= 1 - incoming * .94`, a
   scrape below the crash speed and a crash or armour hit above it, which is the Scrapdome's walls); the junk cars and ramps
   (`arena-junk.js`, `_crushProps`); and car-to-car (`_vehicleContact`). `sweepObstacle` already takes a box with a heading and
   `shape: 'ellipse'` for a round post, so the mechanism can carry what a grid finds. What it cannot do is the finding: `obstaclesNear`
   looks things up by the car's distance along the oval frame (64 m buckets of `s`), and 5 km from the oval the same `s` belongs to
   places kilometres apart, so the Scablands needs a grid by world position. Today `obstaclesNear` for the Scablands returns nothing
   but a town layout's solids, and `SCABLANDS_SOLIDS` (18 boxes, heading 0) is read only by tests: the player, a raider and a person on
   foot (`onfoot.js` reads `course.obstaclesNear`) all walk through everything.
3. **Every drawn thing taller than a wheel (0.9 m), and where its shape comes from.** The five places that load a model: Tin Town
   (`tintown.glb`, twenty-five blocks of the town's own buildings, 3 to 7.6 m), the Dead Mall (`mall.glb`, a walled shell 8.6 m), the
   Everburn (`everburn.glb`: one flare stack 8.3 m tall and its cap, not the 18 by 18 m box the table had), the Ridge (`kit.glb`: a row
   of props 5.7 m), and the Boneyard (`boneyard.glb`: three wrecks, whose footprint table `boneyard-wrecks.js` already holds). Drawn in
   code from tables in `src/`: Tin Town's gate (`tin-town-gate.js`: two posts 7 m, a beam, 14 m of fence on each side up to 3.3 m), the
   shacks (`tin-town-shacks.js`: forty-five shacks stacked up to three high on a layout, a water tower, a radio pole, a watchtower,
   and a fence of 2 m sheets round a ring of 88 m), the well's props (`everburn-props.js`: pots, barricades, a sign, a mast, rocks cut
   from the kit), the two braziers (`ember-pot.js`, shown only in Hot Delivery), the radio mast at the Iron Line (76 m), the Girder
   Bridge (two trusses 5.4 m high, `scablands-draw.js`) and the Pipe (a pipeline 2.65 m high beside the deck). Not drawn and so not
   solid: the Iron Line's rail and station, the Dry Dam's gate, the Ships' hulk field (those three places load no model, and their three
   boxes in the old table stood in the air), and the Ash Men's barricades (job data only). Not made solid in this slice: the people of
   `folk.glb`, Big Bess and the furnace (they move; they are targets, not scenery).
4. **How raiders, Big Bess and the furnace move.** None of them is a car. A foot raider walks a straight line toward `approachTarget`
   (`moveJobRaiders`); Big Bess and any other escorted truck step along their path nodes at a set speed (`updateJobActor`); the
   furnace steps along its own path (`stepFurnace`, `old-smoke.js`). All three write a plain position and never read a height, a
   slope or a solid. To obey the same ground and things each needs one call after its step: push the position out of any solid (a
   round or square footprint against the same boxes) and refuse a step that climbs ground steeper than a car can grip. A road that
   leads one of them through a bank or a building then has to be moved by the smallest change; that is listed under "Drivers" below.
5. **The test car 1,058 m east of the yard.** It is the size suite's own second car: `tools/test-scablands-size.mjs` starts every drive with
   `opponents: [{car: 'dusthawk_rally'}]` and parks it with `placeActor(duel, opponent, {s: start.s + course.length / 2, lateral: 0})`,
   the point of the oval opposite the yard, which lies on the east axis. It is an ordinary arena car, solid to the player (the contact
   test between two cars), so a drive along the axis at 45 mph meets it. Nothing in the game parks a car there; the fixture is moved
   off the line in the suites that drive along the axis (why the 100 mph drive passed it was not chased: the fixture is the cause).

The stop rule did not apply: nothing here changes how a car drives on a race course or in the Scrapdome (every change is behind
`course.def.scablands`), no replay fingerprint can move, and the save does not change.

### Stage B: what was built

Behind `course.def.scablands` only: race courses, the Scrapdome and every replay never run any of it.

- **The ground's rules** (`src/sim-scablands.js`, numbers in `src/world/scablands-ground-rules.js`). Called by the arena event after a car's move and before its flight, for the
  player and every computer car. A slope pulls a car by the courses' own function (`slopeSpeedDelta`, the truck's gravity): going up slows it, going down speeds it, and the
  ground's top-speed pull takes any gain back. A step up ground steeper than .30 (a tyre grips 16 degrees) is not taken: the car is put back where it was, keeps the part of the
  move that runs along the face, is pushed back .35 m down it, and takes the speed into the face as a hit with the Scrapdome wall's own consequences (speed times
  `1 - incoming * .94`, a dent or a scrape below the crash speed, armour at it). The ember reads the speed shed through `hitKmh` as it does for any hit.
- **Flights and landings** (`_jump`, `src/sim-driving.js`). The Scablands is no longer treated as a ring of authored ramps (it had inherited the Titan arena's three, which capped every
  flight at their slope; they and the six junk cars are gone from `course.js`). A car leaves the ground over a crest as before, and now also over a lip: where the ground falls away
  more than 15 cm further in a step than the car's own free fall gives. It leaves with the speed it had on the ground, and its landing is a hit sized by the speed it fell at:
  nothing under a metre of drop, 20 km/h of hit at 2 m, 34 at 3 m, 86 at 8 m (`fallHit`); armour taken is half of the car's at 8 m, never the last point. The ember takes the
  hit's km/h through `state.scablandsHitKmh` (read once by `world-job.js`): 8 m puts it out at any speed.
- **Crossings.** The Wash and the South Ford are one long ramp from the middle of the bed to 92 m out (a slope of .05 at most), so a car takes them at the road's top speed
  without leaving the ground (it did leave it, and fell 4 m, at 233 km/h). The Steps are the scab rock cut into ledges, eased half way back toward the plain bank so that a
  riser climbs .9 at most (the terraces alone climbed 1.26): a car at 25 km/h or under climbs them (the limit is 1.0 there and a slope pulls a quarter as much), a faster one meets
  the .30 limit at the first riser, is thrown back with a hit and loses its speed. The ember is safe there only under 20 km/h (`DRIVE.steps`: the scab plates' cue and dust,
  their own numbers). Their way is marked: a worn lane with a dashed line, a cairn every 16 m and four painted posts (solid) where the ledges meet the plain
  (`createStepsWay`, `stepsWayFor`). The Girder Bridge has a solid truss each side (7.4 m from its middle) and three piers; the Pipe's deck is one car wide with its pipeline
  beside it, three piers and eight posts, and a car that leaves its side falls 8 m into the bed.
- **Solids** (`src/world/scablands-solids.js`): 201 solids, every drawn thing taller than a wheel (0.9 m), as a box or a round post cut from the data that draws it. Tin Town's
  model (13 blocks), the Dead Mall's (72), the Ridge's kit (3) and the Everburn's well (a post 2.3 m across, 8.5 m high) are cut from the real model files at a cell of 1 m, with
  0.3 m added on every side; the Boneyard's three wrecks are the table `boneyard-wrecks.js` holds; Tin Town's gate (two posts, two fences), shacks (one box for each stack, the
  water tower, the watchtower, the radio pole) and ring fence (runs of four sheets) come from the lists `tin-town-gate.js` and `tin-town-shacks.js` draw from (the fence
  is one pure function, `tinTownFence`, that the drawing now reads); the well's props (pots, barricades, sign, mast, three rocks; the fourth rock is under a wheel) from
  `everburn-props.js`'s own table and sizes; the radio mast; the bridge's and the pipe's trusses, piers, pipeline and posts; the Steps' four marker posts; the braziers of Hot
  Delivery while that step is on. A grid of 32 m cells by world position finds them (`solidsNear`, `pushOutOfSolids`); the arena's own `_staticContacts` does the rest:
  the car is stopped, pushed out along the nearest face, keeps the speed along the face and takes a hit for the speed into it. The things under or over a deck carry
  `verticalClearance`, so that a car on the deck passes over the piers and a car in the bed passes under the trusses (the deck itself is ground, see "What I could not do").
- **Raiders, Big Bess and people on foot.** A foot raider's step and the escorted truck's step go through `stepMover` (`src/world/scablands-movers.js`): not up ground steeper
  than 40 degrees (a person) or .30 (a truck), pushed out of a solid. A truck within the place's own radius of the last place of her road is let into it
  (Tin Town's alley is too narrow for her). `onfoot.js` reads the same grid for the walker's sweep. The furnace follows its own path and does not obey the ground or the
  solids (its path is data; it is checked clear of both below).
- **Scarps** (`src/world/scablands-scarps.js`): four, each a table of raised ground with a face twice as wide as it is high (a slope of .75) and a back that dips away at .07
  over 300 m; each stretch fades out at its ends over 140 m, which is the way round. West scab (14 m, north of the short cut at 1,750 m east, with the short cut passing at
  its south end), East scab (18 m, at 3,500 m), the camp scarp (12 m, 560 m north of the halfway camp, face to the south) and the Ridge scarp (20 m, 740 m south of the Ridge, face
  to the north). No road lies on ground a scarp raises and the nearest is 200 m from a foot. The ground's shader draws a face (a slope of .35 or more) as broken blocks
  with dark joints and pale scree where it eases.
- **Jobs and drivers.** Where a scripted route now met a bank or a building it was moved the least that clears it, each listed under "Drivers and routes" below.
- **Names.** Every new position is a place of the land, a share between places, or a point of a road (`roadPointFrom`); the bare-position scan of
  `tools/test-scablands-size.mjs` covers `scablands-solids.js`, `scablands-scarps.js`, `scablands-ground-rules.js`, `scablands-movers.js`, `everburn-props.js` and `sim-scablands.js`.

### Numbers chosen, and why

| Number | Value | Why |
| --- | --- | --- |
| Slope a tyre grips | .30 | roads climb at most .12 and rises .085; the river's banks climb .46 and a scarp .75, so neither can be climbed by any car |
| Steps climb limit | 25 km/h, slope 1.0, slope pull x .25 | the card; the terraces climbed 1.26, now eased to .9; a car coming down the ledges speeds up, so the working speed is 20 or less |
| Fall hit | 0 under 1 m; 20 * (drop - 1)^.75 km/h; armour .5 * (drop - 1) / 7 of the car's | 3 m is 34 km/h (the ember loses 50: hard), 8 m is 86 km/h (the ember is out) and half the armour |
| Leaving a lip | 15 cm beyond free fall in a step | a smooth bank is not a lip (a car at 30 km/h drives down it); a deck edge or a ledge is |
| Wash and Ford ramp | bed middle to 92 m out | the narrowest slope that a car at 250 km/h takes without leaving the ground; 92 m is the gorge ribbon's reach, so the drawn and driven shapes agree |
| River head | 980 m east of the Dry Dam (it was 300) | the gas run's long road and Old Smoke's way turn at the Dam's east side and crossed its rounded end |
| Scarp faces | 12 to 20 m, 2:1, back 300 m, ends 140 m | slope .75 reads as rock in the shader and is too steep to grip; the ends are open ground, climbable under .30 |
| Solid margin | 0.3 m | the models' cells are 1 m |

### Drivers and routes (each place a scripted route met a bank or a building)

- **Job 4, Slow Ride** (`everburn.js`): Big Bess's road was Boneyard, camp, Tin Town as two straight lines, which crossed the river's bank twice. It is now her own resting place, the
  wreck field's west edge, the Wash, the camp, the East Road 150 m before the Girder Bridge, the bridge, 150 m after it, Tin Town (7,376 m). The first ambush is .4 of the way from the
  Wash to the camp (30.5 percent of her road, where the furnace begins to pace her), the second half way from the bridge to the town. The bridge's deck is 14 m wide between solid
  trusses, so those places are points of the East Road itself (`roadPointFrom`).
- **Old Smoke's way home** (job 6): three places added between the second gate place and the camp (the bridge and 150 m either side of it); the `run-back` leg is now the 20th place.
- **The river's head** moved from 300 to 980 m east of the Dry Dam (the long gas road and Old Smoke's way turn at the Dam and crossed its rounded end).
- **The Boneyard Road** bends once, 280 m west and 50 m south of the place, and comes in on the side of the Mall road, 10 m clear of the south wreck: its old straight line in ran
  through the wreck, and a road cannot turn tighter than 450 m to pass between the wrecks. It still ends at the place's approach point, so the map's way by the roads is unchanged.
- **Tin Town's alley**: the town's centre lies in an alley 3 m wide, which a truck cannot enter; a truck within a place's own radius of the last place of her road is let into it (she may stand in
  a solid there). Hot Delivery arrives within 18 m of the centre, which the car does at the town's south end.
- **Test drivers** (not the game): the ember test's East Road driver aims 25 m ahead near the gate (it cut past the post); its short cut goes over the Steps at 20 km/h (the straight line
  crossed the bank); its hit on "a pair of junk cars" is a hit on a Boneyard wreck; the size suite's drive from the yard to Tin Town follows the East Road; Old Smoke's young driver follows
  the furnace's trail where the straight line to it crosses the river (it fell into the gorge) and its time limit is 4,000 s; the harness's own second car stands at the far corner.
- **Survey Flags** (`everburn.js`): the fifth flag stood on the Ridge's top (`at('ridge', 6, 4)`), 18 m up, with a slope of 1.3 to 1.5 on every side: no car can climb it (a tyre grips .30). The flag
  is now at the Ridge's foot, the road's own approach point (`at('ridge', -74, 104)`, the point the long gas road and the furnace's trail already use). This is a change to where a player goes: Claude may want the
  flag back on the top with a ramp built (see "What I could not do").
- **The Easy driver** (`tools/test-everburn-easy.mjs`, a test, not the game): it now follows the East Road for Hot Delivery until 45 m from Tin Town (aiming 70 m ahead, 25 m near the gate, 14 mph in the
  last 250 m), backs out for 1.5 s when it has not moved for a second, drives forward in a wide turn (it used to back the whole way in reverse at 22 mph when its goal lay behind it), steers round the first wreck,
  wall or post in the way of a straight run (a point 20 m to 1.1 km to one side), takes a search (Survey Flags) along the map's shortest way over the roads (`roadWay`, runs of up to 1.5 km at each end), and
  where a straight run goes in at one bank of the river and out at the other it takes the Wash or the South Ford (a small graph of the car, the goal and the crossings' in and out points). Result: all nine jobs 10/10.
- **Scenarios**: `everburn-frames` finds the first ambush along Bess's road (not on its first leg); `everburn-ember` starts its last drive on the road in line with the gate's opening.

### What I could not do, and what looks or drives wrong

- **The river bed cannot be driven under the Girder Bridge or the Pipe.** The land has one height for each point and a deck is level with the plain, so each deck stands across the
  bed as a wall 8 m high and the bed is a dead end at the bridge (from the Wash north) and at the Pipe. The card's fourth way (the bed from the Wash to the Steps) is therefore driven only
  as far as the bridge and out again by the Wash (`test-scablands-solid`, "the four ways"). A second layer of ground under decks is a change to what a car reads (and to what the camera
  and the picture read); it was not made here. Claude: this wants a decision.
- **The Ridge's top cannot be reached by a car** (see Survey Flags above). The same holds for any place on it: the ridge is a cone 18 m high with a slope of 1.3 to 1.5 on every side and a rock kit on top. A ramp
  (a way up at .30 or less, 60 m or more long) is a change to the land's height tables and wants Claude's design.
- **The furnace and Big Bess are not solid** to a car (they move; they are targets), and the furnace does not obey the ground or the solids (it follows its path).
- **Scarps read dark.** The detailed ground's cells are 23 m by 17 m, so a face 28 m wide is drawn as one or two sloped cells; the rock look keys on the mesh's slope and reads weak, and the
  four scarps look in the pictures like a long dark rise against the dark plates and a bare horizon, not like broken rock. The shader's threshold was lowered (a slope of .25), not enough.
  A face wants cells of its own or a hand-built mesh.
- **The gate's fence blocks every approach but the opening**, and Tin Town's alley is closed to a car 2 m wide at its south end (the blocks leave 2.4 m): the town is a place to leave the car at.
- **Mid-hit speed**: a car pressed against a long wall at a fixed heading loses about a tenth of its speed each step (the Scrapdome wall's own rule); a driver steers off.
- **Chases take longer** (the young driver's Easy chase 1,042 to about 1,300 s, the careful Medium driver's 1,204 to 1,527 s): a slope pulls a car down going up and the ground's limit takes nothing back
  going down. The play numbers belong to the jobs' remake.
- The old crash `scrape` fires at about 3 mph into a face; a very slow touch is a push-out with no hit event (the threshold is 3 mph).

### Changed assertions, for Claude to review (rule 18), by suite

`test-scablands-regions`: the table of how each ground drives gains the Steps (.35, .85, 20 km/h; their own id, cue and dust are the scab plates').
`test-scablands-scene`: the 18-box solids table (and the six cluster boxes and two posts) is replaced by checks on the new list: every solid taller than a wheel, a box or a round post, named once; each shack stands in
its slot's solid; the tower, watchtower and pole are solid; the places that draw nothing have none; job 4's furnace sighting is read along all of Slow Ride's legs.
`test-scablands-size`: the yard-to-Tin-Town drive follows the East Road (7,838 m, expected time from the logged speeds, within 1.5 s; the car stays within 14 m of the line); the harness's second car stands off the
road; the moving-a-place check leaves out the bridge's trusses and piers, the pipe's posts, the Steps' posts, the ring fence, the bridge-side job places and the second ambush (positions that follow a road's bend or the ground's
flatness, not a share of a place); the bare-position scan covers six more files.
`test-ember-pot`: see "Test drivers" above; the three drives keep their rule (East Road bright 72.4 after 194 s; the short cut by the Steps arrives alive, 32.8 in 458 s; 29.9 km/h goes out at 5,856 m / 4,940 m).
`test-everburn-play-start` (366 checks, was 358), `test-field-battle`, `test-run-gas`, `test-old-smoke`: solids are measured in their own frame; the town's box is the 13 blocks' bounding rectangle; the gate's fences keep the posts'
3.4 m (they stand further from the road than the posts); a path on the bridge keeps 4 m from a truss; old-smoke's path list has the three bridge places and its third leg begins at the 20th; Slow Ride's first ambush and restart place
are at the Wash stretch; Old Smoke's young driver and its limit as above.
`test-everburn-easy`: the driver only (see "The Easy driver" above); the claim (at least 8 of 10 finish) is unchanged and no assertion was touched.
`test-rail-region`: its copy of the land's height adds the scarps.
New: `tools/test-scablands-solid.mjs` (16 tests) and the browser scenario `scablands-solid`.
Counts that rose without a claim changing: `test-field-battle` 796 to 4,639 and `test-run-gas` 1,118 to 3,680 (one check for each solid for each road piece).

### Checks run, and their results

Run on this branch with `integration/wasteland` (slice 4, the map) merged in, in PowerShell, memory-only saves.

| Check | Result |
| --- | --- |
| `test-scablands-solid` (new, 16 tests) | pass |
| `test-scablands-regions`, `-size`, `-scene`, `-ground`, `-map`, `-job-map`, `test-rail-region`, `rail-steps`, `iron-line` | pass |
| `test-ember-pot` | 50 checks pass (East Road bright 72.4 after 194 s; short cut by the Steps alive 32.8 in 458 s; 29.9 km/h out at 5,856 m and 4,940 m) |
| `test-everburn-play-start` | 366 checks (was 358); `-screens-start` 9; `-play-fixes-a` 388; `-play-fixes-round4` 48; `-line-audit` pass |
| `test-everburn-easy` | all nine jobs and both gas roads at all four feud words, 10 of 10 (see "The Easy driver") |
| `test-run-gas` | 3,680 checks; `test-run-gas-medium` pass (2,708 s) |
| `test-field-battle` | 4,639 checks |
| `test-old-smoke` | 4,089 checks; the young driver won 10 of 10 chases on Easy |
| `test-ember-side-jobs`, `test-world-job-mode`, `test-arena-settlement` | pass (216 checks for the side jobs) |
| `test-circuits` | 232,142 and 232,138 checks pass |
| `test-replays` | 297 checks, fingerprints unchanged |
| `test-combat-replays` | 12 checks, fingerprints unchanged |
| Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`) | 271 of 273 passed. The two others: `test-review-evidence` (the sheet `round-6.jpg` has no review note yet: Claude's to write) and `test-everburn-easy` (stopped by hand in that run while its driver was being corrected; it passes on its own, above) |
| `npm run build` | pass |
| Browser scenarios `everburn-ember`, `everburn-frames`, `scablands-size`, `scablands-regions`, `scablands-solid` | all pass, 0 warnings, 0 errors |

Frame and picture numbers, as a guide only (Performance, laptop in use, not a frame check): `everburn-frames` p95 16.8 ms, first load 19.5 s, world build 117 ms. `scablands-size` at the five spots:

| Spot | Draw calls | Triangles | p95 |
| --- | --- | --- | --- |
| Yard, east | 140 | 184,292 | 16.8 ms |
| 1 km | 174 | 196,902 | 16.8 ms |
| 3 km | 141 | 208,620 | 16.8 ms |
| 5 km | 179 | 201,384 | 16.8 ms |
| Tin Town's gate | 250 | 251,120 | 16.8 ms |

The 14 views of `scablands-solid` draw 133 to 242 calls and 174,000 to 297,000 triangles. The sheet `docs/board/looks/scablands-land/round-6.jpg` (12 views, 371 KB) is made; its review note is Claude's.

### Removed

The three ramps and six junk cars the Scablands inherited from the Titan arena; the 18-box `SCABLANDS_SOLIDS` table, its `tin-town-shell`, `dry-dam-gate`, `ships-hulk-field`, `iron-line-station` and `ridge-rocks` boxes (the last four stood where nothing is drawn, or
far larger than what is); the straight drives and the straight legs of job 4 across the river; the terraced bank's 1.26 risers. Nothing a player can reach.

## Realism trial, step 1: light and air (Claude, 14 November 2026)

Card section "Kyle on realism". Behind a new switch, `scablands-realism` (`dev`, off for players).

### What was built

- `src/world/scablands.js`: `SCABLANDS_LIGHT`, the trial's light, carried on the venue as `trialLight`: the sun's place, colour and
  strength, the sky's light, the sky's and haze's colours, the haze's start and end, the exposure, the cloud cover, and the shadow box
  (`shadowReach` 100 m, `shadowAhead` 45 m, `shadowFar` 560 m).
- `src/scene-lighting.js`: a course's `trialLight` is laid over the day's look in place of its `light` when `useTrialLight()` says so
  (asked once for each course). A light may widen the sun's shadow box; a widened box lies ahead of the camera and moves in whole shadow
  texels so that shadow edges do not crawl. With no trial light the box, the sun's place and every setting are computed as before.
- `src/render3d.js`: passes the switch's answer to the lighting.
- `tools/scenarios/scablands-realism.mjs`: the before-and-after pictures (switch off, then on) at seven places on Performance and one on
  High, with draw calls, triangles and the time between frames, and the sheet.

No game event is added, so no sound cue.

### Checks

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, from PowerShell): lane tier 89 of 92, and the three that failed pass after the new switch was counted in the two lists that pin the switches (`tools/test-feature-flags.mjs`, `start-preview.bat`); replays unchanged.
- `npm run build`: passes.
- Browser, visible window, memory-only saves: `scablands-realism` passes, 16 pictures. Draw calls and triangles before and after are the
  same within a few per cent (134 to 303 draw calls, 177,000 to 320,000 triangles); the time between frames is the screen's 16.7 ms in
  both. Not a frame check (rule 9).
- One independent review of the code (a Sonnet reviewer, read only): no real faults; with the switch off the sun's place, the shadow box and every setting are computed exactly as before. On its
  advice the sun's light starts 320 m from the shadow box's middle (it was 220 m), so that a hill on the sunward edge still throws
  its shadow. Left as they are: the box jumps when an inspection camera looks straight down, and a switch turned mid-course takes
  effect at the next course.
- Race fingerprints: unchanged (no rule of a race is touched).

### Changed assertions, for the card (rule 18)

- `tools/test-feature-flags.mjs`: the count of switches is 55 (was 54) and `scablands-realism` joins the list that must be `dev`.
  Nothing is loosened: the new switch is pinned off for players like the others.
- `start-preview.bat`: the Preview's list of dev switches gains `scablands-realism`, as `tools/test-preview-launcher.mjs` requires.

### Removed

Nothing. The old light stays for players until the trial's three steps are judged; the card says what is removed when the switch goes on.

## Realism trial, step 2: photographed surfaces (Claude, 14 November 2026)

Card section "Realism trial, step 2 result". Behind the switch `scablands-realism` (`dev`, off for players).

### What was built

- `public/assets/textures/scablands-*-colour.jpg` and `-relief.jpg`: twelve pictures, 4.9 MB, made by `tools/art/scablands-ground-photos.py`
  from six Poly Haven surfaces (CC0) kept in the art library. Credits in `public/assets/textures/CREDITS.md`; sources and checksums in
  `tools/art/catalog.json`.
- `src/world/scablands-ground-look.js`: `GROUND_PHOTOS` (file, true size and average colour of each), `loadGroundPhotos`, and in the
  ground's and the road's shaders the photograph's grain (multiplied into the colour drawn in code) and relief (added to the ground's
  own direction). Each photograph is read at two sizes, the larger turned, blended by how much ground a pixel covers. With no
  photographs the shaders and their cache keys are the ones from before.
- `src/world/scablands-scene.js`: loads the photographs when the switch is on and there is a screen, hands them to the ground and the
  road, and disposes of them with the scene.
- `tools/scenarios/scablands-realism.mjs`: unchanged; its sheet for this step is round 9.

No game event is added, so no sound cue. No rule of a race is touched.

### Checks

- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`, from PowerShell): 80 of 82. The two that failed (`test-p4-kits`, `test-tanker-valve-source`) pin the art catalogue's
  earlier rows; the six new rows are left out of each pin as the wildlife rows are, and both pass. Replays unchanged.
- `npm run build`: passes.
- Browser, visible window, memory-only saves: `scablands-realism` passes, 16 pictures; draw calls and triangles as in step 1; the time
  between frames is the screen's 16.7 ms before and after. Not a frame check (rule 9).
- One independent review of the code (a Sonnet reviewer, read only): three points, all put right and confirmed by a comparison in Node and by retaken pictures.
  (1) With the switch off the ground's shader text was not byte for byte the old one (three unused lines). It is now: the text, cache
  key, defines and uniforms of the ground with regions, the plain ground and the road are identical to the commit before. (2) The road's
  relief tilted a level plane, not the road's own slope; it tilts the road's slope now. (3) The scene and the renderer read the switch
  from two names: they are the same catalogue (`app._switches()` returns the base of the race's switches, which is the shared one).
  Also on its notes: only the size of a photograph that shows is read, and a bank or steep rock takes the other grounds' place in the
  relief.

### Changed assertions, for the card (rule 18)

- `tools/test-p4-kits.mjs` and `tools/test-tanker-valve-source.mjs`: each pins a checksum of the art catalogue's earlier rows. Rows of
  card SCABLANDS-LAND are left out of the pinned set, as rows of WILD-ART-SRC already are. The checksums are unchanged, so every
  earlier row is still protected.

### Removed

Nothing. The ground drawn wholly in code stays for players until the trial is judged; when the switch goes on, the code's own fine
grain that a photograph replaces is removed in that change.

## Removed

The four near ground tiles and the one far mesh of 2,800 by 2,000 m (replaced by the window and the coarse ground), `lowerFarUnderNear` and the
far ground's 40 m drop, `detailCounts`, and every typed coordinate of the land in the jobs, solids, wrecks, gate, shacks and rail (replaced by
`scablands-names.js`). The Whites' absolute positions. Nothing a player can reach.


## Round 4 slice 2b: fixes after the review

### Job solids

Braziers now belong to the current job. Cars, people on foot and job actors use that job's list, while the fixed land grid stays shared. Ending a job leaves no braziers in another event. No new game event or sound cue was added.

Checks: `test-scablands-solid` passes all 17 tests, including two jobs at once, a later event and repeat inputs after a job; `test-onfoot` passes 9 tests; `test-world-job-mode` passes. The other card checks, replay fingerprints, lane tier, build and browser scenario remain to be run after the remaining fixes.

Changed assertions: none. A new isolation test was added.

### Removed

The shared grid's mutable extra-solids list was removed.

### Big Bess's stopping places

The truck now obeys solids all the way to her destination and does not mark a blocked step as arrived. Both gas roads and Slow Ride stop clear of Tin Town's buildings. Slow Ride's bridge waypoint moves 10 m along the road, clear of the pier. The gas jobs use the destination of their own road. All stopping and restart points, including each truck's actual start, are checked against every solid with 1.8 m clearance. No new game event or sound cue was added.

Checks: `test-run-gas` passes 8,504 checks, `test-field-battle` passes 4,639, `test-world-job-mode` passes, and `test-scablands-solid` passes 17 tests. The remaining card checks, replay fingerprints, lane tier, build and browser scenario remain for the completed card.

Changed assertions, for Claude to review: the two gas-road end coordinates changed from Tin Town's centre to offsets (-18, -13.5) and (-10, 25) m. Their pinned lengths changed from 18,626 to 18,604 m and 12,349 to 12,322 m. The battle's appearance and start distances changed from 5,494 to 5,482 m and 5,414 to 5,402 m because they follow the shortened road. Its turn-around test starts 15 m from the end instead of 30 m and runs for 1 second instead of 3, so it checks the same turn before reaching the preceding bend. Its heading tolerance is unchanged.

Removed: the exemption that let the truck pass through solids near the last stop.

### Furnace roll, in progress

After the third door is hit, the furnace follows the remaining bends of its path to the well. Its roll still takes at least five seconds and respects its speed limit. The test now checks a bent path and places a forced rear-door hit on the last leg. No new game event or sound cue was added.

Check: `test-old-smoke` passes 4,092 checks, including 10 of 10 Easy chases. Race fingerprints have not yet been checked after this change. Changed assertions: none. The forced-hit setup was moved onto the last leg; its checks are unchanged.

Removed: the straight line from the last hit to the well.

### Furnace return, in progress

After a missed chase, the furnace follows its path backwards to the start of the current leg. A bent-path check covers the turn. No new game event or sound cue was added. The three-lap test drives for five path lengths instead of three so that it includes the two longer returns; its assertions are unchanged.

Check: `test-old-smoke` passes 4,094 checks, including 10 of 10 Easy chases. Race fingerprints have not yet been checked after this change.

Removed: the straight return from the well to the start of the leg.

### Still to do

Check every furnace path for solids and steep ground, and move any unsafe paths. The three refused assertions and per-step allocations also remain. Merge integration into this lane and run the complete card checks before handover.

### Furnace well clearance, in progress

The chase starts and ends on the two sides of the well's solid post, clear of it. The old clearance test now includes the post on both pieces. No new game event or sound cue was added.

`test-old-smoke` passed 4,097 checks and 10 of 10 Easy chases. `test-scablands-size` passed 9 tests and `test-scablands-solid` passed 17. The path's closest clearance in the existing test was 7.4 m. Race fingerprints, the build and the lane tier remain to be checked after the other fixes.

Changed assertions, for Claude to review: the chase used to start and end at the well's centre. It now starts at offset (-5, -10) m and ends at (12, 3.5) m, so neither path crosses the post. The endpoint test now pins both positions. The former exception for the well post was removed from the clearance test.

Removed: the chase path through the well post.

Still needed: the fall now happens 12.5 m from the well's centre and must be made visually convincing while keeping the path clear. The three refused assertions and per-step allocations remain.

### Furnace roads, in progress

The battle furnace can return all the way to the beginning of the Boneyard road. Its old starting point crossed the well post. The road now starts 12 m east and 3.5 m south of the well, clear of the post. Both complete furnace roads are checked at intervals of at most 2 m, with 2.62 m clearance and the land's climbing limit. The check accounts for the height of bridge piers under the deck. It found no gate-post collision on the current road. No new event or sound cue was added.

Checks: `test-scablands-solid` passed 18 tests, `test-run-gas` passed 8,504 checks, and `test-field-battle` passed 4,639 checks. Race fingerprints, the other card checks, lane tier, build and browser scenario remain to be run after the remaining fixes.

Changed assertions, for Claude to review: the Boneyard road starts at offset (12, 3.5) m instead of the well centre, and its length pin moves from 12,322 to 12,310 m. The battle furnace's appearance and start distances move from 5,482 to 5,477 m and 5,402 to 5,397 m because they follow that road. The tolerances are unchanged.

Removed: the Boneyard road's start through the well post.

### Restored checks after review

The scene check again requires a solid for each place that draws one, and checks that every solid is within 100 m of its own place or crossing. The moving-place check now checks the bridge trusses and piers, the Pipe, the Steps' posts, the ring fence, the bridge-side job places and the second ambush against their own placement rules, within 1 m.

Changed assertions, for Claude to review: the Old Smoke chase limit was 1,500 seconds before slice 2b, was raised to 4,000 seconds, and is now 1,753 seconds. The slowest measured run was the Medium driver at 1,523.5084 seconds; 15 percent headroom, rounded up, gives 1,753 seconds. The Easy driver took 1,129.025 seconds on each of ten seeds. The restored placement checks add requirements and do not loosen the other assertions.

Checks: `test-scablands-scene` passed; `test-scablands-size` passed all 9 tests. `test-old-smoke` passed all 4,097 checks with the new limit, including 10 of 10 Easy chases. The other requested checks remain to be recorded. No game event or sound cue was added.

Removed: the missing placement checks and the 4,000-second chase limit are replaced by the checks above.

### Car-step allocations

The Scablands car step reuses its world positions, slope input and collision point per game, and calls the existing height function directly. The step reads the course sampled positions directly using the same calculation as the course. Other callers are unchanged. No game event or sound cue was added.

Removed: the car step's repeated temporary position and slope objects and its new height function.

Checks after the review fixes: `test-scablands-solid` passed 18 tests; `test-scablands-scene`, `test-scablands-size`, `test-old-smoke`, `test-run-gas`, and `test-field-battle` passed. `test-everburn-easy` passed: all nine jobs and both roads at all four feud levels finished 10 of 10, and the battle was won 10 of 10. `test-replays` passed 297 checks over 33 cases; `test-combat-replays` passed 12 checks over four encounters. The recorded race fingerprints are unchanged.

For Claude to run: the `scablands-solid` browser scenario, with memory-only saves, and the card's drive checks in a visible window: bank and lip, Steps, bridge, shack, wreck, gate post and girder, crossings and all four routes. Chrome cannot start in this job.

Changed assertions, for Claude to review: the car-step allocation fix changed none. The earlier fixes and restored checks are recorded above, including the old and new values. Codex decided: no new design choice. The switches remain off.

Lane tier: 258 of 274 suites passed. `test-run-gas-medium` passed all targets. `test-everburn-play-start` failed because the last segment of the long gas road comes within 8 m of the old single Tin Town bounding box. The revised stopping place is clear of the actual solids, as `test-run-gas` and `test-scablands-solid` check. The old assertion was not changed; Claude must decide how to reconcile the box check with the new stops.

The known job-environment failures were `test-audio`, `test-arsenal-core-audio`, `test-arsenal-wave1-audio`, `test-arsenal-wave3-audio`, `test-audio-listening`, `test-circuit-eifel`, `test-combat-audio`, `test-deep-audio`, `test-deep-phone`, `test-lab-radio`, `test-p4-audio`, `test-warlord-blackiron`, and `test-warlord-tollkeeper` (recordings or ffmpeg), `test-full-check` (fixture cleanup), and `test-review-evidence` (audio analysis). Claude should rerun them at merge. The build passed with `npm.cmd run build`.


### Long gas road assertion after Claude's ruling

Claude ruled that the Tin Town bounding rectangle was an approximation of its solids. The old check required each long gas road piece to stay 8 m from that rectangle unless it ended at the town centre, and required an end inside the rectangle to be at the centre. The new check requires every point of every long gas road piece, including its stopping place, to clear every Tin Town solid by Big Bess's 1.3 m half width plus 0.5 m. Each solid is measured in its own frame, and the minimum distance covers the whole segment. The other jobs keep their existing checks.

Checks: `test-everburn-play-start` passed 982 checks; `test-run-gas` passed 8,504 checks; `test-scablands-solid` passed 18 tests; `npm.cmd run build` passed with bundle size warnings. The earlier lane-tier failure in `test-everburn-play-start` is resolved by Claude's ruling and this passing check. The known environment failures and the browser checks for Claude remain as listed above. Race fingerprints are unchanged from the replay checks recorded above; this change affects only a test. No new event or sound cue was added.

Codex decided: no new design choice.

Removed: the long gas road's bounding-rectangle approximation, replaced by the individual-solid clearance check.

### Round 4, slice 2c: dunes in progress

Four soft dunes now rise 10 to 14 m around the Ships. Their centres follow the Ships when that place moves. They clear all the roads, and an empty hill table leaves the previous terrain height exact. The existing sand driving rules supply the ground cue `world.ground.sand`; no new event or cue was added. The Scablands switches stay off.

The hills are not finished. The Breaks, mesas, Ridge foothills and way up, Lookout, drawn detail, sight and search, uneven outlines and the requested picture scenario remain. Survey Flags' fifth flag has not moved.

Checks: `test-scablands-hills`, `test-scablands-size` and `test-scablands-solid` passed. The course-kit world-signature check passed; race replays passed 297 checks and combat replays passed 12. The Easy driver finished all nine jobs and both gas roads at all four feud levels on all ten seeds; the battle was won on all ten. The lane check passed 33 of 34 suites. `test-full-check` failed in the known temporary-copy setup: its PowerShell process was denied (`spawnSync pwsh EACCES`). The build passed with bundle warnings.

For Claude to run: `test-full-check` in the laptop environment. The requested memory-only hills picture scenario still needs to be written after the remaining terrain is built, then run and judged by Claude.

Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: none in this partial step; the old ground remains outside the dunes.

### Round 4, slice 2c: the Breaks in progress

Three rolling hills rise 48 to 72 m in the south-west between the yard and the Dead Mall. Their crests are about 707 m apart, with a narrow valley between the shoulders. Each hill follows the Mall if it moves. The hill shoulders clear every road, so they do not change the existing road slopes. Survey Flags' fifth flag has not moved. The Scablands switches remain off. No new game event or sound cue was added.

The Breaks are only a start: the other hill areas, full route and Easy driver checks, ground drawing, sight and search, natural outlines and the picture scenario remain to be built and checked.

Checks: `test-scablands-hills` passed 3 tests, `test-scablands-size` passed 9, and `test-scablands-solid` passed 18. Race replays passed 297 checks across 33 cases, combat replays passed 12 checks across four encounters, and `test-course-kit` passed 8 tests. The recorded race fingerprints and world signatures are unchanged. Integration was already included.

The lane tier passed 32 of 34 suites. `test-everburn-easy` failed: Survey Flags finished 0 of 10 runs, against its unchanged requirement of at least 8 of 10. The sample car was stuck near the river while seeking the fourth flag. The cause is not yet established, and the remaining Easy-driver jobs and gas roads have not been checked by that run. `test-full-check` failed in the known temporary-copy setup when `pwsh` was denied (`EACCES`). The build passed with bundle size warnings.

For Claude to run: `test-full-check` on the laptop. The hills picture scenario still needs to be written and then run and judged by Claude. The next builder must investigate Survey Flags and rerun the Easy-driver check; this partial step is not ready to merge.

Changed assertions, for Claude to review: none. Codex decided: no new design choice.

Removed: none in this partial step; the old ground remains outside the hills.

### Round 4, slice 2c: distant ground in progress

The distant ground now has 70 by 62.5 m cells instead of 140 by 125 m cells. Its one mesh keeps the existing ground material and calculated vertex normals. Its draw call count stays at one; its triangles rise from 16,000 to 64,000. These are mesh counts, not a measured whole-scene performance result. The scarps, Steps and river banks still need their own detailed drawing. The switches remain off. Survey Flags' fifth flag has not moved. No new game event or sound cue was added.

Checks: `test-scablands-scene`, `test-scablands-hills` (3), `test-scablands-size` (9) and `test-scablands-solid` (18) passed. `test-replays` passed 297 checks over 33 cases, `test-combat-replays` passed 12 checks over four encounters, and `test-course-kit` passed 8 tests. Race fingerprints and world signatures remain unchanged. The build passed with bundle size warnings. Integration was already included.

Changed assertions, for Claude to review: none. The scene test's yard vertex index moved from 4,090 to 16,180 to address the same yard point in the finer grid; its claims are unchanged. New checks require the finer grid, its triangle count and normals. Codex decided: no new design choice.

Removed: the former 100 by 80 cell distant ground is replaced by the finer grid.

Still needed: investigate the Easy driver's Survey Flags failure; finish the other hill areas, roads and driver checks, detailed faces, sight and search, natural map outlines and the requested picture scenario. Claude must run and judge the picture scenario when it is written. The card is not ready to merge.

Lane tier: 39 of 41 suites passed. `test-everburn-easy` again failed Survey Flags, 0 of 10 against the unchanged minimum of 8; the other eight jobs each finished 10 of 10 before the test stopped. The sample car stopped near the river while seeking the fourth flag, at approximately (1879, -1525); the cause remains unknown. Gas roads were not reached. `test-full-check` failed in the known fixture setup because `pwsh` was denied (`EACCES`). Claude should rerun that suite on the laptop. The build passed before the lane tier on the same code.

Cockpit sync could not open its protected credential in this session. The repository audit ran; its candidates are advisory and none were removed.

### Round 4, slice 2c: the Lookout in progress

The Lookout rises 45 m above the former ground south-west of the Ridge. Its 60 m radius top is level, its view towards the yard is clear, and its shoulder leaves every road clear. It follows the Ridge if that place moves. Survey Flags' fifth flag has not moved. The switches remain off. No game event or sound cue was added.

Checks: `test-scablands-hills` passed 4 tests, `test-scablands-size` passed 9, and `test-scablands-solid` passed 18. Race replays passed 297 checks across 33 cases, combat replays passed 12 across four encounters, and `test-course-kit` passed 8. Race fingerprints and the checked world signatures remain unchanged. Integration was already included. The build passed with bundle size warnings.

The lane tier passed 39 of 41 suites. Survey Flags again finished 0 of 10, against the unchanged minimum of 8; the car stopped at the same river position near (1879, -1525), while the other eight jobs finished 10 of 10. Gas roads were not reached. `test-full-check` again failed when its temporary-copy setup could not start `pwsh` (`EACCES`).

For Claude to run: `test-full-check` on the laptop, and the requested memory-only hills picture scenario after it is written. The Lookout and all other new land need visual judgment.

Changed assertions, for Claude to review: none. Codex decided: the Lookout's position and dimensions are recorded in the card for Claude to review.

Removed: none in this partial step. The former terrain remains outside the Lookout's shoulder.

Still needed: fix the Easy driver's Survey Flags route; finish the mesas, Ridge foothills and way up, detailed faces, sight and search, natural outlines, route checks and picture scenario. Cockpit sync could not open its protected credential. The repository audit ran; its candidates need review and none were removed.


### Round 4, slice 2c: natural region outlines in progress

The salt pan and scab plates now have bends in their outlines, made from the named corner points in the land's shared data. Driving, ground and map read that same data. The smaller edge waves remain. The switches stay off. Survey Flags' fifth flag has not moved. No new game event or sound cue was added.

Checks: `test-scablands-regions` passed 12 tests, including every road with two cars; `test-scablands-hills` passed 5, `test-scablands-size` passed 9, the scene check passed, and `test-scablands-map` passed 1,798 checks. Race replays passed 297 checks and combat replays passed 12; `test-course-kit` passed 8. Race fingerprints and checked world signatures are unchanged. Integration was already included.

Changed assertions, for Claude to review: none. A new test checks the shared outlines and their bends. Codex decided: the card records the alternating bends and their size for Claude to review.

Removed: the long straight sides of the former region outlines, replaced by bent sides.

Still needed: investigate the Easy driver's Survey Flags failure; finish the mesas, Ridge foothills and way up, detailed faces, sight and search, route checks and the hills picture scenario. The scratch trace stopped at the first flag, so it did not establish the earlier fourth-flag failure's cause. The card is not ready to merge.

Lane tier: 41 of 43 suites passed. `test-everburn-easy` again failed Survey Flags, 0 of 10 against the unchanged minimum of 8; all eight other jobs finished 10 of 10. The sample stopped on the way to the fourth flag near (2083, -1413), and gas roads were not reached. `test-full-check` failed in the known temporary-copy setup because starting `pwsh` was denied (`EACCES`). The build passed with bundle warnings.

For Claude to run: `test-full-check` on the laptop, and the memory-only Performance hills picture scenario once written, including draw calls and triangles. The new outlines need visual judgment.

Cockpit sync could not open its protected credential. The repository audit ran; its candidates are advisory and none were removed.

### Round 4, slice 2c: sight range in progress

The land's existing sight calculation now accepts a maximum range, including its edge. The route map uses that same check. A new test uses the actual ground height and a Breaks hill to check that the hill hides a car, that it is visible again after leaving cover, and that range is respected. This is groundwork: raiders, the furnace and lookouts do not yet use it to pursue or search, and no captions or new sound cues were added. The switches remain off and Survey Flags' fifth flag has not moved.

The Survey Flags trace showed the Easy driver in the river bed, repeatedly aiming at a short detour, with no road route available. It did not establish a safe fix. Mesas, Ridge foothills and way up, detailed faces, sight and search, route checks and the hills picture scenario remain. The card is not ready to merge.

Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: the separate range comparison in the route map is replaced by the same comparison in its sight calculation.

Checks: `test-scablands-hills` passed 6 tests and `test-scablands-map` passed 1,798 checks. The lane tier passed 42 of 45 suites: `test-everburn-easy` still failed Survey Flags at 0 of 10, `test-full-check` could not start `pwsh` in its temporary-copy setup (`EACCES`), and `test-town-core` missed its 10 ms timing limit with 11.65 ms under load. The town check passed on its one rerun, with a slowest tick of 5.56 ms; the existing QA-TIMING-UNDER-LOAD card covers timing under load. The other eight Easy jobs finished 10 of 10 before the failed assertion stopped the gas-road checks. The build passed with bundle size warnings.

Race replays passed 297 checks and combat replays passed 12. The course-kit world-signature check passed. The checked race fingerprints and world signatures are unchanged. Integration was already included. For Claude to run: `test-full-check` on the laptop and, once written, the memory-only Performance hills picture scenario with draw calls and triangles. Cockpit sync could not open its protected credential. The repository audit ran; its candidates need review and none were removed.

### Round 4, slice 2c: Survey Flags route repair

The third flag is 300 m farther west, still placed from the Dead Mall and Everburn. The fifth flag stays where it is. The Breaks changed the driver's approach from the third flag; it entered the river bed on the way to the fourth and could not get out. The same seed finished with the dunes-only height from commit `681df7201` and failed with the Breaks height from `a050e5773`, with the earlier regions and ways held fixed. Moving the third flag lets the driver reach the crossing. No game event or sound cue was added.

Checks: the existing Easy driver's Survey Flags helper finished 10 of 10 seeds with the moved flag. Seed 1 also finished using the actual job definition, in 790.1 seconds. `test-scablands-hills` passed 6 tests. The full Easy suite, gas roads, lane tier, replay and world-signature checks, and build remain for the final run after integration. Race fingerprints were not checked in this run.

For Claude to run: `test-full-check` on the laptop, and the memory-only Performance hills picture scenario once written. The hills need visual judgment.

Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: the third flag's former position, replaced by a named-place offset 300 m west.

Still needed: mesas, the Ridge foothills and way up, detailed faces, sight and search, route checks, the picture scenario and final checks. The card is not ready to merge.

### Round 4, slice 2c: mesas in progress

Two mesas stand on the scab plates between the yard and Tin Town. Their level tops rise 20 m and 18 m above the former ground at their centres. Each has a broken steep rim and a broad ramp. Both follow the named places and leave the roads clear. Survey Flags' fifth flag stays where it is. The switches remain off. No game event or sound cue was added.

Checks: `test-scablands-hills` passed all 7 tests, including the mesa tops, steep sides, ramp slopes, road clearance and movement with Tin Town. `test-scablands-size` passed all 9 tests. Race fingerprints and world signatures were not checked in this run. The complete job routes, including Survey Flags and both gas roads, still need checking after the remaining land changes.

For Claude to run: `test-full-check` on the laptop and the memory-only Performance hills picture scenario after it is written. The mesas and other new land need visual judgment.

Changed assertions, for Claude to review: none. Codex decided: the two mesas have 200 m top radii, 40 m steep rims and 150 m ramps; their centres follow the yard to Tin Town line at 40 and 70 percent, offset north and south respectively. Removed: none; the former ground remains outside the mesas.

Still needed: Ridge foothills and way up, detailed faces, sight and search, route checks, the picture scenario, integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: Ridge foothills and top

The Ridge has two northern foothills and a level top at 45 m. Its broad shoulder joins the existing land, and the fifth Survey Flags flag stays at its existing position on the top. The Ridge place's level ground rises with the top. Both existing Ridge roads provide ways up. The land's switches stay off. No new game event or sound cue was added.

Checks: `test-scablands-hills` passed 8 tests, including the fifth flag's height, moving the Ridge, and both Ridge roads sampled at no more than 2 m with a maximum slope of .12. `test-scablands-size` passed 9 tests. Race fingerprints and world signatures were not checked in this run. The actual job routes and both gas roads still need their final checks.

For Claude to run: `test-full-check` on the laptop and the memory-only Performance hills picture scenario once it is written. The Ridge and other new land need visual judgment.

Changed assertions, for Claude to review: none. Codex decided: the Ridge top is at 45 m, with a 160 m level radius and an 850 m shoulder; its two foothills are north of it. The card records this choice.

Removed: the Ridge place's former 18 m level ground is replaced by the 45 m top while the new land is active.

Still needed: detailed faces, sight and search, route checks, the picture scenario, integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: river bank faces

The river mesh now samples each bank every 2 m across the steep section, so the Steps' ledges and the river banks follow their ground height more closely. It keeps the existing ground material and computes normals from the mesh. No game event or sound cue was added. Survey Flags' fifth flag stays in place.

Checks: `test-scablands-hills` passed 9 tests, including the drawn bank heights, two-metre cells and unit normals. Race fingerprints and world signatures were not checked in this run. The full job routes and both gas roads still need their final checks.

Draw cost: the river still uses one draw call per visible piece. A full 64-section piece has 4,864 triangles, up from 2,560. Actual on-screen draw calls and triangle counts still need the browser scenario.

For Claude to run: `test-full-check` on the laptop and the memory-only Performance hills picture scenario after it is written. The land and its faces need visual judgment.

Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: the coarser bank cells were replaced by two-metre cells.

Still needed: detailed cells for all four scarps, sight and search, route checks, the picture scenario, integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: distant scarp faces in progress

The distant ground now divides cells that touch the four scarp faces into eight pieces in each direction. Interior vertices sample the shared ground height. The edges follow the former cell edges so the finer cells meet their neighbours without gaps. The existing ground material and calculated mesh normals are unchanged. The nearby moving ground still needs finer scarp cells, so this is not yet the finished face work. The land's switches stay off. Survey Flags' fifth flag has not moved. No game event or sound cue was added.

The far ground remains one draw call. Its mesh has 76,852 triangles, up from 64,000. These are mesh counts; actual on-screen draw calls and triangles need the picture scenario. The joins and the faces need visual review.

Checks: `test-scablands-hills` passed all 10 tests, including a fine sample and normal for each scarp. `test-scablands-scene` passed, including ground-edit refresh. Race fingerprints and world signatures were not checked in this run. The final route checks, lane tier, replay and world-signature checks and build remain for the final run after integration.

For Claude to run: `test-full-check` on the laptop, and the memory-only Performance hills picture scenario once written.

Changed assertions, for Claude to review: the scene check's far-ground vertex count changed from 32,361 to 40,623, and triangle count from 64,000 to 76,852, because scarp cells now have finer triangles. The checks remain exact. Codex decided: no new design choice. Removed: the former coarse triangles at the four scarp faces are replaced by finer triangles.

Still needed: refine the nearby scarp faces, then complete sight and search, route checks, the picture scenario, integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: nearby ground sampling in progress

The nearby ground now has 120 by 120 cells across the same window, instead of 60 by 60. Its cells are about 11.7 by 8.3 m instead of 23.3 by 16.7 m, giving each scarp face more samples. The existing material and height remain shared. Survey Flags' fifth flag has not moved. No game event or sound cue was added.

This is an interim improvement, not the finished face work: the extra cells cover the whole window rather than the scarps alone. The nearby ground still takes one draw call, but its triangles rose from 7,200 to 28,800 and its vertices from 3,721 to 14,641. The extra work has not been timed. Replace this broad increase with face-specific cells and check the joins and performance before the card is finished.

Checks: `node tools/test-scablands-hills.mjs` passed 11 tests; `node tools/test-scablands-scene.mjs` passed. Race fingerprints and world signatures were not checked in this run. The final route checks, lane tier, replay and world-signature checks and build remain for the final run after integration.

For Claude to run: `test-full-check` on the laptop and the memory-only Performance hills picture scenario once written. The faces and their performance need judgment.

Changed assertions, for Claude to review: the scene check's near-ground vertex count changed from 3,721 to 14,641 because the window has twice as many cells in each direction. The exact check remains. Codex decided: no new design choice. Removed: the former 60 by 60 near-ground grid was replaced by a finer grid.

Still needed: face-specific nearby scarp cells and performance checks, sight and search, route checks, the picture scenario, integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: nearby scarp faces

The nearby ground is back to its 60 by 60 cell window. Cells along the four scarps are replaced by a separate eight-way mesh that uses the same ground material and samples the land height. Its edges meet the original grid. The existing river mesh provides the detailed banks and Steps. No game event or sound cue was added. Survey Flags' fifth flag remains in place.

The nearby window has 7,200 triangles before face detail. At the middle of each scarp, the replacement mesh adds a net 15,120 triangles at the west scarp, 22,680 at the east scarp, and 18,144 at each of the camp and Ridge scarps. A visible face adds one draw call. These are mesh counts; on-screen counts and appearance still need the picture scenario.

Checks: `node tools/test-scablands-hills.mjs` passed 11 tests. The scene suite, race fingerprints and world signatures were not run in this round. The remaining route checks, integration and final checks are still needed.

For Claude to run: the memory-only Performance picture scenario once written, with draw calls and triangles, and `test-full-check` on the laptop. Judge the faces and their joins.

Changed assertions, for Claude to review: the scene check's nearby ground count returns from 14,641 to 3,721 vertices, as Claude directed. The temporary hills test for the finer whole-window lattice was replaced with a check for the restored grid and separate scarp meshes. Codex decided: no new design choice.

Removed: the temporary 120 by 120 nearby grid and the triangles beneath the scarp face meshes.

Still needed: item 2, sight and search; item 3, route checks; item 4, the picture scenario; and item 5, integration and final checks.

### Round 4, slice 2c: raider shot sight in progress

Scablands camp raiders now check the land between themselves and their chosen target before firing. A mesa can block a shot, and a clear line permits it. Other venues keep their existing shot rules. This is only part of item 2: target selection still happens before the sight check, and pursuit, the five-second search, the furnace, lookouts and seen/lost captions remain to be completed. No new game event or sound cue was added. Survey Flags' fifth flag remains in place.

Checks: `node tools/test-scablands-hills.mjs` passed all 12 tests, including mesa cover, a clear line and unchanged sight handling for other venues. Race fingerprints and world signatures were not checked in this round. The remaining route checks, integration and final checks are still needed.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: the Scablands camp raiders' ability to fire through intervening ground.

### Round 4, slice 2c: raider target selection

Scablands camp raiders now choose only cars they can see within 82 m of a raider able to fire. A hidden nearer car no longer prevents a raider from choosing a visible car. The stop preview uses the same sight and range rules. Other venues retain their former selection. No new game event or sound cue was added.

Checks: `node tools/test-scablands-hills.mjs` passed all 13 tests, including cover, range and the stop preview. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario after it is written, and `test-full-check` on the laptop.

Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: selection of hidden or out-of-range cars by Scablands camp raiders.

Still needed: item 2, pursuit and the five-second search, furnace and lookout sight, seen and lost captions and cues; then route checks, the picture scenario, integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: camp raider search in progress

Scablands camp raiders remember the last place they saw the player's car. When it leaves sight or range, they walk to that place, search for five seconds, and return to their post. Seeing the car again refreshes the remembered place. Their steps use the existing ground and solid checks. The search does not read the hidden car's position. Other venues retain their former behaviour. No game event or sound cue was added.

Checks: `node tools/test-scablands-hills.mjs` passed all 14 tests, including the last seen place, search, return and seeing the car again. The search test uses a clear path; it does not prove that a raider can find a way around a steep face or solid. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions, for Claude to review: none. Codex decided: camp raiders walk at 3 m/s, the existing job-raider walking pace. Removed: none.

Still needed: item 2, path finding around blocked ground, furnace and lookout sight, and seen and lost captions and cues; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: raider detours in progress

A searching camp raider tries a consistent side around blocked ground, then returns to its direct path when the next six metres are clear. Each short step still uses the ground and solid checks. This is local obstacle avoidance, not a complete route finder: enclosed or complicated obstacles can still stop a raider. No game event or sound cue was added. Survey Flags' fifth flag stays in place.

Checks: `node tools/test-scablands-hills.mjs` passed all 15 tests, including a blocked route to the last seen place and back. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: the search's direct-only movement when a step is blocked.

Still needed: item 2, complete navigation for difficult obstacles, furnace and lookout sight, seen and lost captions and cues; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: skyline furnace sight in progress

During Hot Delivery the skyline furnace now checks the ground and its range before it sees the car. It counts uninterrupted time in sight and resets the count when the car reaches cover. Captions say when the furnace sees or loses the car. The seen cue is `arena.tell`; the lost cue is `gate.latch`. The car remains the target when the player is on foot. Survey Flags' fifth flag stays in place.

Checks: `node tools/test-scablands-hills.mjs` passed all 16 tests, including clear ground, cover, renewed sight and range. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions, for Claude to review: none. Codex decided: the furnace uses its existing map sight range and eye height, with ground sampled every 5 m. Removed: none.

Still needed: item 2, connect six seconds in sight to the horn and riders, complete pursuit and lookout sight and captions, and resolve difficult raider navigation; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. The sight clock alone does not yet call riders. The card is not ready to merge.

### Round 4, slice 2c: camp sight notices

Camp raiders now tell the player when any active camp raider sees the car, and when the last one loses sight. Passing between two raiders' views does not produce a false lost notice. The seen cue is `arena.tell`; the lost cue is `gate.latch`. Escort ambushes keep their existing rules. Survey Flags' fifth flag stays in place.

Checks: `node tools/test-scablands-hills.mjs` passed all 17 tests, including combined sight, loss and renewed sight. Race fingerprints and world signatures were not checked in this round. The final checks remain after integration.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions, for Claude to review: none. Codex decided: no new design choice. Removed: none.

Still needed: item 2, connect the furnace sight clock to its horn and riders, complete pursuit and lookout sight, and resolve difficult raider navigation; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. This card is not ready to merge.

### Round 4, slice 2c: Ridge lookout sight

During Hot Delivery the Ridge lookout checks its existing map range and eye height against the ground before seeing the car. The player is told when the car is seen or lost. The seen cue is `arena.tell`; the lost cue is `gate.latch`. Survey Flags' fifth flag stays in place.

Checks: `node tools/test-scablands-hills.mjs` passed all 18 tests, including clear ground, cover, renewed sight and range for the lookout. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions: none. Codex decided: the lookout uses the Ridge's named place and its existing map range and eye height. Removed: none.

Still needed: item 2, connect the furnace sight clock to its horn and riders, complete pursuit and resolve difficult raider navigation; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: furnace warning

During Hot Delivery the furnace sounds its horn once after it sees the car for more than six continuous seconds. Cover resets the clock. The cue is `arena.toll-gate`. Survey Flags' fifth flag remains in place. The warning does not yet bring the two riders, so this part is not finished.

Checks: `node tools/test-scablands-hills.mjs` passed all 19 tests, including the warning threshold, cover and one warning per job. Race fingerprints and world signatures were not checked in this round. Integration and the final checks remain.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop. Changed assertions: none. Codex decided: no new design choice. Removed: none.

Still needed: item 2, send the two riders after the horn, complete pursuit and resolve difficult raider navigation; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. The card is not ready to merge.


### Round 4, slice 2c: visible pursuit

Camp raiders now follow a car while they can see it. They use the existing walking pace and obstacle checks, and stop 12 m away to leave room to fire. Once sight is lost, they still go to the last seen place, search, and return. No event or sound cue was added. Survey Flags' fifth flag stays in place.

Checks: `node tools/test-scablands-hills.mjs` passed all 20 tests. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario once written, and `test-full-check` on the laptop.

Changed assertions, for Claude to review: no assertion values changed. The search test's first sight step uses 0 seconds instead of 1, so it still starts its loss-of-sight check at the original post now that raiders move during sight. Codex decided: raiders stop 12 m from a visible car and walk at the existing 3 m/s. Removed: the rule that kept a raider standing still while the car was visible.

Still needed: item 2, send the furnace's two riders and resolve difficult raider navigation; then item 3 route checks, item 4 picture scenario, and item 5 integration and final checks. The card is not ready to merge.

### Round 4, slice 2c: route checks

The solid-ground driver now drives to the level tops of the Ridge and the Lookout. The river-bed route check now starts at the yard and continues from the Boneyard to Tin Town. It still turns back at the bridge because the deck blocks the bed; the separate ground-height lane owns that limit. Survey Flags' fifth flag stays where it was. No game event or sound cue was added.

Checks: the two selected solid-ground route tests passed. The hills suite passed 20 of 20 tests. Survey Flags finished 10 of 10 seeds using the Easy suite's unchanged driver and its existing 8 of 10 pass mark. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario after it is written. Changed assertions, for Claude to review: the river route's arrival check now requires Tin Town instead of the Boneyard Road, because it now drives the whole route. No pass mark was lowered. Codex decided: no new design choice. Removed: the incomplete endpoint in the river route check.

Still needed: item 4, the picture scenario, then item 5, integration and final checks.

### Round 4, slice 2c: hill-country pictures

The memory-only Performance scenario takes the nine requested pictures and records draw calls and triangles for each. It uses the land's hill, road, scarp and river data to choose the views. Survey Flags' fifth flag remains in place. No game event or sound cue was added.

Checks: `node --check tools/scenarios/scablands-hills.mjs` passed. The browser scenario was not run, as directed. Race fingerprints and world signatures were not checked in this round.

For Claude to run: `tools/scenarios/scablands-hills.mjs` and judge the pictures. Changed assertions: none. Codex decided: no new design choice. Removed: none.

Still needed: item 5, integrate and run the final checks.

### Round 4, slice 2c: furnace road clearance and final-check findings

The eastern mesa now stands 500 m farther east, measured from the same named places. Both furnace roads clear climbable ground again. The hill tests still place the mesa on the scab plates and keep its ramp and roads clear. Survey Flags' fifth flag has not moved. No game event or sound cue was added.

Checks after this change: `node tools/test-scablands-hills.mjs` passed 20 of 20 tests, and `node tools/test-scablands-solid.mjs` passed 19 of 19, including both furnace roads, both hill tops and all four routes to Tin Town. Earlier on 65e4ee51a, integration/wasteland was already included and the status page matched it. The build passed. The ground, hills, job map, map and scene suites passed; regions, size and solid failed. The solid failure was the furnace road fixed here. Both replay suites passed: 297 race fingerprint comparisons and 12 combat comparisons. World composition passed 63 checks across 20 events. These checks and the build predate the mesa move and must be repeated on the final code.

The lane gate was stopped at 30 minutes: 87 of 89 suites had reported, with six failures. The Easy jobs and Medium gas runs had not finished. `test-old-smoke` failed the careful Medium driver; `test-scablands-regions` still expects the Ridge at its old height; `test-scablands-size` finds the moving ground replaces its index array; `test-scablands-solid` found the furnace road fixed above. `test-review-evidence` and `test-warlord-tollkeeper` could not start ffmpeg (EPERM). The failed size test also revealed that simply retaining the index array makes its 200-move timing fail and conflicts with the hills test's index-count check, so that attempted change was discarded. Survey Flags previously finished 10 of 10 seeds in the route-check round; the full Easy suite remains unfinished here.

For Claude to run: the memory-only Performance picture scenario, its visual judgment, and the two ffmpeg-dependent tests on the laptop. The full Easy and Medium driving checks and final gate still need a completed run after the remaining fixes.

Changed assertions, for Claude to review: the far scene gained exact checks of 40,623 corners and 76,852 triangles, replacing the earlier 32,361 corners and 64,000 triangles because of detailed scarp faces; the near scene remains 3,721 corners as on integration. The river route now requires arrival at Tin Town instead of returning only to the Boneyard Road. The raider search test starts sight at 0 seconds instead of 1 because visible raiders now move. The old regions assertion requiring the Ridge at its old height remains unchanged and fails against the designed 45 m summit; it needs Claude's review. No assertion was weakened in this run. Codex decided: move the mesa 500 m east, within the same scab plate, to clear the furnace road. Removed: the mesa's overlap with that road. The seen cue is `arena.tell`, the lost cue is `gate.latch`, and the furnace warning cue is `arena.toll-gate`.

Still needed: fix moving-ground allocation and speed, resolve the Ridge assertion, investigate the Old Smoke Medium failure, repeat the final checks on the resulting code, and obtain Claude's picture verdict.

### Round 4, slice 2c: moving scarp ground

The moving ground keeps its index array and reuses the fine scarp heights already in view. It discards samples as they leave the window and clears them when the land is refreshed. The old ground cells still give way to the scarp faces. No game event or sound cue was added.

Checks: `node tools/test-scablands-size.mjs` passed 9 of 9, including its unchanged 200-move time limit and array identity check. `node tools/test-scablands-hills.mjs` passed 20 of 20. `node tools/test-scablands-scene.mjs` passed. Race fingerprints and world signatures were not checked in this round.

For Claude to run: the memory-only Performance picture scenario and its visual judgment. Changed assertions: none. Codex decided: no new design choice. Removed: repeated calculation of retained fine scarp heights and replacement of the ground index array.

Still needed: resolve the Ridge height assertion and Old Smoke Medium failure, then repeat the final checks after integration. The card is not ready to merge.

### Round 4, slice 2c: Ridge summit check

The existing place-flatness check now expects the Ridge's designed summit height. It still checks all three points within 0.01 m. No game event or sound cue was added; Survey Flags' fifth flag remains in place.

Checks: `node tools/test-scablands-regions.mjs` passed 12 of 12; `node tools/test-scablands-hills.mjs` passed 20 of 20. A fresh `test-old-smoke` run was stopped before completion; it reported the Easy driver won 10 of 10 chases, but did not reach the Medium result. The final replay and world-signature checks remain to be run on the final code.

Changed assertions, for Claude to review: the Ridge's expected flat ground changed from 18 m to 45 m, as required by the new summit; its 0.01 m tolerance is unchanged. For Claude to run: the memory-only picture scenario and visual judgment, and the ffmpeg-dependent checks noted above. Codex decided: no new design choice. Removed: the old 18 m expectation for the Ridge.

Still needed: investigate the Old Smoke Medium result and finish the final checks after integration.

### Round 4, slice 2c: final checks in progress

Integration was already included, and the status page matches it. The isolated Medium Old Smoke chase now wins in 1,521.95 seconds, within the unchanged 1,753-second limit. The full Old Smoke suite passed. The earlier failure preceded the mesa move that cleared the furnace road. Survey Flags' fifth flag remains in place. No game event or sound cue was added in this round. The seen cue remains `arena.tell`, the lost cue `gate.latch`, and the furnace warning `arena.toll-gate`.

Checks: all eight Scablands suites passed alone, including the four routes and both hilltops. Race replays passed 297 comparisons; combat replays passed 12; world composition passed 63 checks across 20 events. The scenario passed `node --check`. The build passed with `npm.cmd run build`. The lane tier started 89 suites and was stopped at 30 minutes: 83 passed, four failed, and Easy jobs and Medium gas were unfinished. Review evidence and Warlord tollkeeper could not start ffmpeg (EPERM). Scablands size exceeded its 200-move timing limit under load (538 ms) but passed all nine tests alone before and after the lane. Town core took 31.66 ms against its 30 ms limit under load and passed all 641 checks alone afterwards, with 9.47 ms for the day step. No assertion was changed.

For Claude to run: the full Easy jobs and Medium gas checks, the lane tier to completion, both ffmpeg-dependent suites, and the memory-only Performance picture scenario with its visual and draw-count judgment.

Changed assertions, for Claude to review: the far scene changed from 32,361 corners and 64,000 triangles to 40,623 corners and 76,852 triangles for the detailed scarp faces. Near ground remains 3,721 corners, as on integration. The river route now requires Tin Town instead of the Boneyard Road. The search test's initial sight step changed from one second to zero because the raider moves while seeing the car. The Ridge flat-ground expectation changed from 18 m to its designed 45 m summit, keeping the 0.01 m tolerance. No pass mark was lowered. Codex decided: no new design choice. Removed: none in this round.

Still needed: the unfinished driving checks and a complete lane result, plus Claude's picture verdict. The card is not ready to hand over as complete.
### Realism trial, step 3

The switch adds seeded things, shared collision records, signs, tracks and map lines. A fast fence impact brings down its post and wire for the visit, without damage. Its sound cue is `world.fence.snap`.

The review fixes build placement indexes only when needed, take map lines from the course, and leave small things on driving ways. The solid clearance routes use Everburn and side-job `path` and `actor.path`, `raiderEntries` to `raiderHold`, the ordered player destinations, and gas-run `GAS_RUN_PATHS` (also the escort and furnace paths). The four well approaches are included.

Checks for these fixes: `test-scablands-things` passed 32 tests and `test-world-hud` passed. The previous checks and replay fingerprints on `3a9178542` passed as recorded before this review; the final checks must run again on the finished branch. The browser scenario is for Claude to run. The earlier lane run had FFmpeg and fixture-cleanup environment failures; Claude's branch fixed the P4 audio pin.

Changed assertions: none in this review. Codex decided: no new design choice. Removed: the HUD's separate switch reading and landmark generation. The original land remains when the switch is off.

The scenario now includes salt and Burn views, a real rock fall seen from 40 m, and reports picture and impact failures together. `node --check tools/scenarios/scablands-things.mjs` passed; `test-scablands-things` passed 32 tests after Claude?s latest drawing was merged. Claude must run the browser scenario.

Final checks on f10f2b2f8: all eight `test-scablands-*` suites passed, including 32 things tests; `test-replays` passed 297 checks and `test-combat-replays` passed 12, with fingerprints unchanged. `node --check tools/scenarios/scablands-things.mjs` and `npm.cmd run build` passed. Both requested branch merges were already up to date.

The lane tier was stopped after 35 minutes: `test-everburn-easy` and `test-track-kits` had not returned. The following 16 suites failed: `test-audio`, `test-arsenal-core-audio`, `test-arsenal-wave1-audio`, `test-arsenal-wave2-audio`, `test-arsenal-wave3-audio`, `test-audio-analysis`, `test-audio-listening`, `test-circuit-eifel`, `test-combat-audio`, `test-deep-audio`, `test-deep-phone`, `test-lab-radio`, `test-p4-audio`, `test-review-evidence`, `test-warlord-blackiron`, and `test-warlord-tollkeeper`. The audio checks encountered FFmpeg permission errors. Claude must rerun the incomplete lane tier and these failures, and run the browser scenario. The build reported large bundle warnings.

### Realism trial, step 3: Claude's drawing and the merge (15 November 2026)

**Drawing.** `src/world/scablands-things-look.js` (new) gives each kind its shape and surface in code: rock broken along flat faces and
wearing the scab rock photograph; bushes as crossed cards with a drawn picture; timber poles, posts and signs; lattice pylons as flat
faces with the gaps cut out. `src/world/scablands-things-view.js` uses them, draws standing things by distance and small things by kind
and distance, fills the small things' places again only after 1.5 m of travel, tints a stone by the ground it lies on, and paints the
signs on planks with arrows. Sizes: stone 32 triangles, bush 12, pole 96, boulder 72, pylon 40.

**Checks in this card's own new suite that changed with the drawing** (`tools/test-scablands-things.mjs`, not yet on integration when
changed): small things that stand up (scrub, brush, stump) cast shadows, where the plain shapes cast none; a tower is one drawn pylon at
each standing pylon, where it was a set of lines; standing things are checked after an update near them, because they are drawn by
distance; a sign's line is a place and a distance with a painted arrow.

**Changed assertion in an existing suite, reviewed by Claude:** `tools/test-p4-audio.mjs` leaves `world.fence.snap` out of the pre-P4
sound bank pin, as the ember's and the ground's cues are; the pinned hash is unchanged.

**Sound cue:** `world.fence.snap` (a fence post knocked down).

**Race fingerprints:** unchanged (297 and 12), by Codex in the lane.

**Browser scenario** `scablands-things` (Claude, visible window): passes; eight views within the limits; a car driven at a boulder and at
a pole stops (24.7 to 2.0 mph and 24.6 to 2.0 mph).

**Lane tier and build at the merge (Claude):** lane tier 263 of 263 on the merged result, the build passes, browser scenario `scablands-things` passes in a visible window, replay fingerprints unchanged.

**Removed:** the plain shapes Codex placed first (boxes, cones and line towers) are replaced by the drawn ones in the same files.

### Round 4, slice 2c: final merged checks

The hill country, natural edges, ground faces and sight rules are complete behind the land's switches. The tunnel trial now lets the river route run from the yard, under the bridge and onward to Tin Town. The combined check keeps the yard approach and verifies the crossing. Survey Flags' fifth flag stays in place. The seen cue is `arena.tell`, the lost cue is `gate.latch`, and the furnace warning cue is `arena.toll-gate`.

Checks on merge `61fc76f92`: all nine Scablands suites and the tunnel suite passed; both replay suites passed 297 race and 12 combat fingerprint comparisons; world composition passed 63 checks across 20 events. The picture scenario passed `node --check`. The lane tier finished 94 of 96: Easy jobs, Survey Flags, both gas roads and Medium gas passed. `test-review-evidence` and `test-warlord-tollkeeper` could not start ffmpeg (`EPERM`). The build passed. The status page matches integration.

For Claude to run: `test-review-evidence`, `test-warlord-tollkeeper`, and the memory-only Performance `scablands-hills` picture scenario; judge its pictures, draw calls and triangles.

Changed assertions, for Claude to review: the far scene changes from 32,361 corners and 64,000 triangles to 40,623 corners and 76,852 triangles for the detailed faces; near ground stays at 3,721 corners. The Ridge flat-ground expectation changes from 18 m to the designed 45 m summit, with the 0.01 m tolerance unchanged. The search test's initial sight step changes from one second to zero because the raider now moves while it sees the car. The river check now drives from the yard to Tin Town and passes beneath the bridge, replacing the former Boneyard endpoint and the former blocked-deck assertion because the tunnel work opened that route. No pass mark was lowered.

Codex decided: no further design choice. Removed: the blocked-deck route and its assertion, replaced by the through-route check.


### Review fixes: sight at covered floors

Sight now starts at each actor's stored feet height, checks the bridge deck and tunnel rock, and uses the tunnel bore where it is open. The furnace and Ridge lookout receive the active tunnel. Walking raiders retain their floor height. No new game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 22 of 22, including the bridge deck and trial tunnel roof. The open-bed check currently covers the bed under the deck; a separate open-bed approach check and sight along the tunnel still need coverage. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none. Codex decided: no new design choice. Removed: sight and walking-raider height based solely on the top surface.

Still needed: the remaining part A checks and fixes, including stopped cars, sight cost and search coverage; then parts B and C and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: stopped cars

Scablands camp raiders can target a stopped car after 1.2 seconds of uninterrupted sight. Each raider tracks each car separately and losing sight resets that car's timer. Finished, crushed and wrecking cars remain ineligible. Other venues retain the 8 mph rule. No game event or sound cue was added.

Checks: `node tools/test-scablands-hills.mjs` passed 23 of 23, including stopped cars, sight interruption, the delay and the other venues' speed rule. `node tools/test-raiders.mjs` passed 7 of 7. Race fingerprints and world signatures were not checked in this step.

Changed assertions: none. Codex decided: no new design choice. Removed: the Scablands-only speed restriction on camp targets.

Still needed: prove an actual shot follows the sight delay; reduce and measure sight cost, restore the one-second walking search test, finish parts B and C, and run the final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: sight cost and walking search

Camp target selection checks distance before tracing and no longer makes filtered lists. The furnace and Ridge lookout keep their last answers and take turns tracing every 30 simulation steps, four times a second each. The first lookout check is delayed by 15 steps. The sight options and results are reused. The walking search now has a separate test starting with one full second of pursuit. No game event or sound cue was added.

Checks: `node tools/test-scablands-hills.mjs` passed 25 of 25; `node tools/test-raiders.mjs` passed 7 of 7. Race fingerprints and world signatures were not checked in this step. The long traces are staggered: a lookout trace can take up to 601 ground samples on its step, and a furnace trace up to 281 on another. The total worst Hot Delivery step, including camp raiders, has not yet been measured.

Changed assertions: none. Codex decided: stagger the two checks by 15 steps to avoid their long traces landing together. Removed: per-target filtered distance lists and repeated long traces on every step.

Still needed: measure the full Hot Delivery worst step, prove an actual shot after the sight delay, add open-bed and along-bore coverage, and finish parts B and C before the final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: sight firing and tunnel coverage

The hill suite now checks that a raider actually fires at a stopped car after 1.2 seconds of sight and that actors can see along the trial tunnel bore. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 27 of 27. Race fingerprints and world signatures were not checked in this step. Changed assertions: none. Codex decided: no new design choice. Removed: none.

Still needed: a separate open-bed approach check and the worst-step Hot Delivery sight sample count, then parts B and C and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: open river bed sight

A new check places both actors in the open river bed beyond the Girder Bridge deck and confirms that they can see each other. It also checks that the car is in the bed and beyond the deck. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 28 of 28. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none. Codex decided: no new design choice. Removed: none.

Still needed: measure the worst-step Hot Delivery sight sample count, then complete parts B and C and their final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: sight sampling measurement

The existing Easy driver completed Hot Delivery on seed 1 in 362.24 seconds. Temporary counters around every sight trace measured a maximum of 600 sampled positions in one simulation step, including camp raiders and the furnace and lookout. This is an observed maximum for that run, not a bound for every seed or player route. The counters were removed after the measurement. The hill suite now checks that the Ridge lookout also reuses its answer for 29 steps and that a full-range flat-ground trace takes 601 height samples.

Check: `node tools/test-scablands-hills.mjs` passed 29 of 29. The measured Hot Delivery run finished. Race fingerprints and world signatures were not rerun in this step. Changed assertions: one new caching and sampling check; no existing assertion changed or loosened. Codex decided: no new design choice. Sound cues: no new event. Removed: temporary measurement counters.

Still needed: parts B and C and their final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: drawn scarp height

Small things now read the same finer triangles that draw the near scarp faces. The near ground's drawn-height query uses those triangles too. A ray test checks the answer against the actual mesh at many points across a face. No game event or sound cue was added.

Check: `node tools/test-scablands-things.mjs` passed 33 of 33. Changed assertions: none; the mesh comparison is a new check. Race fingerprints and world signatures were not rerun in this step. Codex decided: no new design choice. Removed: the coarse-triangle height estimate inside scarp face cells.

Still needed: the river has a separate drawn gorge while small things currently sample the filled-in plain; resolve that and check standing things, hills and mesa faces. Finish the camera and scenario fixes, part C, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: small things in the river

Small things in the river opening now take their height from the drawn bed and bank triangles. The opening uses the same interpolated distance field as the ground shader. A new check compares the lookup with the river mesh. No game event or sound cue was added.

Check: `node tools/test-scablands-things.mjs` passed 34 of 34. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; the river mesh check is new. Codex decided: no new design choice. Removed: the filled-in plain as the height source for small things inside the river opening.

Still needed: check standing things on all drawn terrain and the cost of river height lookup; finish the camera and scenario fixes, part C, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: standing things on drawn ground

Standing footprints, pylons, wires and sign boards now use the drawn ground height as small things do. Collision positions remain unchanged. Heights for standing batches and lines are calculated when the view is created; small things retain their cell cache. No new game event or sound cue was added.

Check: `node tools/test-scablands-things.mjs` passed 35 of 35. The new check verifies standing batches and pylons follow a changed drawn height. It does not yet prove all terrain types or measure river lookup cost. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; the placement check is new. Codex decided: no new design choice. Removed: using physical ground height alone for standing artwork.

Still needed: verify standing objects against the actual hill, mesa, river and scarp meshes and assess river lookup cost; finish the camera and scenario fixes, part C and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: river height lookup cost

River height queries now interpolate the ribbon's own triangles without building distant river meshes or raycasting their geometry. They use the same corner coordinates and heights as the drawing. Standing objects and small things still use the same lookup. No game event or sound cue was added.

Check: `node tools/test-scablands-things.mjs` passed 35 of 35. The river check compares heights against the mesh and now also verifies that a lookup does not build a mesh. This removes the unbounded mesh construction from each lookup; frame timing has not been measured. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none; the no-build check is new. Codex decided: no new design choice. Removed: raycasting and building river meshes solely to place objects.

Still needed: verify standing objects against all terrain meshes; finish the camera and scenario fixes, part C, and the final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: hill and mesa placement checks

The things suite now compares the height used for placement with the actual near-ground triangles across a Breaks hill and a mesa, including the mesa face. Together with the existing scarp and river mesh checks and the standing-object offset check, this checks the common height source and its use by standing objects. It does not inspect each standing object against every mesh. No game event or sound cue was added.

Check: `node tools/test-scablands-things.mjs` passed 36 of 36. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; the mesh comparison is a new check. Codex decided: no new design choice. Removed: none.

Still needed: camera and scenario fixes, part C, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: picture car placement

Each picture now clears the car's stored floor and flight height before placing it at the next view. The game can then choose the top floor at the new position. No game event or sound cue was added.

Check: `node --check tools/scenarios/scablands-hills.mjs` passed. The browser scenario was not run. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none. Codex decided: no new design choice. Removed: the previous view's stored height from the next view's placement.

Still needed: chase camera ground clearance and the scenario's visible checks and views, part C, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: chase camera ground clearance

The chase and wide cameras use the actual drawn near ground and river triangles to stay at least 1.2 m above the ground. The target rises with the terrain and follows the existing camera smoothing; a final clearance check prevents the camera entering a slope during the transition. Under decks and in tunnels the camera uses the car's floor. This changes only the view. No game event or sound cue was added.

Checks: `node tools/test-camera-clearance.mjs` passed 2,091 checks, including the drawn hill clearance. `node tools/test-tunnels.mjs` passed, including new deck and tunnel floor checks. The first camera check attempt used the wrong Ridge name and was corrected before the passing run. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none; the clearance checks are new. Codex decided: no new design choice. Removed: allowing the chase camera to remain beneath the drawn ground.

Still needed: the scenario's visible checks and views, part C, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks. The camera has not been judged in the browser.

### Review fixes: picture viewpoints

The scarp picture now starts 80 m from the foot on its low side. The Lookout picture starts near the edge of its flat top facing the yard. A new picture looks toward the valley between two Breaks crests. These positions have not yet been judged in the browser. No game event or sound cue was added.

Check: `node --check tools/scenarios/scablands-hills.mjs` passed. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none. Codex decided: no new design choice. Removed: the old scarp and Lookout picture positions.

Still needed: the mesa view from the plates' way, the scenario's visibility and placement checks, the dune picture after part C, all of part C, and the final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: mesa picture from the plates

The picture scenario now includes a view 250 m beyond the mesa face, looking toward it from the direction of the plates shortcut. The present mesa is too far from the shortcut for that position to be on the way itself. Recheck the position when part C places the six mesas. No game event or sound cue was added.

Check: `node --check tools/scenarios/scablands-hills.mjs` passed. The browser scenario was not run. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none. Codex decided: no new design choice. Removed: none.

Still needed: the scenario visibility and placement checks, the dune picture, part C, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: picture car visibility

The picture scenario now checks the rendered player car before each terrain picture and fails if it cannot identify the car or its centre is outside the camera view. It parses each evaluated page expression in Node before sending it to the page. The map picture has no car check. No game event or sound cue was added.

Check: `node --check tools/scenarios/scablands-hills.mjs` passed. The browser scenario was not run, so the new check and its viewpoint thresholds need Claude's browser run. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; the visibility check is new. Codex decided: no new design choice. Removed: none.

Still needed: scenario checks for ground clearance, nearby things and named landmarks; the dune picture; part C; and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: picture camera clearance check

The picture scenario now checks the camera's world position against the drawn ground before each terrain picture. It fails if the ground lookup is unavailable, invalid, or above the camera. No game event or sound cue was added.

Check: `node --check tools/scenarios/scablands-hills.mjs` passed. The browser scenario was not run, so Claude still needs to check the new guard in the browser. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; the camera check is new. Codex decided: no new design choice. Removed: none.

Still needed: scenario checks for nearby things and named landmarks; the dune picture; part C; and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: picture ground contact check

The picture scenario now checks the ground contact points of nearby instanced small things, standing footprints and pylons against the drawn ground within 300 m of the camera. The drawing supplies contact offsets so that intentional sinking and scaled objects are judged at their placement point. Sign boards and wires are not checked separately. No game event or sound cue was added.

Checks: `node --check tools/scenarios/scablands-hills.mjs` passed. `node tools/test-scablands-things.mjs` passed 37 of 37, including a new contact-point check. The browser scenario was not run. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none; the contact-point test is new. Codex decided: no new design choice. Removed: none.

Still needed: the scenario's named-landmark check and dune picture, part C and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Review fixes: picture landscape feature check

Each terrain picture now checks that its named landscape point projects inside the camera view. The mesa-top view checks a point on the top, and the other views check their chosen landscape target. This checks a point, not whether the feature is unobscured or visually recognizable. No game event or sound cue was added.

Check: `node --check tools/scenarios/scablands-hills.mjs` passed. The browser scenario was not run; Claude must judge the chosen points and pictures. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; this is a new scenario check. Codex decided: no new design choice. Removed: none.

Still needed: the dune picture, part C and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Hill country: height lookup index

The existing frozen hill table now has a 500 m cell index built once. Height queries examine only hills whose bounds overlap the queried cell, retaining table order for overlapping flat tops and ramps. Other tables still use the full scan, including the empty-table comparison. This prepares for the larger hill country; it does not add the new hills yet. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 30 of 30. A new check compares indexed and full-table heights across the land. Race fingerprints and world signatures were not rerun in this step. Changed assertions: none; the index comparison is new. Codex decided: no new design choice. Removed: full-table scans for the normal hill table.

Still needed: part C's seeded hill country, clearance and route checks, dune picture, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Hill country: seeded shoulders

The existing Breaks hills, dunes and foothills now have three to five seeded shoulders. Their outer radius stays within the former footprint, preserving the existing road clearances. The Lookout, Ridge top and mesas keep their existing shapes. This is one step toward the larger hill country; the requested counts, placement and route checks remain unfinished. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 31 of 31. The new check samples each hill for uneven shape, repeatability and slopes under 30 degrees. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none; the shoulder check is new. Codex decided: use the existing default game seed, 1989, for this fixed land table and keep each shoulder inside its former radius. Removed: round profiles for the existing Breaks hills, dunes and foothills.

Still needed: the full seeded hill country, clearance and route checks, the dune picture, and final checks. Claude must run the picture scenario and the ffmpeg-dependent checks.

### Hill country: dune field

The Ships now have 14 seeded dunes in staggered rows. They keep clear of the Ships' flat ground and the existing roads. Their sizes and heights preserve the existing gentle slope check. Their new shapes also advance the seeded shoulder sequence for other hills. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 32 of 32. It checks the dune count, dimensions, road clearance and sight over one crest. It does not yet prove clearance for every job route or the visual quality of the field. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none; the count, dimensions, flat-ground clearance and sight checks are new. Codex decided: stagger the rows with a second seeded generator and keep dune heights within the existing slope limit. Removed: the four larger, widely spaced dunes.

Still needed: the Breaks, mesas and foothills; all corridor and route checks; the dune picture and final checks. Claude must run the picture scenario and judge the views.

### Hill country: Ridge foothills

Four seeded outer foothills bring the Ridge to six. Their centres follow the Ridge, and the higher foothills stand nearer it. Their selected footprints clear the named places and roads; the existing Ridge road and fifth flag stay in place. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 32 of 32. It checks the count, heights, ordering, road clearance, Ridge approach and shoulder slopes. The first run failed because the new check lacked an import; it passed after the import was added. Race fingerprints and world signatures were not rerun in this step.

Changed assertion, for Claude to review: the foothill count changed from at least 2 to exactly 6 to match the new design. It is stricter, not loosened. Codex decided: seeded outer foothills stand north of the Ridge, continuing the existing arrangement. Removed: none.

Still needed: the Breaks and six mesas, all job and other protected corridors, route checks, dune picture and final checks. Claude must run and judge the picture scenario.

### Hill country: more Breaks hills

The Breaks now have 16 hills. A seeded placement grows the existing group inside or near the triangle between the yard, the Everburn and the Dead Mall, while keeping the new hills clear of roads and named places. The new hills follow the Dead Mall when it moves. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 33 of 33. A new check covers the count, sizes and nearest-neighbour spacing. The first placement failed the existing ordered-spacing check; the next failed its location check. Both passed after placement was corrected. Race fingerprints and world signatures were not rerun in this step.

Changed assertions: none; the new count and spacing check adds coverage. Codex decided: grow the new hills from the previous hill, with seeded candidates, so the existing ordered-spacing claim remains true. Removed: none.

Still needed: verify all 16 against the full placement and protected-corridor rules, build and prove all three road passes, finish the six mesas, route checks, dune picture and final checks. Claude must run and judge the picture scenario.

### Hill country: four more mesas

Four seeded mesas bring the plates to six. The new mesas have ramps and clear the road network, river and named places. Their centres follow the yard and Tin Town. Their placement has not yet been proved against job corridors, the plates' way or the required three stretches of furnace cover. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 33 of 33. The first run found that moving Tin Town changed the selection; it passed after selection was made against the fixed land. Race fingerprints and world signatures were not rerun in this step.

Changed assertion, for Claude to review: mesa count changed from at least 2 to exactly 6 to match the design. It is stricter, not loosened. New checks cover the added mesas' dimensions and clearance from roads and the river. Codex decided: select the four new mesas from seeded candidates on the fixed plates, then tie them to the yard and Tin Town. Removed: none.

Still needed: prove and adjust the mesas for three separate furnace-cover stretches and all protected corridors; verify the Breaks and road passes; drive the routes and jobs; finish the dune picture and final checks. Claude must run and judge the picture scenario.

### Hill country: picture viewpoints after review

The Ridge picture now starts on the actual Ridge spur and looks uphill at a nearer point on that road. The previous view started off the road and checked the distant Ridge centre, so it did not establish that the way up appeared in the picture. The Lookout still faces the yard, but checks a point on the flats in that direction: the yard itself is about 3.7 km away, beyond the camera's 2.4 km far plane. The other later views have targets within that range. These distance checks do not prove that the targets are visible or unobscured in the browser. No game event or sound cue was added.

Checks: `node --check tools/scenarios/scablands-hills.mjs` passed. A position check passed for the Ridge road, its uphill direction and all landmark distances. The browser scenario was not run. Race fingerprints and world signatures were not rerun. Changed assertions: none. Codex decided: check the nearby Ridge road and the flats toward the yard as the named features. Removed: the off-road Ridge position and the unreachable yard landmark check.

Still needed: Claude must run and judge every picture, including the views after the Ridge. Raise and reshape the mesas to the new dimensions, prove the cover and protected routes, finish the remaining hill-country requirements and run the final checks.

### Hill country: taller mesas

All six mesas now rise 30 to 36 m, with 30 m sides and 220 m ramps. The eastern original mesa moved 400 m west to clear the East Road, and seeded mesas were selected again for their larger footprints. The existing Ridge picture correction is in commit 13b5b1086. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 33 of 33. Its first run exposed the East Road overlap; the rerun passed after moving the mesa. Race fingerprints and world signatures were not rerun. Claude must run and judge all picture views, including those after the Ridge.

Changed assertion, for Claude to review: added mesas' height range changed from 15�25 m to 30�55 m to match the new design. This changes the accepted range, without weakening the new design. New checks require all six mesas to meet that range and have 30 m sides and 220 m ramps. Codex decided: keep the heights at 30�36 m so the existing smooth ramps pass the .30 slope check, and move the eastern original mesa west. Removed: the former lower, wider-sided mesa profiles.

Still needed: prove the three separate furnace-cover stretches and all protected corridors; verify the Breaks and all three road passes; drive the routes and jobs; complete the remaining hill-country requirements and final checks.

### Hill country: mesa clearance at the river

Moved the first mesa to clear the river bank, including its ramp footprint. The seeded placement of the other mesas is recalculated around it. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 33 of 33. An initial position failed the ramp and tunnel checks and was replaced. Race fingerprints and world signatures were not rerun in this step.

Changed assertion, for Claude to review: the mesa size, river and road clearance checks now cover all six mesas instead of only the four added mesas. The requirements are unchanged and the check is stricter, not loosened. Codex decided: move the first mesa within the plates to keep its complete ramp footprint clear of the river. Removed: the former mesa position overlapping the river corridor.

Still needed: prove the three separate furnace-cover stretches and all protected corridors; build and prove the Burn Road and Mall Road passes (a preliminary terrain sample found no hills rising on both sides within 150 m); verify the Mall to Everburn pass; drive the routes and jobs; complete the remaining hill-country requirements and final checks. Claude must run and judge the picture scenario, including the moved mesa.
### Hill country: Breaks placement check

The hills suite now checks every Breaks hill against the widened yard, Everburn and Dead Mall triangle and the clear ground around those places. All 16 satisfy those placement limits. This does not establish the required road passes; the current placement keeps every hill clear of every road, so those passes still need to be built. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 34 of 34. Race fingerprints and world signatures were not rerun. The picture scenario was not run.

Changed assertions: none. The placement check is new. Codex decided: no new design choice. The check measures clearance from the full outer radius. Removed: none.

Still needed: build the three Breaks road passes, prove mesa cover and the protected corridors, drive the routes and jobs, complete the remaining hill-country requirements and run final checks. Claude must run and judge the picture scenario.

### Hill country: pass road centre check

The hills suite now samples the Burn Road, Mall Road and Mall to Everburn road every 5 m and checks that Breaks hills raise each centre line by no more than 0.5 m. This protects the road-centre requirement while the passes are designed. It does not show that any pass exists. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 35 of 35. Race fingerprints and world signatures were not rerun. The picture scenario was not run.

Changed assertions: none; the road-centre check is new. The older assertion that every Breaks hill clears every road remains in place and conflicts with building the required passes. A deliberate change to that assertion will need Claude's review. Codex decided: sample at intervals of at most 5 m. Removed: none.

Still needed: build and prove all three Breaks passes, prove mesa cover and protected corridors, drive routes and jobs, and run final checks. Claude must run and judge the picture scenario.

### Hill country: scarp picture target

The scarp picture still starts 80 m from the foot on the low side, but now points to and checks the rim at the top of the face. The old landmark was the foot, where the scarp adds no height, so its projection did not establish that the face's top was in view. No game event or sound cue was added.

Checks: `node --check tools/scenarios/scablands-hills.mjs` passed. A geometry check confirmed zero scarp height at the camera position and 14 m at the rim. The browser scenario was not run. Race fingerprints and world signatures were not rerun.

Changed assertions: the scarp landmark changed from the foot to the rim, so the check now covers the top of the named face. Claude must review it; it is not loosened. Codex decided: use the face's own width to locate its rim. Removed: the foot as the scarp picture's landmark.

Still needed: build and prove the three Breaks passes, prove mesa cover and protected corridors, drive the routes and jobs, and run final checks. Claude must run and judge all picture views.


### Hill country: named-place clearance

The hills suite now checks every hill footprint, including each mesa ramp, against the flat ground and 30 m around every named place. The Ridge top is the named Ridge itself, so it is the one exception. The current land passes. This does not prove the job-leg corridors or the tunnel mouths. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 36 of 36. The picture scenario, replay checks and world signatures were not run in this step. Changed assertions: none; the clearance check is new. Codex decided: use each named place's full flat radius and the whole mesa ramp footprint. Removed: none.

Still needed: build and prove the three Breaks passes, prove mesa cover and the remaining protected corridors, drive the routes and jobs, and run final checks. Claude must run and judge the picture scenario.

### Hill country: tunnel mouth clearance

The hills suite now checks both ends of the trial tunnel against every hill footprint, including each mesa ramp. Both ends have at least 30 m clear. This covers the current land and does not establish clearance along job legs or at decks. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 37 of 37. The picture scenario, replay checks and world signatures were not run in this step. Changed assertions: none; the tunnel-mouth check is new. Codex decided: measure 30 m of clearance around each mouth, using the full mesa ramp footprint. Removed: none.

Still needed: build and prove the three Breaks passes, prove mesa cover and the remaining protected corridors, drive the routes and jobs, and run final checks. Claude must run and judge all picture views.

### Hill country: river-bank picture

The river-bank view now starts on the river's curved centre line and aims at the bank's lip. The old position used the midpoint of two named river points, which need not lie in the bed, and aimed beyond the lip. No game event or sound cue was added.

Checks: `node --check tools/scenarios/scablands-hills.mjs` passed. A geometry check found the start on the centre line with an 8 m bed depth, and the target 78 m from the line at the lip. The browser scenario, replay checks and world signatures were not run.

Changed assertion, for Claude to review: the checked river-bank landmark moved from 100 m along the chord between the named points to the actual 78 m bank lip, measured from the curved river. This checks the requested feature and is not loosened. Codex decided: use the nearest river segment to the former midpoint and its direction. Removed: the chord-based bed and target positions.

Still needed: build and prove the three Breaks passes, prove mesa cover and protected corridors, drive the routes and jobs, and run final checks. Claude must run and judge all picture views.

### Hill country: deck clearance

The hills suite checks the full 176 m length of both river decks against every hill footprint, including mesa ramps. Both decks are clear. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 38 of 38. The picture scenario, replay checks and world signatures were not run in this step. Changed assertions: none; the deck check is new. Codex decided: use the deck direction and length used by the land's crossing solids, and include each deck's half-width. Removed: none.

Still needed: build and prove all three Breaks road passes, prove the three mesa cover stretches and job corridors, drive the routes and jobs, and run final checks. Claude must run and judge the pictures.

### Hill country: higher Lookout and dune picture

The Lookout rises 60 m instead of 45 m, with the same footprint and level top. The dune picture starts 250 m farther from its crest so the feature has more room in the chase camera view. No game event or sound cue was added.

Checks: `node tools/test-scablands-hills.mjs` passed 38 of 38; `node --check tools/scenarios/scablands-hills.mjs` passed. The browser picture was not run; Claude must check it and the views after it. Replay fingerprints and world signatures were not rerun.

Changed assertions: added an exact 60 m Lookout height check, replacing no assertion. The old 45 m height was raised to 60 m at Claude's direction. The dune landmark is unchanged; its camera start moved 250 m farther away. Codex decided: use the greater distance to fit the crest in the picture. Removed: the former 45 m height and closer dune camera position.

Still needed: prove and build the three road passes, prove mesa cover and job corridors, drive the routes and jobs, merge integration and run the final checks.

### Hill country: three road passes

Added a pair of 40 m shoulders at each of the Burn Road, Mall Road and Mall to Everburn Road. Their positions follow the roads' named points, and their feet stay clear of the road centres. The 16 seeded Breaks hills remain. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 39 of 39, including new checks for rising ground within 150 m on both sides of each road and the existing centre-line clearance check. The browser pictures, route drives, replay checks and world signatures were not run in this step.

Changed assertions, for Claude to review: the Breaks total changed from 16 to 22, comprising the original 16 and six pass shoulders, as directed. The former `x < 0` restriction was removed because the Mall Road follows x = 0 and its eastern shoulder must lie east of it; the existing widened-country check still applies. The consecutive table-order spacing check was removed because appended pass pairs have no geographic table order; the existing 400-900 m nearest-neighbour check applies to every hill. These changes relax the old table-order and west-only assertions, but preserve the specified geographic and nearest-neighbour requirements. No other assertion was loosened.

Codex decided: place shoulders 280 m from each road centre with a 260 m radius, using 30%, 30% and 66% of the respective road lengths. Removed: the old assumption that all Breaks centres must lie west of x = 0.

Still needed: prove mesa cover and job corridors, drive the routes and jobs, merge integration and run the final checks. Claude must run and judge the pictures.

### Hill country: first furnace-cover mesa

Placed one mesa between the furnace and the plates' way, using the yard and Tin Town as its anchors. The hill suite samples the way within the furnace's 1,400 m range and checks for a hidden stretch of at least 150 m and open ground. It passes 40 of 40. Sampling at 5 m found one long hidden stretch of about 745 m, a short one of about 60 m, and open ground between. This does not meet the three-stretch requirement yet. No game event or sound cue was added.

Changed assertions: none. The cover check is new; it proves only the first required stretch, not all three. Codex decided: place the mesa 1,650 m west and 125 m south of the point 70% from the yard to Tin Town, with its ramp pointing west. Removed: one previously seeded mesa position, replaced by this mesa. Race fingerprints and pictures were not checked in this step.

Still needed: provide and prove three separate 150 m furnace-cover stretches, prove the job corridors and drive the routes and jobs, merge integration and run the final checks. Claude must run and judge the picture scenario.

### Hill country: plates-way clearance

Moved the first mesa off the plates' way. Seeded mesas now keep their nominal top radii at least 200 m from that way and their full ramp footprints clear of the trial tunnel mouths. A new assertion checks the nominal top clearance for all six mesas. The first mesa's centre moved from 200 m south to 350 m north of its named anchor; the later seeded positions changed as a result. No event or sound was added.

Check: `node tools/test-scablands-hills.mjs` passed 40 of 40. An intermediate placement failed the tunnel-mouth, ramp and tunnel-roof checks and was replaced. The browser scenario, route drives, replay checks and world signatures were not run. Changed assertions: none; the clearance assertion is new. Codex decided: measure 200 m from the nominal mesa top radius for this check. This does not yet prove clearance of the whole face and ramp. Removed: the former mesa position across the way.

Still needed: prove the complete mesa footprints clear the plates' way and provide three separate 150 m furnace-cover stretches. A coarse placement search did not find three stretches under the current road and river clearance checks; it is not an exhaustive proof. Check job corridors, drive the routes and jobs, merge integration and run the final checks. Claude must run and judge the picture scenario.

### Hill country: measure mesa cover

The hills suite now checks that the furnace-cover mesa itself adds at least 150 m of hidden ground on the plates' way. At 5 m intervals it adds about 590 m; without it the existing long hidden stretch falls from about 750 m to 160 m. The current land still has only two hidden stretches, about 750 m and 65 m, within the furnace's range, not the required three of 150 m. A coarse 20 m grid search of 120 m radius mesa centres, using the current road, river, place and plates clearance checks, found candidate shadows only at the same end of the way. This is not an exhaustive search and does not prove the design impossible. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 41 of 41. Race fingerprints, world signatures, route drives, build and browser pictures were not run in this step.

Changed assertions: none. The mesa contribution check is new and does not weaken the existing cover assertion. Codex decided: compare the current surface to the same terrain without that mesa, sampling at 5 m. Removed: none.

Still needed: provide and prove three separate 150 m mesa-cover stretches, prove job corridors, drive the routes and jobs, merge integration and run final checks. Claude must run and judge the picture scenario.

### Hill country: plates way corridor

The hills suite now compares the ground with and without mesas every 5 m along the plates' way, at the centre and at offsets up to 60 m on both sides. The mesa faces and ramps do not raise any of those sampled points. This covers the whole way, including the first cover mesa. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 42 of 42. Changed assertions: none; the corridor check is new. Codex decided: sample across the corridor at 30 m intervals; this is a sampled check, not a proof for every point. Removed: none. Race fingerprints, world signatures, route drives, build and browser pictures were not run in this step.

The three cover stretches are still not met. A 10 m grid search for a 120 m radius mesa found no candidate shadow on the visible part of the way beyond 3,100 m along it, within the examined region and the road, river, plates and 200 m way clearances. The search used circular shadow geometry and is not an exhaustive proof. Continue with mesa cover, then check the remaining job corridors and drive the routes and jobs. Merge integration and run the final checks. Claude must run and judge the pictures.

### Hill country: furnace road clearance

Moved the northern mesa 300 m east and 300 m north, clear of both furnace roads. The other seeded mesa positions stay as they were. No game event or sound was added.

Checks: the hills suite passed 42 of 42. The focused furnace-road check passed. The full solid suite before this fix passed 23 of 25: all four ways to Tin Town passed with realism on and off, but the furnace road crossed the mesa and the car could not reach the raised Lookout. The furnace road passed after the move; the Lookout is still unresolved. No replay, world-signature, build or picture check was run.

Changed assertions: none. Codex decided: preserve the seeded placement reference so moving one mesa does not move the others. Removed: the northern mesa's former position on the furnace road.

Still needed: three separate mesa-cover stretches, a drivable Lookout, job-corridor proof and Easy job drives, then integration and the final checks. Claude must run and judge the pictures.

### Hill country: Lookout approach

The 60 m Lookout now has a gradual approach facing the Ridge Road, also covering the existing northern drive. The first 300 m of the descent is followed by a gradual approach to the existing ground. This extra approach is needed to keep the rise below ten degrees. The other sides retain their previous shape. No game event or sound was added.

Checks: `node tools/test-scablands-hills.mjs` passed 43 of 43, including a new sampled slope check on the centre and northern approach. `node --test --test-name-pattern='a car drives up the Ridge and the Lookout' tools/test-scablands-solid.mjs` passed, without changing the driver. No browser, replay, world-signature or build check was run.

Changed assertions: none. The slope check is new. Codex decided: centre the approach between the nearest point of the Ridge Road and the existing northern drive, and extend the approach beyond the 300 m ramp to meet the ten-degree limit. Removed: the impassable northern side of the Lookout.

Still needed: three separate mesa-cover stretches, job-corridor proof and Easy job drives, integration and final checks. Claude must run and judge the pictures.

### Hill country: route proof in progress

The solid suite passed all 25 checks, including the four ways to Tin Town with realism on and off, both furnace roads, and the drives to the Ridge and Lookout tops. The Easy driver finished Hot Delivery 10 of 10 times. Survey Flags failed seed 1; the full run was stopped after that failure, so the other seeds were not checked. A separate one-seed diagnostic reached flag index 3 and ran out of time at x 981, z -386, heading toward x 3039, z -3300. The cause is not yet known.

Three separate 150 m cover stretches are still missing. No land or assertions changed in this step. No new event or sound was added. The browser pictures, integration merge, replay and world-signature suites, and build remain to be checked. Removed: none.

### Hill country: two job corridors

The hills suite now samples the thief's and Big Bess's job paths at 20 m intervals and across 60 m on each side. Both paths are clear of the new hills at those samples. This does not prove the other job corridors. A separate sample of the furnace path found raised ground, including near the Ridge, so that route still needs review against its intended climb. No game event or sound was added.

Check: `node tools/test-scablands-hills.mjs` passed 44 of 44. The new corridor check replaces no assertion and loosens none. Codex decided: sample five lines across each corridor. Removed: none. Race fingerprints and world signatures were not checked in this step.

Still needed: three separate mesa cover stretches, the remaining job corridors and a passing Survey Flags drive, then integration and the final checks. Claude must run and judge the pictures.

### Hill country: clear the Survey Flags leg

One seeded mesa stood across the long leg between flags three and four, near the place where the Easy driver stopped. Mesa selection now keeps the leg and a 60 m corridor clear. It also rejects a new mesa if its ramp would be too steep on the existing ground. The mesa formerly centred near (1082, -525) is replaced by one near (915, 1377); the other five centres stay in place. The fifth flag stays where it is. No game event or sound was added.

Check: `node tools/test-scablands-hills.mjs` passed 45 of 45. This includes a new clearance check and the existing mesa ramp checks. The Survey Flags drive has not yet been rerun, so the cause of its failure and the effect of this change are not confirmed. Race fingerprints, world signatures, the build and pictures were not checked in this step.

Changed assertions: none. The corridor check is new and loosens no assertion. Codex decided: use the job's named third and fourth flag positions to select clear mesa sites, and check each candidate ramp at 2 m intervals. Removed: the mesa site across the flag route.

Still needed: prove three separate mesa cover stretches, the remaining job corridors and a passing Survey Flags drive; then merge integration and run the final checks. Claude must run and judge the pictures.

### Hill country: Survey Flags corridor proof

The first two legs between Survey Flags now have a hill-clearance check across 60 m on either side. The mesa clearance check now covers all four legs. The hills suite passed 46 of 46. The Easy driver finished Survey Flags 10 of 10 times after the mesa moved, using the suite's driver and pass mark. The fifth flag stays in place. No event or sound was added.

Changed assertions: the mesa-clearance assertion now checks all four legs instead of only the third; it is stricter. The hill corridor check is new. Codex decided: sample the corridor every 20 m along each leg and at five offsets across it. Removed: none. Race fingerprints and world signatures were not checked in this step.

Still needed: three separate mesa-cover stretches and the rest of the job-corridor proof, then integration and final checks. A diagnostic found new hill height on the third and fourth flag legs; the fourth ends on the intended Ridge top, so the clearance requirement and the approach need careful reconciliation. Claude must run and judge the pictures.

### Hill country: Boneyard gas route

Moved the Mall-to-Everburn pass shoulders from 66% to 65.5% of the road and from 280 m to 300 m on either side. This clears the Boneyard gas-run corridor while retaining the two rising shoulders and the hill spacing. No game event or sound cue was added.

Check: `node tools/test-scablands-hills.mjs` passed 47 of 47. A new check samples the Boneyard gas route every 10 m and at five offsets across its 60 m corridor. The new check replaces no assertion and loosens none. Race fingerprints, the browser pictures and the build were not checked in this step. Removed: the former pass shoulder positions. Codex decided: move this pass by half a percent of the road and set its shoulders 300 m from the centre to satisfy both corridor and spacing checks.

Still needed: three separate 150 m mesa-cover stretches, the other job corridors, route drives after this change, integration and final checks. A 20 m grid scan found 3,043 candidate centres satisfying the sampled plate, road, river, place and way clearances; none of their 120 m circular shadows reached the currently visible portions of the plates way. This is not an exhaustive proof and does not model every mesa shape. The long gas route crosses the intended raised Ridge top on legs 5 and 6, so a strict comparison with the old flat terrain also fails there. Claude must run and judge the pictures.

### Not built by this slice

Cover from the furnace on the plates' way: with EVERBURN-REMAKE job 1. The partial cover tests were removed under Claude's direction; every placed mesa remains.

### Hill country: route proof continued

Claude deferred furnace cover on the plates' way to EVERBURN-REMAKE job 1. The two partial cover tests were removed; all mesas remain. The hills suite passed 45 of 45, and the solid suite passed 25 of 25, including all four ways and both climbs. With realism on, Hot Delivery and Survey Flags each finished 10 of 10 using the Easy driver. A separate Easy run with realism on finished Hot Delivery, Get Out and Walk, Run Him Down, Slow Ride and The Key Under the Mall 10 of 10 each. The Everburn failed seed 1; that run was stopped before the other seeds finished.

A diagnostic sampling each route every 40 m at the centre and 60 m either side found added hill height on the furnace route (legs 6 and 19), the Mall return (leg 2), and Survey Flags (leg 3). It also found the intended Ridge top on the furnace and long gas routes and the last flag leg. These samples do not prove the required clear corridors. The furnace and Mall routes include mesa or Breaks height outside the intended Ridge climb. Investigate and fix the clearances and the failed Everburn drive before claiming the proof.

Changed assertions: removed the two partial furnace-cover assertions because Claude moved that requirement to job 1; no remaining assertion was loosened. Codex decided: run the existing Easy driver with realism enabled for this proof. Removed: the two deferred cover checks. No game event or sound was added. Race fingerprints, world signatures, final integration and the build remain to be checked. Claude must run and judge the pictures.

The separate gas-road driver with realism on brought Big Bess home 10 of 10 on the long road at Watching. It was stopped before the remaining feud levels or the Boneyard road completed, so the gas-road suite has not passed. The final merge and checks were not started.
