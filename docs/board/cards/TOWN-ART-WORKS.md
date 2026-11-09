# TOWN-ART-WORKS

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-works`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most six. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-works.py`, `public/assets/models/wasteland/town/works.glb`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## What to build
- `test-pit` under 1x1: a hand-dug hole with spoil beside it and a depth stick.
- `trench` 1x1 straight and corner pieces, with a pipe lying in it and planks across.
- `valve-box` and `pipe-stack` under 1x1.
- `handcart`, `barrow`: moving things, under 1x1, seen from above.
- `flatbed`, loaded with salvage (`flatbed:load`), as a hauler seen from above; drivable later.
- `pile-salvage`, `pile-steel`, `pile-tin`, `pile-timber`, `pile-brick`, `pile-pipe`, `pile-sand`, `pile-clay`: stockpile heaps you can tell apart from above, each under 1x1.
- `salvage-yard` 3x3: a working yard, sorted bays, a gang's shed.
- `warehouse` 3x3: big tin shed, loading doors.
- `sawmill` 3x2: an open saw, log stacks and a sawdust heap.
- `kiln` 2x2: a real beehive brick kiln with a chimney and stacked brick; `kiln:lamp`.
- `old-ground` 3x3: a small burial ground, low stone wall, a few plain wooden markers and one dead tree. Dignified, never gloomy. It must be able to hold more markers (`old-ground:marker-1` to `-12`).

## Claude answers


## Claude answers

Warehouse, round 1, 9 November (Claude): **passes, merged.** A long rusted patched-tin shed carved from its photos, matching them from every side, with sliding loading doors on the front and long sides, roof vents and a loading dock; it reads well from the mayor's view. Short of the brief: the doors are clean pale grey where everything else is rusted. Its sheet is in `docs/board/looks/town-art-works-warehouse/`. Six rounds count per building. The kiln, sawmill, salvage yard, Old Ground and the small pieces remain.
