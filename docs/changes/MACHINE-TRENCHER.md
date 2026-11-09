# MACHINE-TRENCHER

## Changed

Added trencher machine data and a pure free-dig step. With the chain down, the tracked machine cuts a one metre wide, 1.5 metre deep ditch as it moves. It deposits loosened material along either side, trying the other side if one is blocked. If both sides are blocked, the material is returned to the cut and the machine stops with a plain reason. It emits plume events for the renderer, and its speed factor falls when the cut reaches harder material. This code imports no browser or rendering modules.

The machine screen and The Dig belong to separate cards. Their consumer gates access with the `wasteland-town` development switch.

## Checks

- `node tools/test-machine-trencher.mjs`: passed. It checks a 100 metre cut, the matching ridge volume, ditch and ridge heights, the ground height a car wheel reads, plume events, raised-chain behavior, slower cutting in clay, conserved ground volume beside a reserved area, and stopping cleanly when both ridge sides are reserved.
- `node tools/test-machine-haul.mjs`: passed.
- The first test attempt expected the machine to stop at exactly 100 metres. Fixed simulation steps can pass the target by less than one tick, so the new check now requires reaching 100 metres within one tick. No existing test assertions changed.
- `npm.cmd run build`: passed. Vite reported the existing mixed static and dynamic import warning for `src/game.js` and large chunk warnings.
- Lane tier: not run, as requested. Claude runs it.
- Browser check: Claude runs it after the machine screen and The Dig connect this simulation. With `wasteland-town` enabled, lower the chain, drive 100 metres on flat ground, check the continuous ditch, side ridge and dust plume, then drive a car across the ditch. Check that the machine slows when the cut reaches clay.
- Race fingerprints: not applicable. This simulation does not change race code.
- Changed assertions: see the section below.

## Changed assertions

- `tools/test-feature-flags.mjs`: switch count increased from 50 to 51 and `wasteland-town` was added to the expected `dev` switches and message. Reason: one new development switch; nothing loosened.

## Removed

None.
