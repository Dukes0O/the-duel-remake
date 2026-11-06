# TOWN-ART-BASE

The short board entry controls current state, ownership, dependencies and locks.

The first town art card. All the other town art cards use what this builds, so that every building looks like one place.

Build:

1. `tools/blender/town_base.py`: a module the town recipes import. The look comes from here. Materials with real uneven wear, baked into a shared 1K atlas: rusted steel, galvanised tin (sun-bleached on top, rust below the bolts), weathered plank, patched canvas, cracked concrete, salvaged brick, dirty glass, faded hand paint, sand banked at the base. Helpers: corrugated sheet with a bent edge and a ragged corner, roof of mismatched panels at a slope, beam, pipe run with elbows, ladder, scaffold bay, weld seam, rivet strip, hand-painted sign with readable text, washing line, sandbag row, drum, tyre stack. Reuse what is good in `tools/blender/scablands-tintown.py` (it passed; it is the look to match), `water-works.py` and `rustwall.py`. Include a footprint helper and an export that gets the up axis right, the fault that wasted the most rounds so far.
2. `tools/blender/town-sheet.py`: the standard sheet. For a family glb, each building gets two pictures side by side: from above at 45 degrees and from the driver's seat, on flat sand with a drawn 8 m grid, a person and a car for size, the subject filling the frame, bright clear daylight and its id as a readable label. JPG at most 500 KB, however many buildings. Use `--page N` when a family needs more than one sheet.
3. A proof: a `town-sample` recipe with one 1x1 shack and one 3x2 workshop, run through both, as the first sheet.

Files you own: those three, `public/assets/models/wasteland/town/sample.glb` (only until a real family replaces it; name who removes it in the change note), `docs/board/looks/town-art-base/`, one entry in `tools/test-blender-output.mjs`, `docs/changes/TOWN-ART-BASE.md`.

Look at your own sheet and fix it before you submit: it must look at least as good as Tin Town's `docs/board/looks/ww-art-tintown/round-2.jpg`. Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. No Chrome, no frame timing, no new dependency. At most three rounds.

## Claude answers

**Round 1: no.** The sheet is the right idea: both views, labels, bright light, the size marked. Keep that, but crop away the grey bars and use a real car from the game for scale, not a black lump. The models are the fault, and everything else in the town will copy them, so this has to be right.

- **Materials are blurry and bumpy,** like painted clay. The roof is a smooth grey slab with orange peel on it. There is no tin in the tin. Corrugation has to read as real ridges at about 10 cm spacing, in the shape or a sharp pattern, and the atlas has to stay sharp at the driver's-seat view.
- **Rust is a flat red panel.** Real rust runs: streaks below every bolt and lap, worst at the bottom, bare metal at scratches, sun-bleached on top. Use real variation, at more than one scale.
- **The shapes are boxes.** A shack is not a box with a slab on it. Mismatched panels at different angles, a bent edge, a door that is somebody's old car door, a lean-to, a stovepipe, things tied down with wire.
- **Reuse what already passed.** Open `docs/board/looks/ww-art-tintown/round-2.jpg` and `tools/blender/scablands-tintown.py`, and start from those shapes and materials rather than a fresh start. Round 2 must be at least that good, seen side by side: **put one Tin Town shack in the sheet beside your own.**
- The sheet needs one more thing: a street of six buildings seen from above, because the look has to hold up in a crowd.

Name it `round-2.jpg` with `round-2-review.md`, and remove round 1.

**Round 3: pass.** Real corrugated tin with real rust, warm light, a street that varies. Merge. Every town family starts from this, and the picture-baked materials are why it works.
