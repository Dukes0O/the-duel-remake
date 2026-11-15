# MACHINE-BORER

Mabel is a selectable machine in the Dig, behind `wasteland-town`. She drives to the west scarp, cuts and lines a tunnel, makes a muck pile through the ground system, and reverses along her cut. The head, stall, steering, protected places and face rules are in the machine rules. The Dig has a dial, messages, camera, controls, plain machine model, face effects and conveyor. Claude's shared lining and portals draw the tunnel. Tunnels export to and restore from plain data for the current visit; no town store is read or written.

## Not built by this card

- Joining a restored separate passage to a new cut in the Dig is not built.
- Roads and pipes through a finished tunnel are not built.
- The apprentice is not built.
- Another Dig machine driving through Mabel's tunnel is not built. The other machines use the surface ground, and the Dig has no car.

## For Claude to run

Run the lane tier at merge, and run `tools/scenarios/machine-borer.mjs` in the browser harness. The scenario uses memory-only storage, drives from the parked position, cuts 30 m, and records the mouth, face and inside views. Its automated view check tests whether machine and tunnel geometry project into the camera view; it does not prove that pixels are unobscured. Inspect all three pictures for Mabel, lining, lamps and the face. Check the first second at the mouth, effects, camera and sounds. The browser was not available in this lane.

To try by hand: enter the Wasteland yard and open The Dig. Press Q seven times to select Mabel. Hold W to drive toward the scarp. Press Tab near the face for work mode. Hold Shift and W for gentle thrust; hold A or D too to curve gradually back toward the scarp face. Use the up and down arrows with thrust to adjust slope. A full return to the face takes roughly 400 m. Release W for at least one second if the head stalls, then resume. Watch for breakthrough and daylight. Hold S to reverse. C changes camera and Escape leaves. The route and breakthrough have not been tried by hand.

## Checks

- `test-machine-borer`: passed after updating the selection-order check.
- `test-tunnels`, `test-machine-drill`, `test-machine-haul`, `test-machine-input`, `test-machine-trencher` and `test-machine-view`: passed.
- `test-machine-roads`: fails at line 297. It expects Q to return from the paver directly to the excavator, but Mabel is now last and follows the paver. Its assertion is unchanged, as Claude directed. The earlier four presses still reach the dozer. This failure needs Claude's direction before a green handoff.
- Scenario page expressions parse with `new Function`; the scenario was not run. The geometry check does not establish whether the objects are hidden by other surfaces.
- `npm.cmd run build`: passed. Vite reported its existing large-chunk and mixed import warnings.
- `test-combat-replays`: 12 fingerprint checks passed across four encounters. `test-replays`: 297 fingerprint checks passed across 33 cases.
- No suite filename contains `world-sign`. `test-world-composition` passed 63 checks and `test-course-kit` passed eight.
- The lane tier was not run, as Claude directed.

## Changed assertions, for Claude to review

`test-machine-borer` selected Mabel after one Q press; it now checks that seven presses select her, because Claude directed that she go last. The drive-mode assertion still checks the selected machine. `test-machine-roads` was not changed.

## Codex decided

The head uses full thrust in topsoil, 80% in clay, 55% in gravel and one third in rock. Shift and W gives one-third thrust. Reverse walking speed is 1.4 m/s. The pile is ten metres to the right of the first mouth; its ground cells retain the latest deposited material, as the existing ground grid does.

The route planner needs a bridge from the Dig, centre-line links and changes to earthwork orders. The apprentice system has no Dig connection or line-cut teaching rule. Separate restored passages need a multiple-chain tunnel representation. These are deferred as Claude directed.

## Sound cues

`borer.head` is the speed-following head loop. `borer.muck` is the conveyor loop. `borer.stall`, `borer.refuse` and `borer.breakthrough` mark those events. Sound needs a hands-on check.

## Removed

The Dig's plain trial tube was replaced by the shared lining and surface portals. No existing race assets were removed.
