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
