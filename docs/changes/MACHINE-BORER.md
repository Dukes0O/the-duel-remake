# MACHINE-BORER

Mabel is a selectable machine in the Dig, behind `wasteland-town`. She drives to the west scarp, cuts and lines a tunnel, makes a muck pile through the ground system, and reverses along her cut. The head, stall, steering, protected places and face rules are in the machine rules. The Dig has a dial, messages, camera, controls, plain machine model, face effects and conveyor. Claude's shared lining and portals draw the tunnel. Tunnels export to and restore from plain data for the current visit; no town store is read or written.

## Part A in progress

The keyboard now moves a persistent thrust lever; the head dial has a working band and a lever display. The borer has dedicated following and mouth cameras. Deep rock has deterministic 8 to 30 m seams seeded by the land and the mouth. The ground layer already samples materials by depth, but its one-metre variation is too short for these seams, so the borer uses alternating hard rock and softer gravel seams under more than 3 m of cover. The scenario now drives to the face by machine state, sets the lever, and checks centre pixels after drawing.

Part A still needs a real-scarp 100 m seam check, a hands-on camera and scenario check, and verification that transitions cannot cross rock. The inside scenario view after reversing 20 m from a 30 m cut also needs review: the 18 m machine tail is then outside the mouth. Parts B and C remain.

Focused checks: `node tools/test-machine-borer.mjs` passed, including a 100 m simulated deep bore and lever and camera position checks. Scenario expressions parsed in Node. The browser scenario was not run.

## Not built by this card

- Joining a restored separate passage to a new cut in the Dig is not built.
- Roads and pipes through a finished tunnel are not built.
- The apprentice is not built.
- Another Dig machine driving through Mabel's tunnel is not built. The other machines use the surface ground, and the Dig has no car.

## For Claude to run

Run the lane tier at merge, and run `tools/scenarios/machine-borer.mjs` in the browser harness. The scenario uses memory-only storage, drives from the parked position, cuts 30 m, and records the mouth, face and inside views. Its automated view check tests whether machine and tunnel geometry project into the camera view; it does not prove that pixels are unobscured. Inspect all three pictures for Mabel, lining, lamps and the face. Check the first second at the mouth, effects, camera and sounds. The browser was not available in this lane.

To try by hand: enter the Wasteland yard and open The Dig. Press Q seven times to select Mabel. Hold W to drive toward the scarp. Press Tab near the face for work mode. Hold W to move the thrust lever forward, then release W to hold it. Hold S to pull it back, and use A or D to curve gradually back toward the scarp face. Use the up and down arrows with thrust to adjust slope. A full return to the face takes roughly 400 m. Pull the lever back to zero for at least one second if the head stalls, then push it forward again. Watch for breakthrough and daylight. Hold S to reverse. C changes camera and Escape leaves. The route and breakthrough have not been tried by hand.

## Checks

- `test-machine-borer`: passed after updating the selection-order check.
- `test-tunnels`, `test-machine-drill`, `test-machine-haul`, `test-machine-input`, `test-machine-trencher` and `test-machine-view`: passed.
- `test-machine-roads`: fails at line 297. It expects Q to return from the paver directly to the excavator, but Mabel is now last and follows the paver. Its assertion is unchanged so far; Claude has now directed adding Mabel to the selection list. The earlier four presses still reach the dozer. This failure needs Claude's direction before a green handoff.
- Scenario page expressions parse with `new Function`; the scenario was not run. The geometry check does not establish whether the objects are hidden by other surfaces.
- `npm.cmd run build`: passed. Vite reported its existing large-chunk and mixed import warnings.
- `test-combat-replays`: 12 fingerprint checks passed across four encounters. `test-replays`: 297 fingerprint checks passed across 33 cases.
- No suite filename contains `world-sign`. `test-world-composition` passed 63 checks and `test-course-kit` passed eight.
- The lane tier was not run, as Claude directed.

## Changed assertions, for Claude to review

Part A updates the old Shift-thrust assertion to expect full lever input, and checks reverse after the lever reaches zero; the prior behavior was explicitly replaced by Claude. `test-machine-borer` selected Mabel after one Q press; it now checks that seven presses select her, because Claude directed that she go last. The drive-mode assertion still checks the selected machine. `test-machine-roads` was not changed.

## Codex decided

The head uses full thrust in topsoil, 80% in clay, 55% in gravel and one third in rock. W and S move the thrust lever; the lever stays in place when released. Reverse walking speed is 1.4 m/s. The pile is ten metres to the right of the first mouth; its ground cells retain the latest deposited material, as the existing ground grid does.

The route planner needs a bridge from the Dig, centre-line links and changes to earthwork orders. The apprentice system has no Dig connection or line-cut teaching rule. Separate restored passages need a multiple-chain tunnel representation. These are deferred as Claude directed.

## Sound cues

`borer.head` is the speed-following head loop. `borer.muck` is the conveyor loop. `borer.stall`, `borer.refuse` and `borer.breakthrough` mark those events. Sound needs a hands-on check.

## Removed

The Dig's plain trial tube was replaced by the shared lining and surface portals. No existing race assets were removed.
