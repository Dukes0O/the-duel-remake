# TREMBLANT-FIX: grass over the road, barriers you could drive through, a floating lodge

Claude (Opus agent), 11 October 2026, lane `claude/tremblant-fix`. Not merged; Claude
reviews and releases. From Kyle on the live game: "you can go through the barriers
and there's grass that goes over the road", then "a floating barn", then a flat green
wall behind the lake.

## Causes and what was found (all measured from the triangles the game draws)

1. **Grass over the road.** The ground beside the road is a ribbon that reaches 64 m
   sideways from every point of the road. At Beaver Hairpin the spur runs 66 m from
   Timber Straight, so the outer edge of Timber Straight's ribbon reached across the
   spur and, built from its own height, lay up to 1.66 m above it. Spots on the lap
   (road sampled every 2 m, nine places across, plus the shoulders):
   - near ground over the spur and the kink, s 1700 to 1812, up to 1.66 m (this is
     Kyle's picture: the right half of the road covered);
   - near ground over the start of Timber Straight, s 2000 to 2020, up to 0.46 m
     (the spur's ribbon reaching the other way).
   Nothing else on the lap: the far ground, the hills, the lake, the backdrop hills and the
   round-2 `relief` never rise over the road. Harbour Lights has the same fault at its
   hairpin (s 2076 to 2250, up to 18.5 m over the road). Panorama Ridge has none.
2. **Barriers with no collision.** Tremblant's armco (152 pieces), tyre walls (15), catch
   fence (60), pit wall, garages, stands, marshal posts and lift towers were kit
   pictures only; the circuit has no script walls. A test car driven at the tyre wall of
   Beaver Hairpin went 14 m past the road edge.
3. **Floating lodge.** The lodge stands on a level dome, but the ground under the dome
   still followed the ground's own bumps, so across its 25 m the ground varied by
   3 m: it floated 0.65 m at the low side and was sunk 2.6 m at the high side. The dock
   stood 0.9 to 2.1 m clear of the water and the lake floor.
4. **The wall behind the lake.** The far ground takes its height from the nearest
   road. Halfway between the Lodge Straight side (about +18 m) and the Lakeshore side
   (about -18 m) the nearest road changes and the ground stepped by 36 m (68 degrees),
   and the ski mountain stood on that step (82 degrees). The lake's own bowl also
   ends in a steep wall at its west end. It is not the round-2 `relief` and not a hill edge.

## What changed

- `src/ribbon-ground.js` (new), used by `src/world-surfaces.js` and `src/rendered-ground.js`
  (so planted scenery and kit pieces stand on what is drawn). For a circuit with a script
  only: a ribbon column that lies nearer to another stretch of road than to its own is
  sunk below that road's level near it and eased back to its own height by 12 to 20 m
  from it; it is only ever lowered. Courses without a script run the old line.
- `solid: true` on a kit placement (`src/track-script-course.js`, sizes in the new
  `src/kit-footprints.js`): the piece becomes a collision box the size of the piece,
  made the way the kit loader sets the piece down, so the face toward the road is the drawn
  face (checked to 5 cm). Pieces under 0.8 m thick are thickened away from the road. They
  are not script walls (nothing draws them), and are added after the planted scenery so the
  trees stand where they did. Tremblant marks armco, tyre wall, catch fence, pit wall,
  garage, grandstand, marshal post and lift tower.
- `installHillPads` (`src/circuit-hills.js`, one line in `src/course.js`): the ground under
  a hill's `pads` is held level over the pad's radius. Only a circuit whose hills have pads.
- `installFarGround` (`farGround: { band: 120 }` on a circuit; read by the far ground
  builders, `far-terrain-surface.js` and the backdrop hills): within 60 m either side of
  the halfway line between two stretches at different heights, the far ground blends
  from one road's height to the other's, not near the road, a hill or the lake. Only a
  circuit that asks.
- Tremblant: lake `blend` 34 to 50 and `keep` 12 (a gentler west bank; any more and the
  bowl reaches the far side of the road, which `test-circuit-tremblant` forbids), dock
  feet set just under the water, hill trees sunk 0.35 m.

## Tests

- `tools/test-circuit-ground.mjs` (new, six checks): no near ground, far ground, hill,
  lake or backdrop hill is drawn at or above the road or its shoulder, on Tremblant,
  Harbour Lights and Panorama Ridge; planted scenery stands on the same ground; no
  building or piece floats more than 0.3 m (0.45 for a long piece on a slope) or is sunk
  more than 1.5 m, the dock is set in the water; the far ground is under 60 degrees and the
  backdrop hills under 75. **Fails on the previous build** (Tremblant 1.66 and 0.46 m
  over the road, Harbour 18.5 m, scenery 0.96 m above the spur, lodge sunk 2.58 m, far
  ground 68 degrees, ski mountain 82 degrees).
- `tools/test-circuit-barriers.mjs` (new, six checks): footprints equal the kit manifest;
  every barrier, post, wall, garage, stand and tower is a box where it is drawn; the trees
  are unchanged; a car driven at the barriers at 70 and 110 mph (Beaver Hairpin, Ridge
  Corner, Pine Drop, Lakeside Plunge, Lodge Bend, Final Turn, the catch fence on The Spur
  and on Timber Straight) never gets past the barrier face. **Fails on the previous
  build** (14.2 m past the road edge at Beaver Hairpin). Harbour Lights: each kit
  barrier piece stands within 1.5 m of a solid wall box (the ones beside its run-off
  roads, cut to their own lengths, are the furthest); it needs no change.
- Browser review: `.evidence/2026-10-11/review/tremblant-woods/frames.jpg` (frames 9 to 11
  are the hairpin corner).

- Lane gate on this lane (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`):
  373 passed, 0 failed. `npm run build` passes.

## Changed assertions and data

- `tools/test-world-composition.mjs`: Tremblant's baseline is `52d26d67...` with 23,134
  instances (was `9ab2fe2c...`, 23,200). The ground changed, and the planted trees
  follow it (33 fewer of 3,489: the lodge pad, the lake bank and the hairpin ground change which
  places are open, and the forest rows after them shift). The other sixteen signatures are identical. Reviewed against
  frames.jpg. Nothing weakened.
- Replay fingerprints (19 cases, all three speeds): unchanged, Tremblant's included.

## Other courses

Released courses (the 16 older events) never reach the new code: nothing in them has a
script, `solid`, `farGround` or hill pads, and their world signatures and replay fingerprints
are identical. Harbour Lights (dev) and Panorama Ridge (dev) share the ribbon fix: Harbour's
hairpin cover is gone (334 ground vertices lowered), Panorama's ground is lowered at 63
vertices near its own close stretches (up to 12.5 m where one leg's ribbon stood above the
other's ground); neither is released, so no signature is pinned. Kyle's other lane
(`claude/tremblant-snow`) is untouched; it will pick up the shared fixes on merge.

## Open

- Kit autumn trees (48, 13 m or more from the road) still have no collision; planted pines do.
- The start gantry's legs and the braking boards are still pictures only (boards are the
  same as the script's own).
- The lake's west end is still a bank of up to 56 degrees on the 16 m far grid, down from a
  36 m wall; making it gentler means a shallower lake end (a design choice).
- Armco and lift towers float up to 0.4 m at one end on steep slopes.

## Removed

Nothing replaced. No file removed.
