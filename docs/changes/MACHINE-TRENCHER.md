# MACHINE-TRENCHER

## Changed

Added trencher machine data and a pure free-dig step. With the chain down, the tracked machine cuts a one metre wide, 1.5 metre deep ditch as it moves. It deposits the loosened material along one side and emits plume events for the renderer. The speed factor falls when the cut reaches harder material. This code imports no browser or rendering modules.

The machine screen and The Dig belong to separate cards. Their consumer must gate access with `wasteland-town`; the current feature flag catalog does not define it. See the decision on the card.

## Checks

- `node tools/test-machine-trencher.mjs`: passed. It checks a 100 metre cut, the matching ridge volume, ditch and ridge heights, the ground height a car wheel reads, plume events, raised-chain behavior and slower cutting in clay.
- The first test attempt expected the machine to stop at exactly 100 metres. Fixed simulation steps can pass the target by less than one tick, so the new check now requires reaching 100 metres within one tick. No existing test assertions changed.
- `npm.cmd run build`: passed. Vite reported its existing dynamic import warning for `src/game.js` and large chunk warnings.
- Lane tier: not run, as requested. Claude runs it.
- Browser check: Claude runs it after the machine screen and The Dig connect this simulation. With `wasteland-town` enabled, lower the chain, drive 100 metres on flat ground, check the continuous ditch, side ridge and dust plume, then drive a car across the ditch. Check that the machine slows when the cut reaches clay.
- Race fingerprints: not applicable. This simulation does not change race code.
- Changed assertions: none in existing tests.

## Removed

None.
