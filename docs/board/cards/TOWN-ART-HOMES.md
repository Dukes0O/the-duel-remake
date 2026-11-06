# TOWN-ART-HOMES

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-homes`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most three. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-homes.py`, `public/assets/models/wasteland/town/homes.glb`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## What to build
Homes grow by themselves, so each tier must plainly look better than the one before, and three shacks in a row must not look the same.
- `tent-a`, `tent-b` 1x1: patched canvas on poles, a cooking drum, a chair.
- `shack-a`, `shack-b`, `shack-c` 1x1: tin shacks, different roofs and lean-tos.
- `stack-a`, `stack-b` 1x1: two and three storeys of tin rooms on scaffold legs with ladders and a washing line.
- `block-a`, `block-b` 2x2: shipping containers stacked with cut windows, stairs, roof gardens in old tyres.
- `terrace-a` 2x1: salvaged brick and steel, the best house in town, shutters and a porch.
Every home has a `<id>:lamp` part.

## Claude answers

## Claude answers

Round 6 of 6, Kyle's limit (5 November). Merged as the working set. The colours, roofs, braced upper floors and canvas tents read well from the mayor's height, and ten homes make a lively street. Still short of the photo: the shapes are boxy, the roofs are large and plain, and patches look placed rather than grown. A later art pass can take these from the photo by projecting it, as the Dam did.

Test change reviewed (rule 18): `tools/test-blender-output.mjs` no longer asks for one shared atlas, because `town_base.py` removed the atlas for every town family. It now checks each picture is a separate JPEG and holds the same total picture area to the old 1K budget. Named homes, plot sizes and triangle budgets are unchanged. Nothing is loosened.

This card also owns its pictures in `public/assets/models/wasteland/town/textures/` and their lines in `CREDITS.md`.
