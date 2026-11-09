# TOWN-ART-SERVICES — toll bank, round 11

## Builder review

| Measure | Score (1–5) | Note |
| --- | ---: | --- |
| Reference resemblance | 3 | The riveted, patched steel shell and heavy wheel door read as the photographed strongroom. The generated front roof is taller than the side view allows after scaling by the door. |
| Proportions | 4 | The shell is about 7.6 by 7.8 m. The front door is about 2 m tall; all pieces fit within the 2 by 2 plot and its 0.5 m edge margin. |
| Materials | 4 | The shell keeps the photo-carved steel and photo-mapped roof. The porch and booth use darker steel, weathered wood and galvanized tin. |
| Color | 4 | Rust, dark steel and dull galvanized tin remain distinct under even grey studio light. |
| Detail | 4 | The door wheel and hinges, booth window, porch posts, barrier arm and alternating stripes read as separate construction. |
| Wear | 4 | The shell has uneven rust, pale abrasion and patched plates from the references. |
| Readability at town zoom | 4 | The low, hipped roof and road-facing strongroom stay clear in the mayor view. |
| Grounding | 5 | Every piece passed the bounds and contact audit; nothing leaves the plot. |
| Scene consistency | 4 | Rusted steel, patched repairs and salvaged timber match the service family. |
| Frame cost | Not measured | This is an art-only family asset and is not wired into gameplay here. |

## Evidence and source

`round-11.jpg` compares the full-size side, front, rear and overhead photos
with orthographic renders of the strongroom at the same camera scales. The
front view includes the separate door; the other three matched views isolate
the shell and roof. Both three-quarter views and the mayor view show the full
toll-bank assembly. Other service buildings are hidden. The exported GLB was
rendered in Blender 4.5.13 on plain grey ground with even light and the
Standard view transform.

The four separate generated photos are credited in
`public/assets/models/wasteland/town/textures/toll-bank-CREDITS.md`. They are
single orthographic views, each 1,024 pixels wide. The final family GLB is
1,029,872 bytes. Toll bank uses 3,952 triangles of its 5,000 limit.

The side profile gives a 2.4 m roof crown, while the front roof peak scales
to about 2.8 m from its door. The roof follows the side profile so its four
plates meet the carved eave. `docs/ART_LINE.md` records this new reference
consistency fault for later art work.

## Claude review request

Please compare the front roof height with the side profile and decide whether
to keep the lower continuous hipped roof. Check the door, booth, striped
barrier and canopy from both three-quarter views, then confirm the door and
roof remain readable from the mayor's view.

## Checks

- Toll-bank bounds and contact audit: passed for every named piece.
- `node tools/test-blender-output.mjs`: 386 checks passed, 0 failed.
- Browser and in-game checks were not run in this art lane; Claude handles
  those checks.
- Changed assertions: none. Race fingerprints: not applicable; race code is
  unchanged.

## Removed

- Replaced the toll-bank's simple block placeholder with the photo-carved
  strongroom and its named parts.
- Removed separate wall rivets because the photographs already carry those
  rivets on the carved surfaces.
