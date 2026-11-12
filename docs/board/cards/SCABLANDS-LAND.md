# SCABLANDS-LAND

Found by Claude on 12 November 2026 from pictures of the Everburn's jobs taken in the game (a Sonnet helper took
them). Kyle, 11 November: "we also want the wasteland and scablands to have really compelling assets and gameplay."

Owner: Claude (the look, the first example of each drawn thing, every verdict). Built by Sonnet helpers.

## What the pictures show

The Scablands is an empty tan bowl, and three of its faults are plain mistakes, not taste.

1. **Places draw white.** `tintown.glb` and `kit.glb` carry no colour for any material (10 of 10 and 12 of 12), and
   `everburn.glb` and `boneyard.glb` lack it for 4 of 9 and 3 of 7. Their recipes made colour with a texture node, which
   the exporter does not write (the fault the furnace had; `docs/ART_LINE.md`, "A model that is black in the game").
2. **The road stands up as dark walls.** The dirt road is a round tube 2 km long, half buried. Where the ground dips
   it shows as a wall many metres high, and it blocks the view through the Boneyard.
3. **The far ground pokes through the near ground** by up to 13 m, because the far ground is a coarse copy of the
   same land drawn in the same place.
4. **The ground is one flat colour** from edge to edge.
5. **Tin Town has no gate,** though the story now burns one, and Tin Town itself is a few small blocks.

## Settled design (Claude)

- **Colours:** each of the four recipes writes plain base colours, as `old-smoke-photo.py`'s plain parts and the
  fixed vehicles recipe did, and its model is rebuilt. No new shapes in this card.
- **Wear drawn in code** over those plain colours on every Scablands place: `createScrapWear` from
  `src/world/scrap-look.js`, with each place's own ground point as the wear's origin, so that rust, runs, grain, soot
  and road dust appear without a single picture file.
- **The ground:** `createGroundLook` from the same file (written by Claude on 12 November) on the ground's material:
  drifts of pale and dark sand, cracked earth, wind ripples, gravel, and rock with strata on steep ground.
- **The road** becomes a flat ribbon laid on the ground along the same line, 1.2 times the road's width, raised 6 cm,
  following the ground's height at each cross point, with its own darker packed colour, two ruts and the ground look.
  Nothing a car drives on changes: the ground's height is untouched.
- **The far ground** is dropped 40 m wherever the near ground covers it, and left as it is elsewhere.
- **Tin Town's gate** at (575, 62), built in code from plain shapes with the wear drawn over them: two posts of stacked
  drums and girders 7 m tall, a beam across with three hanging lamps and a tin sign reading TIN TOWN, and 14 m of
  corrugated fence each side, standing across the road with a 9 m opening. When the story burns it, the fire stands on
  the gate itself (card RUN-GAS's follow-up makes the fire larger).

## Result (built by a Sonnet helper; reviewed by Claude, 12 November 2026)

Merged into Claude's branch. Sheet: `docs/board/looks/scablands-land/round-1.jpg`. Change note:
`docs/changes/SCABLANDS-LAND.md`.

- Colours: every material in the four models now arrives with its colour (Tin Town 10 of 10, kit 12 of 12, Everburn
  9 of 9, Boneyard 7 of 7). Wear is drawn over every place; the ground look is on all the ground.
- **Found on the way and fixed:** the Boneyard's model was exported turned a quarter turn, so every plane stood on
  end against a standing slab of dirt (the fault ART_LINE calls "a vehicle standing on its nose"). The near ground was
  redrawn 350 m and 250 m out of place whenever the open marks changed.
- The road follows the ground as it is drawn, because the drawn ground is up to 8 m off the land's own height at the
  foot of the ridges. Nothing a car drives on changed; no replay fingerprint or world signature moved.
- The far ground uses a finer grid whose lines fall on the near ground's edge, and lies below the near ground at
  every sampled place.
- The gate stands at (575, 62) across the furnace's path, with no collision.
- Claude then softened the cliff strata and the sand ripples in `createGroundLook`, which the pictures showed as
  stripes and a pale band.

Open on this card: a second sheet after Claude's two changes; Tin Town's size; collision for the gate's posts; the
frame check before the Scablands opens beyond the story's switch.

## Checks (named before code)

1. `tools/test-scablands-scene.mjs`: every Scablands place material arrives with a colour that is not white (read
   from the real model files); the road is no taller than 0.3 m above the ground anywhere along it; the far ground
   lies below the near ground wherever both exist; the gate exists at its place and has an opening.
2. `tools/test-blender-output.mjs` for the four rebuilt models.
3. Replay and world-signature guards unchanged: nothing here changes a height a car touches. If a signature test
   reads these models, the builder stops and reports rather than regenerating it.
4. Look (Claude): one sheet before and after from six fixed viewpoints: Tin Town from the road, the gate, the
   Boneyard's planes, the well, the open flats with the road crossing them, and a hillside.
5. A frame check is owed before the Scablands is opened to players beyond the story's switch (the drawn ground and
   wear cost graphics time). Not in this card (rule 9: the stories that use it are off).

## Removed

The round tube road. The noise-texture colours in four recipes.
