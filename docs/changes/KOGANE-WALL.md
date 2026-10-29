# KOGANE-WALL

Status: one art round done on `claude/kogane-wall`; not merged. Switch `kogane-pass` stays dev. Judge: Claude.
Sheet: `docs/board/looks/kogane-pass/wall-round-1.jpg` (before, after, and the road-edge reference picture),
with `wall-round-1-review.md`. Pictures are the actual game at 1280 x 720 in the course's own light, with the
exposure-only brightened companions the earlier rounds used. No frame timing.

## Faults from Claude's C6 verdict

1. The mossy stone retaining wall read as tiles: one moss leaf on every block in a straight grid.
2. The far pieces of the wall read as flat slabs.
3. The concrete blocks outside the hairpins left gaps on the curve.

## What changed

**Stone.** `tools/blender/kogane/scenery.py` now builds the wall as fitted stones of different size and shape
(a staggered, slightly sloping cut of the 4 m face, wide stones, a few large ones). Each stone stands out of the
core by its own small amount and has a short bevelled edge. The picture on the stones is baked from the same
cut, so joints in the picture and joints in the model agree: weathered grey in several tones, dark joints,
a lit upper edge and a shaded lower edge, and moss in damp patches that gather near the coping, at the foot
and along the joints (nothing repeats per block). The far piece (`-lod`) is the core, a coping and one face
carrying the same picture at half the size, so it keeps the stone pattern instead of flat slabs.
Footprint is unchanged: 4 x 2.54 x 0.796 m (same width, height and depth to under a millimetre).
There are three patterns: the old id `stone-retaining-wall` (rebuilt) and two new ids `stone-retaining-wall-b`
and `-c`. Triangles (high / far): 420 / 38, 449 / 38, 494 / 38 against caps 600 / 200. Files are 44 to 50 KB
high and 10 to 11 KB far (cap 250 KB); the pictures are JPEG inside the file.

**Placement.** `src/circuits/kogane-pass.js` now lays the wall pieces along the wall as it really runs. The
shared layout spaces and stretches pieces by distance along the road centre line, so on a straight each stone
piece was stretched to 16 m (the cause of the tiled look) and on the outside of a hairpin the concrete blocks
were 3.3 m long on a 4.9 m arc (gaps of up to 1.8 m between blocks). Stone is now cut into parts of about 4 m
(scale between 0.73 and 1.42, 912 pieces instead of 294), picked from the three patterns by a fixed draw that
never repeats the neighbour on the same side and sometimes skips the one before. Hairpin concrete is cut to
about 3.4 m, laid end to end on the real outer arc, each block overlapping the next by 12 cm, every other block
1 cm further out so the overlapped faces do not flicker. The physical walls (script walls, one metre outside the
road edge), the guardrail, the footprint table values and the road are unchanged.

**Registration.** The two new ids are approved kits (`src/track-kits.js`, 52 to 54 ids), have the same
footprint (`src/kit-footprints.js`), count as continuous linings and as barriers in the ground and barrier
checks (`tools/course-ground-checks.mjs`), and take the same lamp wash as the first.

## Changed assertions (Claude's written review needed, rule 18)

- `tools/test-track-kits.mjs`: the kit id count 52 to 54 and the tail of the id list gains the two new ids.
  Nothing else in that test changes.
- `tools/test-circuit-kogane.mjs`: the allowed id set and the triangle cap table gain the two new ids; the
  tall-wall-off-the-hairpin check now covers all three stone ids. New checks: the three patterns are all used and
  never repeat side by side, stone pieces are not stretched (scale 0.6 to 1.5), and concrete blocks leave
  no gap over 25 cm along the hairpin.
- `tools/test-repo-hygiene.mjs`: the one look sheet `docs/board/looks/kogane-pass/wall-round-1.jpg` is allowed
  by name, as `c5-round-2.jpg` already is (the requested file name does not match the general sheet pattern).

No limit or tolerance is loosened.

## Removed

The old stone recipe (4 stone materials, 128 px tile, moss seam strips) and its two files' contents are replaced
in place. No other file is replaced. The temporary picture scenario was deleted; the pictures stay in `.evidence`
and are deleted with the lane.

## Open

- Native night pictures are very dark (the C5 light path is unchanged); judge on the brightened companions.
- More wall pieces to place and merge (912 stone pieces): the world build time and frame check are Kyle's
  later gate; no timing was taken here (rule 9).
- The stone is not a true photograph of the reference: stones are fitted polygons with baked bevels, not a
  scanned wall.

## Gates

See the end of this note.

- `tools/test-circuit-kogane.mjs`: passed (Casual 108.35 s, Pro 107.71 s, no crashes or resets) with the new checks.
- `tools/test-track-kits.mjs`: passed (Kogane 1,955 actual High/LOD placements validated, all courses).
- `tools/test-circuit-barriers.mjs`: 8 of 8. `tools/test-circuits.mjs`: passed with the switch off (28 events, 208,982 checks) and on (29 events, 216,698 checks).
- `tools/test-drive-through.mjs`: 7 of 7.
- Lane tier `--changed --jobs 2 --keep-going`: 80 passed, 0 failed, 0 not run (819 s).
- `npm run build`: passed.

## Claude's review (28 October 2026, night)

Accepted on pictures (Claude, look judge): fitted grey stone with dark joints and moss low and in joints, three patterns never repeated side by side, far pieces keep the stone picture; hairpin concrete overlaps with no gaps. Placement cuts walls into about 4 m pieces along the real wall (912 pieces; frame check before Kogane goes live). Footprint, collision, physical walls unchanged. Changed assertions (rule 18): kit ids 52 to 54 for the two new patterns; Kogane test allows the new ids and adds pattern, stretch and gap checks; hygiene allows the round sheet. Nothing loosened.
