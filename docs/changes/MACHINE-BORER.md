# MACHINE-BORER

Mabel is a selectable machine in the Dig, behind `wasteland-town`. She drives to the west scarp, cuts and lines a tunnel, makes a muck pile through the ground system, and reverses along her cut. The head, stall, steering, protected places and face rules are in the machine rules. The Dig has a dial, messages, camera, controls, plain machine model, face effects and conveyor. Claude's shared lining and portals draw the tunnel. Tunnels export to and restore from plain data for the current visit; no town store is read or written.

## World-space ground investigation

The scenario waits until Mabel has reversed to 10 m before casting its roof ray. At that distance the following-camera code deliberately moves the camera to the outside quarter, so this is not a ray from inside the bore. The scenario now records the camera route, camera selection and travel distance in its measurements file. A focused test casts the representative ray below against the actual ground mesh and confirms it misses: its target is above the ground there. The existing roof assertion remains in place. This finding does not explain the missing scarp in Claude's pictures, and the visual fault remains open. `node tools/test-machine-borer.mjs` passed and the scenario expressions parse in Node. No browser was run and no assertions were changed.

The world-space vertex check now follows the view's sequence: the window starts at the yard, jumps to Mabel, then moves with her for 30 m. It passes at x 1770 and 1780 at z -700, -650 and -600. The scenario's saved roof-ray evidence now includes the camera, target, ground heights at both ends and mouth capsules. A representative ray from (1751, 0.4, -650) to (1761, 7.45, -650) has ground heights -0.19 m and 4.35 m at its endpoints and no ground hit: both ends are above the surface. This is not a measurement of the browser camera; Claude's saved evidence is needed to establish whether that explains the failed ray. The missing hill in the pictures remains unresolved, so this card is not ready to hand over as finished.

The Dig's actual ground vertices were checked after placing the mesh in the same untransformed group used by the view. At x 1770 and 1780 the world-space heights are 9.92 and 12.76 m at z -700, 10.78 and 13.62 m at z -650, and 11.71 and 14.54 m at z -600. Each is within 0.03 m of the land's rule height. This rules out an axis swap or group transform for these vertices; it does not establish why the pictures show open sky. The earlier claim that drawing both faces fixed the picture is not established: Claude's browser still fails the roof ray.

The scenario now writes `machine-borer-measurements.json` in its output folder before assertions, and updates it with the ground samples, cover and roof ray as each becomes available. `node tools/test-machine-borer.mjs` passed with the world-space checks. The scenario expressions parse in Node. The browser was not run here, so its measurements and the visual fault remain to be checked. No existing assertions changed in this investigation.

## Scarp cover follow-up

After checking integration was already merged, all seven machine suites, the tunnel suite, both replay suites (297 race and 12 combat fingerprints), and the build passed. No test suite filename contains `world-sign`. The browser scenario expressions parse in Node; the browser scenario and lane tier remain for Claude. The build reported its chunk-size and mixed-import warnings. No existing assertions changed in this follow-up.

The Dig's near-ground triangles were drawn only from above. From inside the scarp their back faces disappeared, leaving sky around the bore. The Dig now draws both faces of that same ground mesh. An actual triangle ray from beneath the ground passes in the focused test. The mouth shader still cuts only the mouth capsule; the scenario's ground rays account for that cut.

The scenario waits for the ground window to follow Mabel before sampling, and prints all 18 ground measurements before checking them. Its expressions parse in Node. The browser measurements remain for Claude to collect.

At the parked position the rules give x 1720.20, z -650.00 and floor -0.03 m. At the expected 31 m approach the floor is -0.17 m; 20 m farther ahead the surface is 11.46 m and the bore crown is 4.48 m, leaving 6.98 m cover. These are rule heights, not browser picture measurements. The revised browser scenario prints the ground mesh and rule heights at the requested 18 positions, checks cover after 20 m, and casts from the inside camera toward the roof. Claude must run it and record the picture measurements: this lane cannot run Chrome.

## Late drive follow-up

The Dig now extends its own borer segment list in place, without copying the list on each cutting step. The standalone cutter still leaves its input state unchanged. The focused borer test passed, including a check that the Dig's index follows the growing list.

A separately restored tunnel is still lost when a new bore starts. Keeping it needs the deferred multiple-chain work: the current tunnel index requires every segment to join the preceding one, and the lining and mouth handling also assume one chain. It must be built with that work; this card does not claim that restored passages remain standing.

The spoil bank now fills a connected three-cell-wide strip between load positions 1.5 m apart. This lets the Dig's two-metre ground view show a ridge rather than isolated spikes. Each ground cell still checks protected land and the five-metre height limit. `node tools/test-machine-borer.mjs` passed, including connected ground, straight and bent volume, and road and river protection. Claude still needs to inspect the bank in the browser.

The tunnel index now has a revision that makes the Dig redraw the lining as the cut grows. The following camera keeps clear of Mabel while she reverses, including at the mouth. Spoil avoids the river bed and banks using the land's river index. `node tools/test-machine-borer.mjs` passed, including index revisions, a reverse around a bend and a river-bed refusal. The camera and redraw still need Claude's browser check.

The Dig now uses the Scablands moving near-ground window at two-metre spacing, following the active machine and sampling the Dig surface. The focused test checks the drawn scarp every five metres for 60 metres from Mabel?s parking place, within 0.3 m. The browser scenario takes a mouth view at 20 m and checks the drawn surface 15 m beyond the mouth covers the bore by at least 4 m. `node tools/test-machine-borer.mjs` passed; the browser scenario still needs Claude to run it.

The scenario now reads the lever and stall state while cutting, resets a stalled head, reports progress every 30 seconds, and stops at 30 m. Its page expressions parse in Node. Claude must run it in the browser.

## Part A

The keyboard now moves a persistent thrust lever; the head dial has a working band and a lever display. The borer has dedicated following and mouth cameras. Deep rock has deterministic 8 to 30 m seams seeded by the land and the mouth. The ground layer already samples materials by depth, but its one-metre variation is too short for these seams, so the borer uses alternating hard rock and softer gravel seams under more than 3 m of cover. The scenario now drives to the face by machine state, sets the lever, and checks centre pixels after drawing.

The real scarp height profile now has a 100 m deep-bore seam and stall check. The scenario cuts 30 m before reversing 20 m. It reads the lever and stall state, resets a stalled head and reports its progress every 30 seconds. The following camera moves along the recorded centre line around bends and uses the mouth to enter and leave the bore. The camera and scenario still need a hands-on check.

## Part B

The Dig now supplies the current tunnel to the cutter. It ignores the recent passage behind the head and opens the face on reaching an older stretch. `node tools/test-machine-borer.mjs` passed, including a returning curved passage, no early breakthrough and travel both ways at the junction. A longer simulated return exhausted Node's memory before the indexing fix described below.

Focused checks: `node tools/test-machine-borer.mjs` passed, including a 100 m simulated deep bore, lever and camera checks, and a camera transition around a bend. Scenario expressions parsed in Node. The browser scenario was not run.

The Dig now checks the land's own solid footprints, bridge and pipe decks, and public road net before Mabel cuts. Existing reserved-place sentences take precedence, including Tin Town's sentence. `node tools/test-machine-borer.mjs` passed with building, deck and road refusals through the Dig. The conveyor now spreads the bulked cut into a spoil bank starting 12 m to the right of the mouth. It fills the lowest available sample within 6 m of the bank end, caps it at 5 m above its starting ground and skips protected ground, including roads. The focused borer test passed for straight and bent cuts, volume, height, road avoidance and a blocked discharge. The Dig now extends the last indexed tunnel segment or indexes a new one without rebuilding earlier segments. At 400 m and 60 segments, 10,000 tail extensions averaged 0.0025 ms per index update on this laptop; this measures the index update, not the full cutting step. The focused borer and tunnel tests passed, including comparisons against a freshly rebuilt bent index. The face check now samples the centre and both sides, the control mapping is cached and refreshed on change, and a bent tunnel passes the plain-data round trip. `node tools/test-machine-borer.mjs` passed after these fixes. A separate timing of 300 complete Dig simulation steps at 400 m and 60 straight segments averaged 0.086 ms per step on this laptop, with synthetic ground and an initially empty spoil bank. It advanced 0.83 m without a refusal; a developed bank or real terrain may cost more.

## Not built by this card

- Joining a restored separate passage to a new cut in the Dig is not built.
- Keeping a separately restored passage when a new bore starts needs the same multiple-chain work and is not built.
- Roads and pipes through a finished tunnel are not built.
- The apprentice is not built.
- Another Dig machine driving through Mabel's tunnel is not built. The other machines use the surface ground, and the Dig has no car.

## For Claude to run

Run the lane tier at merge, and run `tools/scenarios/machine-borer.mjs` in the browser harness. The scenario uses memory-only storage, drives from the parked position, cuts 30 m, and records the mouth, face and inside views. Its automated view check tests whether machine and tunnel geometry project into the camera view and whether five centre pixels vary; it does not prove that the geometry is unobscured. Inspect all three pictures for Mabel, lining, lamps and the face. Check the first second at the mouth, effects, camera and sounds. The browser was not available in this lane.

To try by hand: enter the Wasteland yard and open The Dig. Press Q seven times to select Mabel. Hold W to drive toward the scarp. Press Tab near the face for work mode. Hold W to move the thrust lever forward, then release W to hold it. Hold S to pull it back, and use A or D to curve gradually back toward the scarp face. Use the up and down arrows with thrust to adjust slope. A full return to the face takes roughly 400 m. Pull the lever back to zero for at least one second if the head stalls, then push it forward again. Watch for breakthrough and daylight. Hold S to reverse. C changes camera and Escape leaves. The route and breakthrough have not been tried by hand.

## Checks

- After merging integration at `b71c91b03`, the borer, tunnel and all seven machine suites passed. Both replay suites passed: 297 race fingerprints and 12 combat fingerprints. No suite filename contains `world-sign`. The build passed with Vite's chunk and mixed-import warnings. The scenario's page expressions parse in Node; Claude must run the browser scenario and lane tier.
- The latest segment-list change adds assertions without changing existing assertions. The browser view and the separately restored passage remain unverified and incomplete, respectively.
- After merging `integration/wasteland`, `test-machine-borer` passed, including the face, seams, tunnel joining, spoil bank, input and bent data checks.
- After the merge, `test-tunnels` and all seven `test-machine-*` suites passed, including `test-machine-roads`.
- `test-machine-roads`: the selection sequence now includes Mabel before wrapping to the excavator, as Claude reviewed and directed.
- Scenario page expressions parse with `new Function`; the scenario was not run. The geometry check does not establish whether the objects are hidden by other surfaces.
- After the merge, `npm.cmd run build` passed. Vite reported its existing large-chunk and mixed import warnings.
- After the merge, `test-combat-replays`: 12 fingerprint checks passed across four encounters. `test-replays`: 297 fingerprint checks passed across 33 cases.
- No suite filename contains `world-sign`. `test-world-composition` passed 63 checks and `test-course-kit` passed eight.
- The lane tier was not run, as Claude directed.

## Changed assertions, for Claude to review

Part A updates the old Shift-thrust assertion to expect full lever input, and checks reverse after the lever reaches zero; the prior behavior was explicitly replaced by Claude. `test-machine-borer` selected Mabel after one Q press; it now checks that seven presses select her, because Claude directed that she go last. The drive-mode assertion still checks the selected machine. `test-machine-roads` now includes the borer before the wrap to the excavator, as Claude reviewed.

The spoil position assertion now allows one metre on either side of the bank centre line instead of requiring exactly zero, because the bank is now a connected three-cell-wide ridge. It still checks that the bank starts at least 12 m from the mouth; new checks require connected filled cells.

## Codex decided

The head uses full thrust in topsoil, 80% in clay, 55% in gravel and one third in rock. W and S move the thrust lever; the lever stays in place when released. Reverse walking speed is 1.4 m/s. The spoil bank uses one-metre ground samples, spaced about 1.5 m along the line away from the track. Its ground cells retain the latest deposited material, as the existing ground grid does.

The route planner needs a bridge from the Dig, centre-line links and changes to earthwork orders. The apprentice system has no Dig connection or line-cut teaching rule. Separate restored passages need a multiple-chain tunnel representation. These are deferred as Claude directed.

## Sound cues

`borer.head` is the speed-following head loop. `borer.muck` is the conveyor loop. `borer.stall`, `borer.refuse` and `borer.breakthrough` mark those events. Sound needs a hands-on check.

## Removed

The Dig's plain trial tube was replaced by the shared lining and surface portals. No existing race assets were removed.
