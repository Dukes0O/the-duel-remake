# EVERBURN-WELL-ART

Claude, 10 November 2026.

## What was wrong

The model loader renames every part of a model as it loads: a space becomes an underscore and a full stop is dropped
("Furnace side armor.001" arrives as "Furnace_side_armor001"). `src/world/scablands-scene.js` searched the vehicles model
for "Old Smoke's rolling furnace" and "Big Bess gas truck" by their names in Blender, found neither, and stopped its loading
step with "Scablands vehicles art is missing its everburn model". The Everburn well's buildings, the furnace, the Boneyard's
art and Big Bess were never drawn in the game. The scene test passed because its stand-in loader kept the Blender names.

## What changed

- `src/world/scablands-scene.js`: part names are compared in a plain form (underscores read as spaces), for the furnace, Big
  Bess, the six plates and the nine vent lights. A failed loading step now also writes an error to the browser console, so
  every browser check that visits the Scablands reports it.
- `tools/test-scablands-scene.mjs`: a second scene whose stand-in loader renames parts the way the real loader does. It
  fails without the fix ("the art loads when parts carry the loader's names") and passes with it. No existing assertion changed.
- `tools/scenarios/everburn-well.mjs` (new browser check, the card's own): stands the car at the well in job 6 and fails when
  the art is not ready, the well has no buildings, the furnace has not its 6 plates and 9 vent lights, or the furnace model is
  more than 30 m from its actor in the chase.

## Checks

- `node tools/test-scablands-scene.mjs`: passes; fails with the fix taken out.
- Browser check `everburn-well`: passes (art ready; furnace 111 meshes, 6 plates, 9 vent lights; model 3 m from its actor).
- Lane tier: 29 of 29. `npm run build`: passes.
- Look (Claude): the well's derrick and the furnace are drawn. The furnace itself does not look right; see below.

## Found during the look

- The furnace reads as a near-black box with flame cones standing out of one end. The glowing door, the plates and their loss
  after a hit cannot be told apart at chase distance. Card EVERBURN-FURNACE-LOOK (Claude).
- Job 6 starts the car inside the well's derrick. Noted on QA-EVERBURN-SCREENS.

## Sound

No new game event.

## Removed

Nothing.
