# WW-ART-SEA

The short board entry controls current state, ownership, dependencies and locks.

Everything Act 5 needs that nothing else draws, from `docs/story/the-sea-works.md`.

**Files you own:** `tools/blender/sea-works.py`, `public/assets/models/wasteland/scablands/sea-works.glb`, `docs/board/looks/ww-art-sea/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/WW-ART-SEA.md` with a Removed section.

**Recipe,** each a named part:
- `old-gear`: a huge, silted, rotten gear wheel about 7 m across, dripping dark mud. `gear-section`, one bright new curved casting with bolt holes, 24 of which make the same wheel, and `gear-whole`, all 24 bolted.
- `iron-mule-gear`: a flat wagon stacked with gear sections, chained down, that couples to the Mule from WW-ART-MULE.
- `causeway`: a straight stone bank with rails on top, a kit of 40 m lengths.
- `harbour-wall`: an old stone sea wall, too high for a car, with iron rings, dried weed and new stone on top where it was raised, a kit of 40 m lengths. `harbour-gate`, big steel road gates in the wall, shown open and shut. `harbour-ramp`, one stone slipway through it, and `causeway-arch`, where the rails pass through, too low for a car.
- `works-camp`: tin huts, a long kitchen and washing lines, on stilts because everyone knows what is coming.
- `magnus-magnet-big`: a magnet far too big for its crane, on a second crane, to go with WW-ART-PEACE's `magnus-crane`.
- `mrs-vane`: a small, upright older woman in a spotless white coat and white gloves, carrying one envelope. She should look more frightening than anyone else in the game while doing nothing at all. Rigged as the town's walkers are.
- `water-front`: a long, tall, churning brown front of water, wide enough to fill the bed, that can run as a loop. It must read as water from behind a car, and should be frightening but not cartoonish.

Show each from car height at 20 m on one sheet, plus `mrs-vane` beside a crew member for size, and name each on the sheet.

Budget: 50,000 triangles, 3 MB, read back from the glb. Original shapes only, gritty and hand-built, never toy-like, except Mrs Vane and the new gear sections, which are meant to look clean. Metres, +Y up, one root empty, named parts as `tools/blender/magnus-magnet.py` does. Reuse the materials of the dam, town base and tanker recipes first. Earlier rounds failed for these reasons, so do not repeat them: ground standing as a wall (check your up axis first), dark sheets, subjects too small in the frame, one mottled colour. Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`.

**Rounds:** at most three, each with one Blender-rendered sheet, JPG at most 500 KB. Look at your own sheet and fix it before you submit. Then set `waiting_on: claude`. Commit the model with every submitted round.

**Checks:** `tools/test-blender-output.mjs`, `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## Claude answers
