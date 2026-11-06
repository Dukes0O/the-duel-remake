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
