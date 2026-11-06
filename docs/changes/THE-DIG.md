# THE-DIG second pass

## Changed

- Queued E, Q, C and Tab edges until a fixed simulation step consumes them. The frame loop already rendered continuously; the matching screenshots came from capture timing, so the scenario now waits for two animation frames before every picture.
- Opened in the exterior chase view. The first view frames the excavator, truck, Dome and heap; controls start open and the HUD panels use smaller text at the edges.
- Moved the truck and heap to opposite sides of the excavator. The headless test proves each is within the bucket's reach after a 90 degree swing, without moving the tracks.
- Digging now requires the bucket tip to touch ground. A raised bucket asks the player to lower the boom, and a full bucket asks the player to load the truck. Loading uses the truck bed rectangle. A miss spills the dirt into the ground layer and says so.
- Replaced the plain yard floor with the Scablands dirt texture across the full yard. Natural and edited ground share one material and matching color variation; turned earth darkens with a soft edge. The ground extends beyond the fog range beneath the Dome.
- Kept bucket and truck loads visible, grew the load heap with volume, and added larger dirt bursts, tip dust and a small bite shake. Track and truck speed now ease under acceleration and braking.
- Updated the browser scenario to swing, lower, dig, swing to the truck, load, drive, tip, trench, and return with Escape. It takes a picture after each step.

## Checks

- `node tools/test-the-dig.mjs` - passed. Added checks for a queued press surviving a frame with no fixed step, both 90 degree reach swings, ground contact before digging, and a missed load spilling into persistent ground. Existing assertions remain unchanged.
- `npm run build` - passed. Vite emitted the lazy `dig-game` chunk (32.46 KB) and reported the existing ineffective `src/game.js` dynamic-import and large-chunk warnings.
- Browser and look checks - Claude should run `tools/scenarios/the-dig.mjs` with memory-only storage and review every capture. Check the opening composition and HUD, soil and chunk edges to the fog, bucket contact and load, bed heap growth, spill and dust, trench clods and ridge, controls, camera cycling, and Escape return.
- Lane tier - not run, as directed.
- Race fingerprints - not measured; this sandbox does not change race rules.
- Changed assertions - none changed; the new assertions are additions.

## Removed

Replaced the separate flat floor and edited-chunk material treatment with the shared textured ground material.

## Claude's pass in the test browser (5 November 2026)

Codex cannot see the browser, so Claude drove this pass from the pictures. Faults found only by running it:

- The family model lays machines out in a row, and each machine kept that offset, so it stood metres from where the simulation thought it was. Each now starts at its own origin.
- `GLTFLoader` removes `:` from node names, so no joint moved on screen. The view now finds either spelling. `tools/test-machine-view.mjs` now uses the loaded spelling.
- The machine data was invented: bucket reach about 4 m against 8.6 m on the model. Excavator pivots, reach and the truck's bed now come from `machines-1.glb`, so the bucket digs where it is seen. The chain cuts behind the trencher, where its boom is.
- Left and right were swapped on screen, for swinging and steering. They now match.
- The machine sound cues did not exist, and playing one stopped the game with a blank screen. They are in `src/sound-bank.js`, and a test now requires them.
- Metal drew black with nothing to reflect, so machine metalness is limited in this yard. The bed lifts and the load lands behind the truck.
- One ground surface with the game's `ground-color.jpg`, one colour function (`groundColour`), so natural and edited ground join with no seam.

Still to come: the model's parts sample the atlas's empty white cells in the game (TOWN-ART-MACHINES-1).

## Changed assertions (Claude's review, rule 18)

- `tools/test-machine-haul.mjs` and `tools/test-machines.mjs`: "a loaded truck drives more slowly" now compares after 8 and 12 seconds, not 1. Machines now accelerate gradually, so after 1 second both are still below either top speed. The check is unchanged and still fails if load has no effect.
- `tools/test-machine-haul.mjs`: the truck stands at the model's real reach; the "bucket over the bed" check is now the bed's real rectangle, which is stricter than the old circle of 1.8 m.
- `tools/test-machine-trencher.mjs`: reserved shapes move to where the chain now cuts, 3 m behind the machine. Nothing is loosened, and a refusal must now also move no soil at all.
- `tools/test-machine-view.mjs`: nodes use the spelling a loaded model really has; the view reads the state the machine actually starts in.
- `tools/test-the-dig.mjs`: follows the new layout and controls, and adds a check that D steers right on screen.
