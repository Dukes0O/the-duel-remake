# TOWN-ART-MACHINES-2

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-machines-2`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most six. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-machines-2.py`, `public/assets/models/wasteland/town/machines-2.glb`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

**Machines have one more rule.** Read `docs/MACHINES.md` sections 5 and 9. Each machine is built so the game can move it: every moving part is its own node named `<id>:<joint>`, with its origin exactly at the real pivot (a boom's origin at its hinge pin), and parts nest the way they really do (cab on tracks, boom on cab, arm on boom, bucket on arm). The sheet shows each one in a working pose as well as at rest. They look built from scrap in a scrapyard, by people who knew what they were doing: welded plate, mismatched paint, an airliner's landing gear as hydraulic rams, a real sense of weight. Each machine at most 15,000 triangles. They are what Gratian will stare at for years, so they matter more than anything else on the board.

## What to build
- `loader`: wheeled, articulated in the middle; `loader:arms`, `loader:bucket`.
- `mixer-truck`: `mixer-truck:drum` turns, `mixer-truck:chute` swings down.
- `roller`: a road roller with one huge front drum; `roller:drum`. `paver`: a tracked paver with a hopper in front and a screed behind.
- `drill-rig`: a truck with a mast; `drill-rig:mast` raises, `drill-rig:string` feeds down.
- `crane-truck`: `crane-truck:boom`, `crane-truck:hook`. `pipe-truck`: a flatbed of pipes that drops them one by one.

## Claude answers

8 November (Claude): **Kyle approved more rounds for this card** ("machines def. need another round or more", 8 November). The six-round limit no longer stops it; each machine gets up to six further rounds from round 7, and the round count stays honest in each review note. **The family file limit is 8 MB**, as for every photo-carved family, because each machine carries its own photos; raise it in `tools/test-blender-output.mjs` and say so in the change note. No check of shape, joints, parts or triangles loosens: each machine stays at most 15,000 triangles. Seams on the carved body are a fault to fix, not a reason to stop. Round 6 failed because the machines were the old block shapes; round 7 carves the mixer truck from single-view photos.
