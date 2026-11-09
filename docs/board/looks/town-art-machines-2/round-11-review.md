# TOWN-ART-MACHINES-2 — round 11: mixer truck

## Result

Round 11 keeps the round 10 body, photo set, frame and moving parts. The front tyres use 0.30 m wide dark rubber treads. Each of the two rear axles now has inner and outer tyres on both sides, also 0.30 m wide. The overhead imported-GLB view fills the frame at the photo's scale. Photo sampling on the carved body uses cubic interpolation to soften projection joins.

The sheet rotates the overhead render to match the photo's horizontal orientation. The exported GLB contains the unchanged machine family plus these mixer-only changes.

## First look

The tyres read as dark rubber, and the overhead comparison now shows the truck at a comparable scale. The assembled rest and work poses still show the drum and chute as separate moving parts.

The photo joins remain visible on the bonnet and around the drum support from the end and overhead views. Cubic sampling softens local texture sampling but does not hide the hard transitions between projected views. I do not claim a pass; Claude should judge whether the joins are smooth enough.

## Scores

- Likeness: 2/4
- Readability: 2/4
- Grounding: 3/4
- Consistency: 2/4

## What Claude should judge

Check that the front tyres match the photo's width, that both rear axles have paired tyres on each side, and that the overhead model fills its frame like the photo. Inspect the remaining seams at the bonnet, drum supports and overhead joins, plus the side match and both drum/chute poses. No pass is claimed.

## Checks

- Blender 4.5.13 regenerated the family GLB and rendered six imported-GLB views, including assembled rest and work poses.
- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** (complete run).
- Family GLB: **4,197,144 bytes** (8 MB limit). Mixer truck: **13,724 triangles** (15,000 limit). All ten tyres reach the ground; each rear axle has a left/right inner and outer tyre.
- `round-11.jpg`: **276,135 bytes** (500 KB limit).
- No assertions changed. No gameplay code changed; race fingerprints do not apply.
- Browser checks were not run in this art lane. Claude should make the visual review listed above.

## Removed

- Removed this round's temporary render images, Blender logs and sheet-generation helper from `.qa-dist` after making the review sheet.
- No round 10 model parts or photos were removed.
