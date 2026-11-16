# MACHINE-BORER

Mabel is a selectable machine in the Dig, behind `wasteland-town`. She drives to the west scarp, cuts and lines a tunnel, makes a muck pile through the ground system, and reverses along her cut. The head, stall, steering, protected places and face rules are in the machine rules. The Dig has a dial, messages, camera, controls, plain machine model, face effects and conveyor. Claude's shared lining and portals draw the tunnel. Tunnels export to and restore from plain data for the current visit; no town store is read or written.

## Ground look and face follow-up

The Dig now supplies the Scablands regions, river field and Everburn location to the land's ground look, uses its near-ground colour and sun direction, and receives shadows. The scenario records and checks the ground-look marker. This has not been viewed in a browser.

The face check now measures from the machine's floor when supplied, rather than resampling under its head. The focused test passes for refusal at the west scarp foot and for a dug six-metre wall. The prior scarp assertion at 33 m expected a face; it now checks refusal at the actual 30 m foot because Claude corrected that expectation. A further problem remains: driving one metre beyond the foot makes the existing twelve-metre rule pass again. At 31 m the real scarp rises just over six metres from the floor within twelve metres; the old scenario's readiness check waited for at least 31 m, which explains its start. The stated height-and-distance rule alone does not distinguish that slope from a wall. The scenario must not be treated as a valid west-scarp cut.

The roof ray is taken after 20 m of forward cutting, before the mouth view and reverse, toward a point ten metres beyond the first ground over the crown. The following camera now enters at 20 m, waits at the mouth clear of the tail, and the scenario waits for its transition before casting the ray. A focused camera test passed; the ray and ground look still need the browser. Scenario expressions parse in Node and `node tools/test-machine-borer.mjs` passed. Waiting for hill country before moving the parking place and completing the scenario.

## World-space ground investigation

The world-space vertex check now uses the Dig's real editable ground, rather than a height-only stand-in. It passes at x 1770 and 1780, at z -700, -650 and -600; the centre pair also explicitly checks 10.8 m and 13.6 m within 0.5 m. `node tools/test-machine-borer.mjs` passed. The scenario saves the ground mesh's visibility, centre, world matrix, material visibility and side along with the height samples before checking them; its expressions parse in Node. Integration was already included. This still does not prove what the browser draws or fix the missing hill, and the existing roof ray is taken after the camera has left the bore. Claude's browser evidence is needed to identify the visual fault. The card continues; no existing assertions were changed.

The scenario's ground ray now checks the near ground, yard floor and edited ground meshes together, in distance order, and records the hit mesh's name. Previously it checked only the near ground, so it could miss an edited surface drawn over it. The mouth discard is still applied to each hit. `node tools/test-machine-borer.mjs` passed. This is a diagnostic improvement, not a demonstrated fix for the missing hill; Claude's browser measurements are still needed. The roof ray at 10 m travel is from the outside camera and cannot prove the inside view is covered.

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

## Breakthrough rules in progress

The cutter now checks for a full-width far face 12 m back along the recorded bore, opens the second mouth, and handles a level exit, an exit cutting, a drop and the 60 m trench limit. A new `borer.daylight` cue marks reaching daylight. The Dig updates the tunnel index when the second mouth opens. `node tools/test-machine-borer.mjs` passed with synthetic level, climbing, trench, lip and no-face cases. The real mesa drives, the survey, the browser scenario and the final checks remain. The exit cutting and lip still need the real-ground tests and a check that backing from the lip lets the player change the line; they are not yet proven complete.

Changed assertions for Claude: the former shallow-ground refusal now checks an exit cutting, as the new ruling directs; the no-face refusal remains tested on a short hill. The sound voice count changed from five to six for `borer.daylight`. No race fingerprints were run in this step.

## Mesa parking

Claude withdrew the demand to refuse along the whole west scarp: part of it meets the stated face rule. The rule remains unchanged. `node tools/test-machine-borer.mjs` passed with added checks that Mabel starts at the real mesa side and refuses on its ramp; the existing tests cover level ground and the west scarp foot. No existing assertion changed. The breakthrough, survey, scenario and final checks remain to be done.

Merged `integration/wasteland` without conflicts. The merged near-ground code retains the land's refined scarp mesh and the Dig's two-metre grid. Its height query now uses the selected grid rather than the land's default grid. Mabel parks 30 m outside the nearest named mesa's steep foot, on the side nearer the yard, facing its centre. `node tools/test-machine-borer.mjs` passed. The mesa face, full breakthrough and browser scenario remain to be checked in the next items.

The mesa's shape prevents the requested straight, level breakthrough. A rules-only probe with the real Dig ground and protected-place and muck checks disabled starts at the near foot, floor -1.62 m, and stops after 306.65 m with "She is coming up under open ground. Turn her down, or stop here." Ground at the stopped head is 2.96 m, 4.58 m above the starting floor. The bore remains closed. A separate sample at the far foot is about 1.21 m, 2.82 m above the starting floor. This is not a completed breakthrough test. Claude needs to decide whether the bore should climb, or change the mesa or its exit rule; this card must not change the hill. The current face rule also accepts the west scarp from metres 1 through 15 when measured from the head's current ground height, so requiring a six-metre rise alone does not distinguish every point on that slope from a face. The remaining face-rule, scenario and final-check items are unfinished.

## Not built by this card

- Joining a restored separate passage to a new cut in the Dig is not built.
- Keeping a separately restored passage when a new bore starts needs the same multiple-chain work and is not built.
- Roads and pipes through a finished tunnel are not built.
- The apprentice is not built.
- Another Dig machine driving through Mabel's tunnel is not built. The other machines use the surface ground, and the Dig has no car.

## For Claude to run

Run the lane tier at merge and `tools/scenarios/machine-borer.mjs` in the browser harness. It records the mesa overview, measurements, survey, spoil bank, mouth, face and inside views. Check the pictures, sounds and the first second at the mouth. The scenario was not run in this lane.

To try by hand: enter the Wasteland yard and open The Dig. Press Q seven times to select Mabel. Press Tab to choose drive mode and hold W until her head reaches the mesa face. Press Tab for work mode. Read the far-side survey and the hill strip. Hold W to advance the thrust lever and release it to hold the setting. Pull it back with S if the head slows or stalls; hold it at zero for one second to free a stalled head, then advance it again. Use the up and down arrows to set the suggested rise, and A and D to steer. Keep boring to the far side. If the exit needs a cutting, tilt up until she reaches daylight. At zero lever, hold S to reverse. Press C to change between the following and mouth views. Press Escape to return to the yard. The complete trip still needs a hand play.

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

`borer.head` is the speed-following head loop. `borer.muck` is the conveyor loop. `borer.stall`, `borer.refuse`, `borer.breakthrough` and `borer.daylight` mark those events. Sound needs a hands-on check.

## Removed

The Dig's plain trial tube was replaced by the shared lining and surface portals. No existing race assets were removed.

## Survey line

The real-ground driving proof passed with the Dig's land protections and spoil checks enabled. Following the survey opens both mouths and reaches daylight 0.1 m off level. A level drive starts an exit cutting; tilting up reaches the ground within 60 m. Remaining level reaches the trench warning. A six-degree climb stops at 277.86 m with the open-ground warning because the rising bore no longer has a full face behind its crown. No protected place or spoil bank stopped these drives. `node tools/test-machine-borer.mjs` passed. The browser scenario and final checks remain.

The first survey aimed at the crown crossing itself and drove out 2.2 m above the far face. It now measures the ground 12 m beyond the crossing, matching the breakthrough rule. At this mesa the rise changes from 5.11 m to 2.77 m and the suggested grade from 1 in 60 to 1 in 110. Changed assertion for Claude to review: the survey height check now samples 12 m beyond the crown crossing instead of at it, because that is the ground the player must reach. No race fingerprints were run in this step.

The Dig shows the first far-side crown crossing, the height and suggested grade, then the floor height, current grade and remaining distance and height. A side strip shows the ground and bore. The controls already name the arrow keys. The survey now uses the far ground beyond the crown crossing: at the real mesa foot it reports 306 m and 2.8 m higher. `node tools/test-machine-borer.mjs` passed, including the new survey checks. The browser display has not been checked. No existing assertions changed.

## Mesa browser scenario

Merged `integration/wasteland` with no conflicts. The scenario now drives from the mesa parking place, records an overview from 120 m behind Mabel and the drawn mesa height above her floor, checks the survey and strip, cuts 50 m, records the spoil bank and takes the mouth, face and inside views. The overview temporarily moves the test camera and ground window; ordinary player cameras are unchanged. The measurements and pictures need Claude's browser run. The scenario file passes `node --check`, and all its page expressions parse with `new Function`. No existing assertions changed in this item. `node tools/test-machine-borer.mjs` passed. The remaining final checks and hand-play instructions are due in the next run.

## Final checks after integration merge

Merged `integration/wasteland` at `28d5544af` without conflicts. `test-machine-borer`, `test-ground-edit`, `test-machine-roads`, `test-tunnels`, `test-scablands-hills` (55 checks), and `test-scablands-scene` passed individually. `node --check tools/scenarios/machine-borer.mjs` passed. The build passed with Vite's large-chunk and mixed-import warnings. The browser scenario and lane tier are for Claude to run. No assertions changed in this final check. No new race fingerprints were recorded; the earlier replay results above predate the latest integration merge.

## Trench warning follow-up

Merged `integration/wasteland` at the start of this run without conflicts. The 60 m exit-cutting sentence now warns without stopping Mabel, and repeats every 30 m with `borer.refuse`. The focused test drives 70 m into an exit cutting before tilting up, and checks the repeat warning. The former assertion that the warning stops her is replaced by checks that she keeps moving, as Claude directed.

`node tools/test-machine-borer.mjs` passed in 217.6 seconds. The first run failed because its new test expected one warning even though the drive passed both 60 m and 90 m; the corrected test counts each threshold. The suite exceeds 120 seconds because `stepBorer` uses fixed 1/120-second internal steps; reducing its runtime remains for the pace item. No browser, replay, lane tier or build was run for this item.

## Lip recovery

The lip refusal now tells the player to tip spoil below the mouth. The borer test fills the landing 12 m ahead using the ground layer, then proves the next step opens the mouth and reports daylight. The refusal sentence assertion changed to match Claude's ruling; the closed-mouth assertion remains. `node tools/test-machine-borer.mjs` passed in 283.0 seconds. The test still needs the speed work in the later pace item. No browser, replay, lane tier or build was run for this item.

## Open-ground recovery

Merged `integration/wasteland` without conflicts. A bore that rises under open ground, or reaches a far face with ground more than 3 m above its floor beyond it, now stops with the instruction to back out. The focused test checks both refusals within 2 m of the crown crossing and proves reverse works from each. The open-ground sentence assertion changed to Claude's new wording; the new high-ground refusal replaces the former exit-cutting behavior for that case. The cue remains `borer.refuse`.

`node tools/test-machine-borer.mjs` passed in 198.3 seconds. The suite still exceeds 120 seconds; the later pace item must address that. No browser, replay, lane tier or build was run for this item. No race fingerprints were recorded.

## Steep drive refusal

The real mesa test now requires the six-degree climb to stop with `BORER_OPEN_GROUND` within 5 m of 277.86 m. The rising bore loses the full face behind its crown. This replaces the earlier assertion that accepted either the open-ground or lip sentence, as Claude directed. The browser scenario and final checks remain for later items.

`node tools/test-machine-borer.mjs` passed in 201.2 seconds. The later pace item must bring it below 120 seconds. No browser, replay, lane tier or build was run for this item. No race fingerprints were recorded.

## Survey display updates

## H1 visibility measurements

H1's zero-body-pixel check at 16 m conflicts with the current model and open mouth. The simulation position is at the head. The model's gantry deck reaches about 25.8 m behind the head after the view's 0.6 scale and head offset, so about 9.8 m of it still projects outside the mouth at 16 m. A camera looking through an open mouth can also see the machine inside it. Hiding all of it at that point would require hiding real geometry or closing the view through the portal.

A rules-and-mesh probe at the mesa, with a 16 m straight tunnel and no spoil, found a 7 m mouth cut. From 30 m outside and 8 m above the floor, rays towards points 4, 8, 12 and 16 m in hit the ground mesh within that cut; the mouth shader discards those hits. The river shader does not account for this: its sampled field is 128 m at the reported camera and machine positions. The model's GLB materials are opaque. Claude confirmed that the 16 m zero-pixel check was wrong and asked for the measurements at 45 m.

The browser scenario now records the head's position relative to the model and simulation, counts machine pixels from the side with and without the real ground, and counts portal, lining and surrounding ground pixels from the mouth. It writes these measurements before checking them. It waits until 45 m before checking the following camera. The scenario and its page expressions pass Node syntax checks. Chrome cannot run in this lane, so these measurements and H1's visual result remain unverified; H2 through H6 remain unfinished. No assertions in existing tests changed and no race fingerprints were run.

The survey keeps its last displayed floor, grade, distance and remaining rise. It rebuilds the words and redraws the strip only when a displayed value or survey line changes. The focused test checks unchanged values, a distance change and a grade change. No existing assertions changed.

`node tools/test-machine-borer.mjs` passed in 197.9 seconds. No browser, replay, lane tier or build was run for this item. The test runtime remains above 120 seconds and must be shortened in the pace item. No race fingerprints were recorded.

## Following camera entry

Uneven ground can hold the following camera above its outside waypoint, so a three-dimensional distance check can keep it waiting there forever. The camera now starts through the mouth when it reaches the waypoint in plan. The borer test covers a raised patch beside that waypoint and passed in 224.9 seconds. No existing assertions changed. The scenario's following-camera check still needs Claude's browser run; this test does not prove that the raised patch was the cause of the reported timeout. H3 to H6 and the final checks remain.

## Tilt controls and lining

The Dig already sends the up and down arrows to the slope control without moving the lever. The fault found in the view was the number of segments: holding an arrow created a new segment every 1/120 second. A lining rebuild with 1,500 such segments throws a maximum call stack error and stops the animation loop. Curved cuts now use chords about one metre long, while the machine's steering and slope limits remain unchanged. The real mesa key-path test cuts 16 m, holds up for 12 seconds and down for five, and checks that the machine moves and tilts in both directions. A separate lining probe rebuilt the resulting four segments successfully; the old method made 1,440 segments during the up hold alone. Claude must still confirm the real-key drive in the browser.

`node tools/test-machine-borer.mjs` passed in 211.5 seconds. No existing assertions changed. No race fingerprints, browser, lane tier or build were run for this item. The first-push input, ground look, pace, test runtime and final checks remain.

## First-push investigation

The browser scenario now records the mode, simulation time, lever and distance at roughly 100 ms intervals during the first W hold, and checks that work mode was active before the hold. It writes the samples before either assertion. This will distinguish a late mode change, lost simulation time and a lever that fails to respond while simulation advances. The scenario syntax and all page expressions pass Node checks. The browser was not run here. H4 is still open: these measurements do not establish its cause or fix it.

At the real mesa face, a rules-only probe holding W moved the lever from zero to 0.0625 in the first quarter second and to 0.325 in 1.3 seconds. That does not reproduce Claude's delay because it does not run the browser's input and drawing loop. The frame loop caps elapsed time at 0.1 seconds, so long frames can discard simulation time, but this has not been shown to cause the reported first-push fault. The browser scenario now records wall time, simulation time, mode, lever and distance for the first 1.3-second W hold before asserting that the lever moved. It writes the numbers before the assertion. Claude needs to run it; no fix for the delay is claimed yet.

`node --check tools/scenarios/machine-borer.mjs` and the scenario's `new Function` expression checks passed. The browser scenario was not run. No existing assertions or race fingerprints changed. H4 remains open; H5, H6 and the final checks follow it.

## Dig ground look

The Dig now supplies the land's hill field and ground photographs to its ground look, using the same height difference and hill bounds as the Scablands scene. It releases those textures when the Dig closes. A focused shader check confirms that the hill field and rock photograph reach the material and that the hill field contains raised ground. `node tools/test-machine-borer.mjs` passed in 198.3 seconds. No existing assertions or race fingerprints changed. Claude still needs to inspect the mesa in the browser. The first-push cause remains unconfirmed; the scenario's timing measurements are for Claude to run. H6, the shorter test runtime and the final checks remain.

## Cutting pace

Claude's H6 ruling raises full-capacity cutting from 0.5 to 1.5 m/s; rock still permits one third of the lever, and the two-second stall and steering limits are unchanged. `node tools/test-machine-borer.mjs` passed in 71.2 seconds, including the full real-ground drives with protections and spoil enabled. Its fixed 1/120-second simulation steps remain unchanged. The first two attempts exposed time-based setup assumptions in the exit cutting and junction checks; both were corrected and the full suite then passed.

Changed assertions for Claude to review: the 10 m steering cut now takes 20/3 seconds instead of 20; the 40 m straight and bent cuts take 80/3 seconds instead of 80; the exit-cutting setup and warning drives use 100/3, 130/3 and 60/3 seconds instead of 100, 130 and 60; and the junction steps use 1/3 and 5/3 seconds instead of 1 and 5. Their distance, spoil, warning and junction assertions remain the same. These changes follow Claude's threefold pace ruling. No race fingerprints were run. Browser H1 and H2 remain for Claude, and the H4 first-push fault remains unconfirmed and unfixed. The final checks remain.

## First-push event trace

Merged `integration/wasteland` without conflicts. The browser scenario now records Tab and W event delivery and each animation frame alongside simulation time and lever position. The trace is written to the measurements file before the first-push assertions. It can distinguish an input event arriving late from a frame gap or discarded simulation time; it does not yet identify or fix the fault. The scenario syntax and all page expressions pass Node checks. The browser cannot run in this lane, so Claude must run the scenario and share the measurements. No existing assertions or race fingerprints changed. The most recent borer test passed in 71.2 seconds before this merge; the final checks have not been rerun.

The trace now listens on window capture, before the Dig's document capture handler stops Tab propagation. Previously the trace could miss the Tab keydown and could not establish when the mode change was requested. `node --check tools/scenarios/machine-borer.mjs` and importing the scenario to parse every page expression both passed. The browser trace is still needed to find and fix H4; this change does not claim to fix the first push. H1 and H2 also need Claude's browser check. No assertions or race fingerprints changed.
