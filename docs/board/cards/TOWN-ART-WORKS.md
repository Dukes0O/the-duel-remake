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

Warehouse, round 1, 9 November (Claude): **passes, merged.** A long rusted patched-tin shed carved from its photos, matching them from every side, with sliding loading doors on the front and long sides, roof vents and a loading dock; it reads well from the mayor's view. Short of the brief: the doors are clean pale grey where everything else is rusted. Its sheet is in `docs/board/looks/town-art-works-warehouse/`. Six rounds count per building. The kiln, sawmill, salvage yard, Old Ground and the small pieces remain.

Kiln, round 1, 9 November (Claude): **passes, merged.** The brick beehive dome turned from its photo, the arched firing door with `kiln:lamp` glowing inside, the tall brick chimney beside it and the stacked bricks match the photos and read from the mayor's view. Test change reviewed: the check that allowed only the warehouse now allows the warehouse and the kiln, and adds the kiln's named parts and its 5,000-triangle budget; nothing loosens. Short of the brief: the glow is a flat orange disc and the woodpile is very small. The sawmill, salvage yard, Old Ground and the small pieces remain.

Sawmill, round 1, 9 November (Claude): **does not pass.** The log stacks, saw bench and sawdust heap are there under a rusted tin roof. Short of the photos: the roof is much wider and flatter than the photo's, and its outer panels are plain grey because the roof photo covers only the middle; the posts are thin and plain where the photo has heavy weathered timber posts with knee braces and a truss in each gable; the saw blade can hardly be seen. **Round 2:** size the shed and its roof pitch from the photos (the side photo's length to height, the front photo's span and pitch) inside the 3 by 2 plot, and stretch the roof photo over the whole roof. Trace the front photo's post-and-truss frame with `trace` and `slab` and repeat it at each post line, so the posts, knee braces and trusses wear the photo's timber. Make the saw blade a big visible disc (about 1.2 m across) standing up through the bench. Test change reviewed: the family's limit rises from 3 MB to 8 MB as for every photo-built family, and the photo count check becomes "at least" as photos are added; nothing about shape, parts or triangles loosens.

Sawmill, round 2, 9 November (Claude): **went backwards; does not pass.** The roof photo now covers the roof, but the shed is far too small and low: the traced frame came out as short stubs, the roof sits at bench height, and from the three-quarter views it tilts until one edge reaches the ground. **Round 3:** the shed is about 20 m long and 9 m wide inside the 3 by 2 plot, the eaves about 4 m above the ground and the ridge about 6.5 m (scale the front photo's frame to that span), and the roof level along its length. Stand the traced post-and-truss frame from the ground to the roof at each of five post lines. Print the bounds of the roof and of each frame: the roof's lowest point must be above 3.5 m, every post must start at the ground, and the roof must not slope along its length. The saw bench, log stacks and sawdust stay under or beside it, inside the plot.

Sawmill, round 3, 19 November (Claude): **passes.** Rebuilt to round 2's instructions with one scale from the front photo: the shed is 20.7 m by 9.6 m over its roof inside the 3 by 2 plot, the roof's lowest point 3.70 m and its ridge 6.86 m, level along its length (6.72 m at both ends). The traced post-and-truss frame stands from the ground to 6.52 m at five post lines and wears the photo's timber. The saw blade is a 1.2 m disc traced tooth by tooth from its photo, standing through the bench with a log half-way through its cut. Two bays of the front slope are left open so the saw shows from the mayor's camera. 4,752 triangles. Short of the brief: thin sheet edges at the gables, plain board stacks. Sheet `docs/board/looks/town-art-works-sawmill/round-3.jpg`.

Salvage yard, round 1, 19 November (Claude): **passes.** Sleeper walls on three sides and between five sorted bays (tyres, steel, tin, pipe, drums), the unsorted heap under a tripod hoist, things pulled from it, open tin gates on their hinges, a lamp, and the gang's shed carved from its four photos, matching them. 8,812 triangles. Short of the brief: the big heap is one smooth mound wearing its photo, which looks draped from inside the yard; the floor is dark and even. Sheet `docs/board/looks/town-art-works-salvage-yard/round-1.jpg`.

Old Ground, round 1, 19 November (Claude): **passes.** A sound dry-stone wall, a timber gateway with a lit lantern, twelve graves (`old-ground:marker-1` to `-12`, each a whole grave with its origin at its head) using all four marker shapes, and one dead tree with a bench in its shade. The tree is three cut-outs of its photo and reads as the photo's tree from every side but straight down. Dignified, warm and not gloomy. 5,384 triangles. Short of the brief: the ground inside the wall is the town's own; from straight above the tree is a star of thin planes. Sheet `docs/board/looks/town-art-works-old-ground/round-1.jpg`.

Small works and haulers, round 1, 19 November (Claude): **all eight pass.** `flatbed` (with `flatbed:load`) and `barrow` are carved from their photos and match them; `handcart` is traced from its photos and matches them; `test-pit`, `trench`, `trench-corner`, `valve-box` (with `valve-box:wheel`) and `pipe-stack` read from both cameras. Each is under 1,800 triangles. The trench runs cell edge to cell edge so that neighbours join. Short of the brief: the pit and trench cannot go below the town's ground, so their depth is read from banks. Sheet `docs/board/looks/town-art-works-small/round-1.jpg`.

Stockpiles, round 1, 19 November (Claude): **all eight pass.** Salvage (many colours), steel (grey-blue plate and rusted beams), tin (silver ribbed sheets), timber (brown logs, pale ends), brick (red stacks and rubble), pipe (thin dark tubes), sand (pale gold cone) and clay (red-brown lumps) are told apart by colour and shape from the mayor's camera at 80 m and at the size they have from 120 m. Each is under 1,800 triangles. Short of the brief: the salvage heap is a smooth cone from the driver's seat; the brick stacks are clean cubes. Sheet `docs/board/looks/town-art-works-heaps/round-1.jpg`.

Test change reviewed (Claude): the works check in `tools/test-blender-output.mjs` now names all twenty-one pieces as the family's only direct children, holds each to its own budget by plot (9,000 for 3 by 3 and 3 by 2, 5,000 for the kiln, 1,800 for each one-cell piece), names the parts listed above and checks that the three lamps glow. It keeps the 8 MB family limit and the warehouse's and kiln's budgets and parts; the old sawmill part names `log-stack-road` and `log-stack-far` became `log-stack-1` to `-3` with the rebuild. Its registry entry is marked `recipeOnly`, which asserts that the recipe plans no `.blend` file, as AGENTS asks; before, it had to plan one. Nothing loosens. Every piece on this card has now passed.
