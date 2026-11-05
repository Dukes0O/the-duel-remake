# TOWN-ART-PLANTS

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-plants`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most three. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-plants.py`, `public/assets/models/wasteland/town/plants.glb`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

Reuse first: Kenney's industrial and factory kits in `C:/Users/kyleb/dev/art-library/` (CC0, credit them) as donors where they can be made gritty.

## What to build
- `crusher` 4x3: a big steel hopper you can back a truck up to, jaws (`crusher:jaw` moves), a sloped conveyor (`crusher:belt`), a discharge point; gravel pile beside it.
- `batch-plant` 4x4: silo, aggregate bins, a mixing tower with a chute a truck can drive under.
- `conveyor` under 1x1 pieces: straight and end, that join.
- `formwork-1` to `-4`: wooden forms by footprint with steel showing; `formwork-N:wet` and `formwork-N:set` for the concrete.
- `wellhead` 1x1: a drilled well's casing and valve, a hand-painted number, a pump jack on it (`wellhead:beam` rocks).
- `pump-station` 2x2: a fenced brick block with pipes in and out.
- `radar` 1x1: a salvaged airliner radar dish on a lattice tower; `radar:dish` turns.
- `machine-yard` 6x4: a dirt yard with sheds, fuel drums, parts piles.

## Claude answers
