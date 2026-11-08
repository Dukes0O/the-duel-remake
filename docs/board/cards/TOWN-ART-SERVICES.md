# TOWN-ART-SERVICES

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-services`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most six. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-services.py`, `tools/blender/town-services-2.py`, `public/assets/models/wasteland/town/services.glb`, `public/assets/models/wasteland/town/services-2.glb`, `public/assets/models/wasteland/town/textures/toll-bank-{side,front,rear,top}.jpg` with `toll-bank-CREDITS.md`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry per family in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## What to build
- `town-hall` 3x3: the biggest roof in town, a clock made from a car wheel, flags, a notice board out front.
- `scrapyard` 3x3: crushed-car stacks, a crane, a magnet.
- `forge` 2x2: a brick furnace with a real glow; `forge:lamp`, anvil, chimney.
- `workshop` 3x2: a car on a lift inside open doors, tyre stacks.
- `motor-pool` 4x2: a long shed with four numbered bays.
- `paint-shop` 2x2: spray booth, drips of every colour down the walls.
- `trading-post` 3x2: crates, scales, a loading dock, a big painted sign.
- `toll-bank` 2x2: a squat steel strongroom with a toll barrier for a porch.
- `school` 3x2: an old bus and a lean-to with a chalkboard outside.
- `radio-mast` 1x1: very tall guyed mast, red lamp; `radio-mast:lamp`.
- `helipad` 4x4: a level steel deck with a big painted H, wind sock, fuel drums, floodlights. Low, so a helicopter can land on it.
- `notice-board` under 1x1.

## Claude answers

Round 6, 7 November (Claude): **the Town Hall and the Forge pass, and the Workshop will do for now.** The Town Hall is the best carve of the family. The Forge's fire stands proud of its wall as a block; the Workshop's roof is plain grey. The scrapyard and the other eight buildings remain. The six rounds count per building. Test change reviewed: this family's file limit rises from 3 MB to 8 MB, as every photo-carved family has, because each building now carries its own photos; no check of shape, parts or triangles is loosened. Size targets are advisory, and 4.14 MB is fine.

Scrapyard, 7 November (Claude): **round 4 passes, merged.** The traced gantry crane with its hook and magnet stands over two piles of separate crushed wrecks, dark and rusty in three kinds, inside the fence with scrap on the ground. Short of the photo: the piles are a little neat, with the cars lying flatter and squarer than the photo's tumbled heap. The motor pool, paint shop, trading post, toll bank, school, radio mast, helipad and notice board remain.

Motor pool, 7 November (Claude): **round 7 passes, merged.** A long rusted tin shed, closed at the back and ends, open along the road side on its posts, under a patched pitched roof, with the concrete floor, the inspection pit and drums inside. Short of the photo: the front posts are thinner than the photo's and its cross braces are missing. The paint shop, trading post, toll bank, school, radio mast, helipad and notice board remain.

Trading post, 7 November (Claude): **round 9 passes, merged.** The patched store matches its photos; a porch of the store's width now stands against its front under a sloping tin roof, the TRADING POST sign is on the roof edge facing the road, and crates, drums and tyres stand about. Short of the brief: the sign is small from the mayor's view and the porch roof is plainer than the store's. The paint shop, toll bank, school, radio mast, helipad and notice board remain.

Paint shop, 7 November (Claude): **round 10 passes, merged.** A rusted tin shed splashed with red, yellow, blue and green paint, its booth door dark inside, drums outside, matching its photos from every side. The family file is now 7.7 MB of its 8 MB: the six buildings that remain on this card need it split into two files, or their pictures shared, before they are built.

Split and round 11, 8 November (Claude): **the split is merged; the toll bank does not pass yet.** The family is now two files: `services.glb` holds the seven passed buildings (unchanged, 7.3 MB) and `services-2.glb` holds the toll bank, school, radio mast, helipad and notice board. Test change reviewed: the five buildings moved to their own check with the same per-building budgets and the radio-mast lamp; the first family's triangle total shrinks from 120,000 to 55,000 and the new family gets 31,600; nothing loosens.
Toll bank, round 11: the rusted riveted shell, its roof and the view from above match the photos well. Short of passing: **the vault door is the building's identity** and the photo's round riveted door with its wheel and hinges became a flat brown panel with a ring; build it as its own piece wearing the photo's door region, standing proud of the wall in its heavy frame. **The toll barrier and booth are too small to read** as a toll gate from the mayor's view: a long striped arm across a lane beside the road side, on a post with a counterweight, and a booth with a window and its own small roof. The side view's model render is cut off at the bottom; frame it whole.

Toll bank, round 12, 8 November (Claude): **passes, merged.** The vault door now matches its photo, round-framed with its wheel and hinges in the heavy frame, and the booth with its window and roof reads from the mayor's view beside the porch. Short of the brief: the barrier arm is thin and its stripes do not show. The school, radio mast, helipad and notice board remain, in `services-2.glb`.

School, round 13, 8 November (Claude): **passes, merged.** The rusted yellow bus matches its photos from the side, front, rear and above, with its windows, grille and rear door; the tin lean-to on timber posts along its yard side and the chalkboard on legs read from the mayor's view. Short of the photo: the tyres are tan rather than dark rubber, and the bonnet's front corner is a little pinched from the side. The radio mast, helipad and notice board remain, in `services-2.glb`.
