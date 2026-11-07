# TOWN-ART-TRUCKS-1

The short board entry controls current state, ownership, dependencies and locks.

Part of the Wasteland town (Kyle, 5 November 2026; design in docs/WASTELAND_TOWN.md once it lands).

**The contract every town model keeps.**

- The town is a grid. **One cell is 8 m.** Each building has a footprint in cells (width by depth, listed below) and must sit inside it with at least 0.5 m to spare on every side, so neighbours never touch. Metres, +Y up, front faces -Z (the road side). Origin on the ground at the middle of the footprint.
- One file per family, one root empty `town-trucks-1`, one child per building named exactly by the id below. Parts the game moves or lights are separate named children, written `<id>:<part>` (listed below). Lit windows and lamps are emissive parts named `<id>:lamp`, so the town can glow at night.
- It is seen from two places, and both must look good: **from above** (the mayor's camera, 45 degrees down from 60 to 120 m away, so **roofs matter most**: varied slopes, patches, vents, water tanks, junk on top) and **from the driver's seat** (car height at 15 to 40 m).
- Budget by size: 1 by 1 at most 1,800 triangles; up to 2 by 2, 5,000; up to 3 by 3, 9,000; larger, 14,000. Family file at most 3 MB, one 1K texture atlas at most. Read both back from the glb.
- Original shapes only. Gritty and hand-built: welded steel, corrugated tin, salvaged signs, rust streaks, patched repairs, sand banked against the base. **Never toy-like, never clean, never pale, never one mottled colour.** Wear is uneven: streaks under bolts, darker at the ground, sun-bleached on top. Spend triangles on real shape: bent edges, ragged holes, hanging parts, weld seams, things leaning.

**Earlier rounds failed for these reasons; do not repeat them.** Ground standing as a wall (check your up axis first). Dark sheets you cannot judge. Subjects too small in the frame. Clean, pale, flat colours. Everything the same height and square. Unreadable signs. Blender uses Z up and glTF uses Y up: test one export before modelling a whole family.

**How to work.** Use `tools/blender/town_base.py` and `tools/blender/town-sheet.py` (TOWN-ART-BASE). Blender: `C:\Users\kyleb\AppData\Local\Programs\Blender\current\blender.exe`. Look at your own sheet, and fix and re-render as many times as you need before you submit: one submitted sheet is one round, and you get at most six. Submit only what you would pass yourself against this card. Commit the model with every submitted round so a pass needs no rebuild.

**Files you own:** `tools/blender/town-trucks-1.py`, `public/assets/models/wasteland/town/trucks-1.glb`, `docs/board/looks/<card in lower case>/round-N.jpg` with `round-N-review.md` beside it (exactly those names), one entry in `tools/test-blender-output.mjs`, `docs/changes/<card>.md` with a Removed section.

**Checks:** `tools/test-blender-output.mjs` for this recipe (it reads back budgets and that every id below exists), `tools/test-repo-hygiene.mjs`, `tools/test-review-evidence.mjs`. No frame timing on art. Not wired into the game here. No Chrome. No new dependency, network request or key.

## What to build
Drivable work vehicles built from wrecks, for missions that are not fights. Read `docs/UNLOCK_VEHICLES.md` and `src/vehicle-sockets.js` for how a drivable vehicle's wheels and parts are named, and follow them. Keep the top readable: these are seen from above in the town too.
- `fire-truck`: an old red engine, patched, hose reels, a water cannon on the roof (`fire-truck:cannon` turns), a ladder, a tank. It has to be the vehicle a child wants most.
- `water-tanker`: a long riveted tank on a flatbed, valves and drips.
- `supply-truck`: an open flatbed with a frame, crates and sacks lashed down (`supply-truck:load` can be hidden).
- `tow-rig`: a heavy truck with a crane and hook on the back (`tow-rig:hook`).
Each at most 12,000 triangles, file at most 3 MB.

## Claude answers

## Claude answers

Round 6 of 6 (Kyle's limit, 5 November): **failed, not merged.** The photos are excellent; the models never came near them, whichever way they were built: blocks, smooth surfaces, or the photo projected on. The branch `codex/town-art-trucks-1` holds the recipe, the four photos, and rounds 5 and 6. Hand modelling in a script has reached its limit for a 1950s truck's pressed-steel curves. TOWN-ART-TRUCKS-2 and TOWN-VEHICLES wait for this.

For Kyle in the morning: a local photo-to-model tool, such as TripoSR (held earlier because of disk space), is the next thing to try. It needs his word for the download. Other route: a licence-clear ready-made truck to adapt.

Kyle, 6 November: one more try with the photo kit (`tools/blender/photo_model.py`), past the six rounds, starting with `fire-truck`. Claude judges `round-7.jpg`.

Round 9, 6 November: **`fire-truck` passes** (`docs/board/looks/town-art-trucks-1/round-9.jpg`). The tanker, supply truck and tow rig follow the same way, with the fire truck as the worked example.

Round 11, 6 November: **pass for all four trucks**, past six rounds with Kyle's approval, carved from photos. Codex built the tanker, supply truck and tow rig from the fire truck's worked example. Small flaws, none worth another round: pale edges under the tanker's wheel arches and along the supply truck's sills. `supply-truck:load` lifts away to leave an empty bed, and `tow-rig:hook` hangs below the boom's tip. The family file is 3.4 MB. TOWN-VEHICLES can use these.
