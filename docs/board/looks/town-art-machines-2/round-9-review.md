# TOWN-ART-MACHINES-2 — round 9: mixer truck

## Result

Round 9 returns to round 7's whole-truck `carve_object` and uses four drum-free orthographic references: side, front, rear and straight down. The bonneted yellow body includes the bare frame, pedestal, rollers, hopper and ladder. The drum is one separate named lathe, closed at its front cone and open at its rear mouth. The six wheels use `tyre` and the front-photo track measurement. The chute remains a separate pivot.

The family GLB is **4,107,232 bytes** (8 MB limit). The mixer truck is **11,644 triangles** (15,000 limit). The printed bounds show all six tyres touching the ground; the drum and chute overlap the carved truck envelope. `round-9.jpg` is **285,744 bytes** (500 KB limit).

## Scores

- Likeness: 2/4
- Readability: 2/4
- Grounding: 2/4
- Consistency: 2/4

## What Claude should judge

The side view reads as the same worn yellow mixer truck, but the carve still has projection seams and broad gray panels beneath the frame. Please compare it directly with round 7's side and judge whether it meets that bar. Also check front/rear symmetry, the body-only orthographic comparisons, the closed front cone and open rear drum mouth, and the drum/chute work pose. No pass is claimed.

## Codex verdict

**Does not pass.** The truck reads from the side, and the drum is now a single
moving part. But the carved body leaves dark duplicate outlines around all
three near-side tyres, and the panels below the frame still look like a solid
grey skirt. The front and rear comparisons also look too small to judge the
truck's symmetry. The assembled rest/work views show the drum and chute move,
but they do not resolve the body faults.

An experiment that cut a broad strip from the bottom of the side mask made the
tyre outlines worse, so that crop was discarded. Keep the round 9 recipe. The
next round needs to separate the chassis openings from tyre shadows without
cutting through the detached wheel silhouettes, and enlarge the end views for
review.

## Checks

- `node tools/test-blender-output.mjs`: **389 checks passed, 0 failed** (complete run).
- Blender 4.5.13 candidate export and six imported-GLB views completed. The four orthographic photo comparisons hide the separate drum to match the drum-free references; assembled rest/work poses show it.
- The recipe printed body, drum, wheel and chute bounds. Each wheel's lower bound is 0 m; body bounds are `(-1.122, 0.123, -4.197)` to `(1.153, 3.086, 4.271)` in game coordinates.
- No test assertions changed. No gameplay code changed; no race fingerprints apply.
- Browser checks were not run in this art lane. Claude should do the look review listed above.

## Removed

- Removed the four unused round 8 cab reference photos and their cab credit entry.
- Replaced the cab-only shell and duplicate procedural chassis/tank/ladder/fender/support pieces with the photo-carved whole truck. The drum-only reference remains in use.
