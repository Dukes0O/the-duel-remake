# TOWN-ART-FOOD

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-food`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most six. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-food.py`, `public/assets/models/wasteland/town/food.glb`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## What to build
- `greenhouse` 3x2: frame of old car windscreens and plastic sheet, green rows inside.
- `goat-pen` 2x2: pallet fence, shelter, trough (the goats are separate).
- `chicken-run` 1x1: wire run, a coop made from a car boot.
- `soup-kitchen` 2x1: big pot on a fire, awning, benches.
- `stall-a`, `stall-b`, `stall-c` 1x1: market stalls with awnings and goods you can tell apart: fruit crates, tools, tyres.
- `shopfront-a`, `shopfront-b`, `shopfront-c` 1x1: small shops with big hand-painted signs readable from above and from the road: FOOD, TOOLS, FIX-IT.
- `canteen` 2x1: a bus body turned into a diner.
- `market-hall` 3x3: a big roof of mismatched tin on steel posts, stalls under it.

## Claude answers

Soup kitchen, 7 November (Claude): **passes, merged.** It holds together from every side, with an open bay you can look into, a real pot over its fire, benches and a pitched roof that reads from the mayor's view. Short of the photo: the flames are simple cones, and the wall is softer than its photo. The six rounds count per building; the canteen, stall, shopfront, market hall and greenhouse remain.

Market hall, 7 November (Claude): **round 2 passes, merged.** The patched tin roof on its steel frame, the floor, the corner store and the rows of stalls read as a market from the road and from the mayor's view. Short of the photo: the stalls sit dark and small under the roof, and the dark roof bars are heavier than the photo's. The canteen, stall, shopfront and greenhouse remain.

Canteen, 7 November (Claude): **round 9 passes, merged.** A rusty bus, square from the front and true to its side photo, with a serving hatch, a canvas awning on the wall above it and stools beside it. Short of the brief: it has no hand-painted sign yet. The stalls, shopfronts, greenhouse, goat pen and chicken run remain.

Market stalls, 7 November (Claude): **round 12 passes, merged.** Three stalls of rusted pipe with plank counters and a sagging, patched canvas awning from the photos, told apart by fruit crates, hanging tools and tyres. Short of the photos: each post is two flat cut-outs side by side rather than one round pipe. Test change reviewed: this family's limits rise to 8 MB and 2048 by 2048 texture pixels, near the other photo-built families, because one 1K atlas for the whole family had blurred the market hall and soup kitchen; their pictures are back at full size. No shape, part or triangle check is loosened. The greenhouse, goat pen, chicken run and shopfronts remain.

Greenhouse, 7 November (Claude): **round 14 passes, merged.** A pitched greenhouse of rusted frame, car windscreens and patched plastic, with rows of green plants seen through it, matching its photos from every side and lovely from the mayor's view. The goat pen, chicken run and shopfronts remain.

Shopfronts, 7 November (Claude): **round 16 passes, merged.** One small patched tin shop, carved from its photos, made three ways: FOOD, TOOLS and FIX-IT, each with a hand-painted board facing the road and a second on its roof, readable from the mayor's view. Short of the photos: the roof comes out rounded where the photo's is pitched. The goat pen and chicken run remain.

Goat pen, 7 November (Claude): **round 19 passes, merged.** A square pen of weathered pallet fencing with its gaps open, a timber shelter with a rusty tin roof in one corner and a trough, matching its photos from every side. The chicken run in the same file is still the box-built round 17 piece and goes round again.

Chicken run, 7 November (Claude): **round 20 passes, merged; the card is done.** A timber-framed wire run with a coop made from the back of a rusty red hatchback, its boot lid up, matching its side photo. Short of the photos: the run's roof is flat where the photo's is pitched, and the wire is very faint. Every building on TOWN-ART-FOOD has now passed: soup kitchen, market hall, canteen, stalls, greenhouse, shopfronts, goat pen and chicken run.

Test change reviewed (Claude, 7 November): the food check now reads the size of PNG pictures as well as JPEGs, for the chicken run's see-through wire, and checks the PNG signature; both kinds count against the same 2048 px and total-pixel limits. Nothing is loosened.
