# MAP-ART, round 3 (24 October 2026), with the verdict of all three

Sheet: `round-3.jpg` (the five signs from the air and from a car's height, then the Table's mesa,
lookout, plane wreck, strip, windsock and logbook; earlier rounds in `round-1.jpg`, `round-2.jpg`).
Recipe: `tools/blender/pilot-map-props.py`; ten GLBs in `public/assets/models/pilot-map/`
(2.5 MB in all; the mesa is 25,000 triangles, the rest 400 to 8,500).

- Round 1: every piece built. The signs carried their own ground slabs, which would read as
  billboards on the game's own road, wall and track; the mesa read as a stack of pancakes; the
  plane was clean and toy-like.
- Round 2: the signs became paint, chalk and embers only (the game's own ground carries them);
  strata in three shades with gullies and varnish streaks; rust and dust wear on the lookout and
  plane; bigger arrows and tail numbers.
- Round 3: darker, redder strata and vertical streaking; a finer plane skin; heavier chalk;
  scattered stones and tufts on the strip; the tail view moved to the fin.

## Verdict (Builder; Claude judges)

- **Pick:** the five signs (readable from 46 m up, a flat smudge from a car; coals glow, the
  flame and smoke anchors are empties for the game's existing fire sprites), the steel lookout,
  the dirt strip with its cairns and windsock, the logbook.
- **Not a pick, not fixable in the round cap:** the **mesa** still reads as a smooth layered
  cake from far away and the strata are too even and soft up close; the **plane wreck** reads
  as a toy with camouflage-like patches (the wear follows big flat faces), though the tail
  number N4471K is legible on the fin and rear fuselage.

Stop rule (AGENTS.md): the card cannot meet its acceptance on those two with flat colours and
three rounds. Proposed fix, a new card: give the mesa a real rock surface by reusing the game's
own "Weathered layered sandstone" texture (`src/desert-detail.js`) with UVs, plus a rocky
break-up of the cliff edge in the mesh; and wear the plane with a baked dust and rust map
instead of per-face patches. Nothing here is a placeholder: the GLBs are what the recipe makes.

## What the pieces promise the game (origins, empties)

See the header of the recipe: every GLB has its origin and anchors named there (the mesa's
`lookout_spot`, `wreck_spot`, `strip_a`, `strip_b`, `ground_level`; the lookout's `logbook_spot`;
the fire pits' `flame_n` and `smoke_n`; the lighthouse's `window_light`; the logbook's `page_centre`).
