# TOWN-ART-OUTPOSTS

Status: deck-town round 14 model and review sheet ready for Claude.

## Changed

Scaled the traced rails to 1.1 m from the deck. The two side runs and two end runs meet at the corners and stay within the deck edges. Seeded the trapped pale background inside the rail openings so it is removed from the trace.

Capped the home carve at the measured wall height, removed the source roof band from the wall mask and seated the four homes on the deck. Added two thin gable slopes per home with 0.2 m overhang and the side photo's red roof strip repeated in bounded UV sections about every 3 m. The roof uses a fresh source-photo instance so the carve's background bleed does not replace its pixels. Kept ladders, washing and the bell.

The family GLB is 4,923,392 bytes, within the 5 MB budget. The deck town bounds are X -4.075 to 4.075 m, Y 0 to 3.773 m, Z -7.4 to 7.4 m.

## Checks and review

- Blender 4.5.13 exported and re-imported the GLB, rendered the review views, and printed every deck-town piece's bounds.
- Geometry checks passed: all four rails are 1.100 m tall from y=0, and all four roofs touch their wall tops within 2.5 cm. The deck rails stay within its 14.8 by 7.4 m outline.
- `round-14.jpg`: 194,083 bytes, below 500 KB. It includes the whole-town side view.
- No lane tier, build, browser check or game look check was run. This is an art-only lane; Claude should inspect the roof strip seams, wall contact, rail corners and pale gaps in the whole-town and mayor views.
- No test assertions changed. Race fingerprints are not applicable to this art-only model change.

## Removed

Removed `round-13.jpg`; no matching round-13 review note was present. Kept rounds 4, 9 and 10. Temporary renders, Blender output and scratch logs are removed before handoff.

