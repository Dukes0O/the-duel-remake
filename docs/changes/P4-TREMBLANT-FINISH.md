# P4-TREMBLANT-FINISH: Claude's finishing pass on Tremblant Woods

Claude (Sonnet agent), 11 October 2026, from Claude's list after the review
tool. Circuit file: `src/circuits/tremblant-woods.js`. The road is untouched.
Every new behaviour is an option in a circuit's data and does nothing for a
circuit that does not set it (checked: all 18 events and the other two
circuits give identical scenery and ground to the integration build).

## What changed, in plain words

1. **A forest, not a meadow.** Pines now stand in rows from 13 m to 31 m beyond
   the road edge, on both sides, all the way round (2,863 of them, with the 465
   planted ones and the 145 on the hill). They thin out only where
   the rules already ask: the inside of corners, the lake, the paddock, the
   chairlift's cut and the catch fence. The kit autumn trees moved into the
   front rows, where they are seen close up.
2. **Autumn.** 40% of all planted pines turn gold, orange, red or copper
   (their crowns take a tint in the shader, no new geometry). The grass beside
   the road has patches of fallen leaves, and the hillsides further out are
   dark forest green with patches of autumn.
3. **No centre line.** New circuit option `markings: 'circuit'`: white edge
   lines, no yellow centre line. Set on Tremblant Woods and Panorama Ridge.
   Harbour Lights is in Claude's lane `claude/p4-harbour` and has to get the
   same line there.
4. **Hills, not spikes.** The grey peaks are off (`scenery.mountains: false`).
   Eleven rounded wooded hills ring the circuit, each placed so its foot is
   clear of every road. The ski mountain behind the lodge is the tallest
   (150 m) with pale ski runs; the lodge stands on the foothill in front of it,
   which now has the same crowns and greener runs.
5. **A real lake.** About 500 by 170 m (it was 380 by 76), dug into the ground
   as a bowl 7 m deep with a soft bank, darker blue-green, matte. The dock is
   two pieces reaching 19 m out from the near shore. Thirty banks of mist drift
   low over it.
6. **Morning light.** A per-circuit light: the sun low (about 15 degrees),
   warm, from the side opposite the lake, so shadows are long; a light haze in
   the distance; warm sky and cloud. It sits over the player's Clear and Golden
   looks; Overcast stays the player's choice.
7. **Tyre walls** are painted in three bands (white, red, white), so they read
   as tyre walls and not as black stacks.

## New generic options (all opt in, in circuit data)

- `markings: 'circuit'` (`src/world.js`): edge lines only, in white.
- `scenery.forest { from, to, spacing, rows }` and `scenery.autumn { share,
  colours }` (`src/track-script-course.js`, `src/vegetation.js`): the forest has
  its own random stream; autumn picks trees by their place along the road.
  `scenery.mountains: false` already existed.
- `groundLeaves { colours, strength, reach, far, wood }`
  (`src/world-surfaces.js`): colour of the ground (vertex tint only).
- `light { ...any look field }` (`src/lighting-moods.js`, `src/scene-lighting.js`):
  laid over the day's Clear and Golden looks, made once and reused.
- `basins [{ s, lateral, along, across, surface, depth, bank, blend, keep }]`
  (`src/circuit-hills.js`, installed by the course constructor): a lake's bowl.
  It wraps the course's ground height, so the shortcut generator's fingerprint
  (which covers the ground code in `src/course.js`) is unchanged.
- `effects.lake` now takes `surface` (metres above the road at its s) instead of
  `level`; `effects.backdrop { hills, colours }` draws the rounded hills; the
  circuit's `hills` now carry a canvas-made tile of tree crowns (no image file).
- Kit placements take `bands` (`src/track-kits.js`): one colour multiplier per
  layer of a stacked piece.

## Frame cost (1280x720, `tools/scenarios/tremblant-views.mjs`, delivered)

The browser holds every view at the screen's 17.6 ms frame, so the numbers show
the limit is met, not how much room is left. A probe at 2560x1440 gave the same
p95 (18.1 to 18.2 ms), so there is room.

| Quality | View | p50 | p95 | Over 33 ms | Draws | Triangles |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| High | 8 cars on the grid | 17.5 ms | 18.2 ms | 0 | 2,282 | 6.90 M |
| High | 8 cars on Timber Straight | 17.6 ms | 18.2 ms | 0 | 1,468 | 4.30 M |
| Performance | 8 cars on the grid | 17.5 ms | 18.2 ms | 0 | 1,541 | 5.26 M |
| Performance | 8 cars on Timber Straight | 17.6 ms | 18.2 ms | 0 | 1,121 | 4.00 M |

Before this pass the same views were p95 18.1 to 18.2 ms and 2.7 to 5.4 M
triangles. The kit load is unchanged (369 placements), so load time is too.

## Tests and checks

- `tools/test-circuit-tremblant.mjs`: seven new checks (forest rows and gaps,
  autumn share and palette, markings, the lake's bowl and the untouched road
  side, the hills' feet clear of every road and the ski mountain tallest, tyre
  bands, the morning light). 19 pass.
- `tools/test-circuit-layouts.mjs` (its scenery checks, the clear runoff and the
  open inside of corners, now see the forest) and every other test: lane tier
  388 passed, 0 failed; `npm run build` passes.
- Course checks: scenery and ground of the 18 events and of Panorama Ridge and
  Harbour Lights are the same as before (hash of every obstacle and 90 ground
  points a course).
- Review tool and the 14 landmark views: `.evidence/2026-10-11/review/tremblant-woods-finish/`.

## Changed assertions

None changed or weakened. The lake test of the builder
(`the lake, the hill and the lift stand where the road is not`) passes
unchanged with the bigger lake.

## Open

- Ski runs on the far ski mountain read as pale patches from the road, not as
  clean strips (they are drawn in colour, and the crowns texture shows through).
- The hairpin has a tall dark wooded hillside close behind it (the existing
  ground relief); it reads as forest now, but it is a big wall of green.
- Harbour Lights needs `markings: 'circuit'` in its own lane.
- A lake with no basin (any other circuit that sets only `effects.lake`) would
  now need a `basins` entry; nothing else uses a lake.

## Removed

The `level` field of `effects.lake` (replaced by `surface`), the grey mountain
backdrop of this circuit (`scenery.mountains: false`), the sixteen-metre pond
shore (the old ground-meets-plane lake) and the old fixed-box lake clear zone's
size (it now follows the lake's numbers).
