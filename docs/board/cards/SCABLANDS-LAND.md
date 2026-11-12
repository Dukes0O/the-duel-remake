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

## Tin Town grows (settled by Claude, 12 November 2026; with the builder now)

The design page calls Tin Town "tin shacks stacked on scaffolds around a cold forge", and the pictures show a few
small blocks. A second piece, drawn in code the way the gate is (`src/world/tin-town-shacks.js`): about 45 shacks of
three sizes, stacked one to three high on girder scaffolds with walkways and ladders, in six clusters on a ring 35 to
80 m from the town's centre, with alleys too narrow for a car, a water tower, a radio pole, washing lines, lamps by
doors, and a fence joining the clusters to the gate. Every job's road stays clear by 10 m and the arrival place by
24 m. One solid box for each cluster and two for the gate's posts; at most 12 draw calls and 60,000 triangles.

### Tin Town's shacks: built, merged and judged (12 November 2026)

45 shacks in six clusters, a water tower, a radio pole, washing lines, lamps and a fence, in 4 draw calls and 23,000
triangles. The alleys and the view from the gate read as a settlement. From 200 m the town is still a thin strip under
the cliff.

Settled by Claude after the pictures:

- **The gate faces north and south** (the builder's finding: no other turn clears every road). **The furnace does not
  drive through it.** Its path stops in front of the gate at (575, 82), burns it from there, and turns west along the
  outside of the fence to (430, 70). So the furnace's path keeps 8 m from the gate's posts like every other solid.
- **The Boneyard road passes squarely through the gate:** a new place at (575, 112) before it. A road through the
  gate must keep 3.4 m from each post (the opening is 9 m and Big Bess is 2.8 m wide); every other solid still needs
  8 m.
- **The fire takes the whole gate** (Claude's drawing): a flame up each post from the ground, three over the beam,
  four along the fences, in place of five thin flames on the beam that read as candles.
- **Seen from far off:** chimney smoke from three shacks, a 16 m watchtower with a lamp, and the shacks' sheet
  colours brought toward the old model's rust and orange.

**Changed assertions, reviewed by Claude (rule 18).** In `tools/test-scablands-scene.mjs`, the gate fire's checks of
12 November (five flames, 6 to 8 m tall, spread along 18 m, standing on the beam, five sets of sparks) are replaced by
checks of the new fire: nine flames, one at least 9 m tall up each post from the ground, three over the beam, a reach
of 34 m or more centred on the gate, nine sets of sparks, and the fire standing at the gate's own place from the
ground up. The old checks were one day old and described a fire that the pictures showed to be wrong. In
`tools/test-old-smoke.mjs` and `tools/test-run-gas.mjs` the builder let a path come within 3.4 m of the gate's two
posts and let the furnace's piece leaving the gate touch them; the second allowance is being removed with the
furnace's new path, and the first stays for roads that pass through the gate.

### Round 2 merged (12 November 2026)

The furnace stops in front of the gate at (575, 82) and keeps 8 m from every solid, posts included (path 3,232 m,
3 minutes 51 seconds at the base pace). The Boneyard road passes squarely through the gate by way of (575, 112) and is
1,259 m. Tin Town has its watchtower, chimney smoke and rust colours. Sheet: `docs/board/looks/scablands-land/round-2.jpg`.
Checks on the builder's branch: furnace rules 616, run-gas 1,088, the Medium and Easy drivers' targets, lane tier 48
of 48, build, two browser checks; no replay fingerprint or world signature moved.

Open on this card: the town seen from beyond 120 m; a gate that chars as it burns; the frame check before the
Scablands opens beyond the story's switch (the shacks, wear and ground are all drawn every frame).

## Round 3: the well, the Dead Mall and the Boneyard (settled by Claude from the sheet, 12 November 2026)

Sheet and faults with names and positions: `docs/board/looks/scablands-land/round-3.jpg` and its review note. Verdict:
each place reads as toys on a table. The fixes, in this order, one commit each; the builder stops an item after thirty
minutes and says so.

1. **The Everburn's fire and smoke are drawn in code.** The seven spheres and the faceted flame solids go. In their
   place, with `src/world/scrap-look.js` and the furnace's fire as the example: flame tongues 5 to 7 m tall on the
   derrick's top, firelight on the ground under it, and a column of smoke puffs that rises to about 90 m and leans
   with one fixed wind, so that the well is still the landmark seen from the mall and the Boneyard. Whatever decides
   today when the flame shows keeps deciding it. Beyond 280 m the fire and smoke are still drawn and the well's
   stand-in is a thin dark mast the height of the derrick, not a 32 m box.
2. **The mall's sign lettering sits on its boards** and reads the right way round from outside. Fix the cause, not
   the three positions, and add the kind of fault to `docs/ART_LINE.md` if it is a new one.
3. **The mall's nine flat rocks go.** The four drifts at the entrance take the ground's own surface and a low, wide
   shape; if they still read as cushions they go too.
4. **The Boneyard's dirt slab is not drawn.** The ground is drawn in code already.
5. **The three wrecks differ** by where and how they lie: three different headings, one rolled onto a wing, uneven
   gaps, no engine pod sunk more than a hand's depth. All three are solid where they are drawn, and both roads stay
   6 m clear of every solid. Big Bess's resting place moves 5 m clear of every wreck.
6. **The mall is drawn in fewer pieces.** Its 254 meshes are merged by surface at load if the scene already has a
   way to do that; the draw calls before and after are recorded.
7. **The well is not alone on its disc.** Eight to twelve props from models the Scablands already loads (drums,
   pipes, a shack, a tank) stand in one cluster beside the apron, away from the raiders' way in, the furnace's
   parking place and the car's start in job 6.

Not in this round: the road ribbon lying under the drawn ground near each place, the cliffs' saw-teeth, the hard
edge between road and sand, and the collision boxes larger than the well and the mall. Each changes ground or job
rules and gets its own look.

Checks: `test-scablands-scene`, `test-scablands-land` if it exists, `test-run-gas` (both roads clear of every
solid), `test-everburn-easy`, `test-old-smoke` untouched, lane tier, build, the `everburn-well`, `run-gas` and
`field-battle` browser checks, and a sheet `round-4.jpg` with the same twelve views. No frame check (rule 9); the
render numbers of each place are recorded before and after.

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
