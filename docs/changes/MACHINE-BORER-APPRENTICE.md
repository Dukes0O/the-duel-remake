# MACHINE-BORER-APPRENTICE, slice 1

A1 records stalls, cutting time and the distance the rock would have allowed while cutting. A completed cut to daylight of at least 100 m yields its height error from the mouth, stalls per 100 m and pace against the rock. An underground breakthrough does not count.

A2 is complete. The Dig holds Pim and the observed lessons in memory. The town apprentice module now records the mean of two valid bore lessons, improves each figure independently on later lessons, and applies the Easy limits when requested. Daylight passes a valid hand-cut lesson to it, and the Dig passes the current Easy setting. Completed daylight tunnels are retained in the visit state. After Mabel drives 12 m beyond a daylight mouth, she can turn and start another cut. Displaying and using all retained tunnels together still needs work.

A3 shows Pim riding along and records the survey, freeing a stall, holding the surveyed grade for 50 m, and daylight from the current cut. On the second cut Pim reads the survey distance and rise. The observations reset for the next cut and require no extra ground samples.

A4 adds a send button and F key at a surveyed, accepted face for a taught apprentice. It queues a town work order with the mouth, heading, grade and distance. A face already in the queue cannot be sent twice with the same heading. The later cutting step advances the orders.

A5 is complete. The town's delegated-work function now accepts a bore's measured cutting distance and daylight result. It keeps the order open beyond the surveyed distance and finishes it only at daylight. It does not change the taught pace on each simulation step. The Dig drives Mabel and reports her results to this function.

The apprentice's controls now set the lever to the taught share of the rock limit and turn the head toward the surveyed grade plus the learned height error, using Mabel's own steering limits. They release the lever when she stalls. These controls do not sample the land.

The delegated cutting step calls Mabel's cutter, reports the actual distance and daylight to the town's work order, and holds the lever off for 20 seconds after a stall.

The Dig now runs the first unfinished bore on each fixed simulation step, including while another machine is selected. It updates the tunnel index from Mabel's actual segments and retains it on daylight. Only one set of controls drives Mabel at a time; the player can take the lever as described below.

Learned stalls are now spaced along the bore. At each interval Pim presses too hard until Mabel's own rules cause a stall, then waits 20 seconds before cutting again. The cutter may reach a softer layer before a mistake takes effect; it keeps pressing until the material stalls her.

A finished order keeps its actual distance, height off level and stall count in memory for the bore board. A real mesa comparison now checks a sent cut against the real cutter driven along the same line.

A6 adds a bore board to the Dig for active, waiting and finished orders. It shows the cutter, distance, floor drift, stalls and an estimated time to daylight. Finished orders show who cut them and how level they came out. The board reads the existing work state without sampling the ground.

A7 is complete. The simulation can give the player the lever on the active bore and return it to Pim. Both use the same cutter and order, and changing machines returns the lever. The bore board now offers a visit to the active bore. Choosing Mabel also goes to the working face. At the face, V or the button takes and returns the lever; the following and mouth cameras remain available.

A8 adds all three calls. Pim calls once after three short attempts to free a stall, if the bore is more than a metre off its surveyed line, or if Mabel finds an exit more than a metre up a face. Pim keeps trying after the stall call. Daylight is announced by name while any machine is selected. These messages appear on the Dig screen without extra land samples.

A9 is complete. A check-only setter teaches Pim through the existing lesson function, in the Dig's memory, so the browser scenario can skip the two long hand cuts. The browser scenario sends a surveyed bore, records the board 30 seconds apart while the excavator is selected, visits the working face, takes the lever for five seconds and hands it back. It records each measurement and both pictures before reporting all failures. It still needs Claude to run it in Chrome.

SP is underway. Bank planning now uses a set to find existing ground cells as it adds rows, avoiding a scan of the whole bank for each candidate. The bank is still the old narrow shape: the repose slopes, smooth crest, real-ground measurements and maximum cells filled per step remain to be implemented and checked.

The bank is now copied only when a cutting step plans a deposit, rather than on every call while Mabel is idle, stalled or travelling. A deposit still gets a separate copy so it cannot change an earlier simulation state.

Planning a deposit now reads each existing bank cell's height once, even when the deposit needs several cells. Newly added cells use the height already read when they were created. This prepares for the wider bank without repeated land samples within one deposit; the heap itself is still outstanding.

Deposit planning now shares unchanged cell records with the previous state while copying the cell list. It does not change those records, so an earlier state remains intact without allocating a new object for every cell on every cut.

The planner scans backward from the bank's working end and stops at the first old row. Bank cells are appended in distance order; equal-height cells retain the previous first-cell choice. This avoids scanning the entire bank to find the rows that can receive a load. The heap shape is still outstanding.

The spoil heap now has a tested target profile: at most 5 m high, rising at most 0.7 m per metre across the heap and 0.3 m per metre along its crest, including both ends. The deposit planner does not yet use this profile. The existing bank remains narrow until the planner is changed; the real-ground checks and maximum filled cells per step are still outstanding.

The profile now has a volume calculation and a way to find the length needed for a given loose volume. Both account for the sloping ends and the level middle. They are preparation for the planner; they do not yet change the bank in the Dig.

The profile can now list only the one-metre cells that change as the far end grows. Its check compares those changes with the full profile, including a 1,000 m bank. The planner still needs to use these changes and account for the sampled volume, protected ground and actual ground heights. The bank in the Dig is still the old shape.

The profile can now find how far it must grow to hold a given volume on its one-metre samples. This accounts for the difference between a continuous profile and the cells actually filled. It is not yet connected to the deposit planner; the bank remains the old shape. The repeated profile calculations in this sizing method need a performance check before it is used on each cutting step.

The sizing probes now sum the sampled heights without creating a list of cells on every probe. A local 1,000-deposit timing fell from 155.6 ms to 25.1 ms; this is a comparison on this laptop, not a frame check. The planner still needs to use the profile and account for real ground and protected cells.

The heap profile can now map its changed area onto the actual one-metre ground grid at any heading and mouth position. It visits each ground cell once, avoiding gaps or duplicate fills from rounding a rotated grid. This is preparation only: the cutter still uses the narrow bank, and sizing, protected ground, real-ground checks and the maximum cells filled per step remain outstanding.

The heap can now size a deposit against the actual rotated and offset ground grid. It reuses candidate cell coordinates during sizing. This is preparation only: the cutter still uses the narrow bank. The new sizing function still needs a performance check in the cutting loop.

Rotated-grid sizing now calculates each candidate's fixed height limit once, rather than on every sizing probe. A local 1,000-deposit comparison took 73.0 ms before and 50.3 ms after; this is not a frame check. The cutter still needs to use the profile and the complete cutting loop needs a performance check.

The rotated-grid planner can now report every protected cell in a proposed deposit without changing the ground. It uses the spoil-specific refusal when available. The cutter still uses the old bank; handling protected cells while keeping the new heap's shape remains to be connected.

The heap planner now prepares allocations in the form the cutter's fill loop uses. The profile is sized by the cut volume: the ground fill receives the 1.25 loose volume and stores the compacted height. A protected cell refuses the whole proposed deposit before the ground changes. The cutter still uses the old bank. Connecting the heap must also preserve the existing ability to find space around protected ground.

The heap can now find a clear starting position farther along the same bank line, without changing the ground. It searches up to 128 one-metre positions and returns the refusal if none is clear. This is preparation: the cutter still needs to use it, and a protected area encountered after a heap has started still needs handling.

A direct connection of the prepared heap to Mabel was tried and removed because it did not pass the existing ground-refresh check. The wider deposit caused 2,556 near-ground height reads over 100 cutting steps, against the existing limit of 2,000. A diagnostic run with that one limit temporarily bypassed did not finish the borer suite before it was stopped; the test was restored unchanged. The real mesa, heap slopes, volume and maximum cells per step remain unproved. The next run needs a way to keep the wider fill and ground refresh within the existing performance limit, then connect and test the heap.

SP connection: Mabel now places each cutting step's spoil through the prepared heap planner. The heap starts at least 12 m from the first mouth and searches along the same line for a clear start. If protected ground is encountered after the heap starts, the whole deposit is refused before cutting. The old narrow-bank planner was removed. On the real Dig ground at 101 m the sampled crest was 4.766 m, the laid volume was within 0.616% of the required bulked volume, and the steepest sampled side rose 0.700026 m in one metre, exceeding the 0.70001 test limit by 0.000016 m. This slope check is not yet passing. Over 100 measured 1/60-second steps, at most 67 cell fills occurred in one step (two fixed simulation steps); this is an observed maximum, not a proven bound. The 100-step refresh used 2,556 height reads. The honest surveyed mesa drive reached daylight without a bank refusal. The borer suite then failed on the slope check above, so later checks in that suite did not run.

The heap profile now has small rounding margins: 0.699 m per metre at the sides and 0.299 m per metre at the ends. These leave room for accumulated ground-grid rounding under the 0.7 side and 0.3 crest limits. On the real Dig ground at 101 m, the steepest sampled side was 0.6990 m per metre, the crest was 4.7708 m, and laid volume differed from the required volume by 0.616%. The 100-step refresh measured 2,556 height reads and at most 67 fills per 1/60-second step; that is an observed maximum, not a proven bound. Protected ground encountered after the heap starts still refuses the deposit before cutting.

V1 updates the older Mabel scenario to measure the heap from filled ground cells. It records the cell count, crest and steepest neighbouring side. The measurement is made once during the scenario, not during play.

V7: returning along a curved bore now places Mabel exactly at the last segment's end when she reaches the face. Curved cuts are stored as chords, which can add up to less than the distance travelled; without the correction she could start the next segment short of the face. If her work throws, the Dig logs the error, stops her lever, shows "Mabel has stopped. Back her up and try again." and continues its clock and other machines. Reversing selects the player's lever for an active order and allows a retry. This guard adds no sound cue.

V4: A survey now updates when ground on its line changes, including its face and far-side look-ahead. Ground edits track their recent positions, so edits away from the surveyed line do not force a new survey. An idle survey reads no ground heights. No sound cue was added.

## Checks

- V6: The bore board says who holds the lever and uses the singular for one stall. The camera caches its face check and parked machine views cache their ground heights until the relevant position or ground changes. `test-machine-borer-apprentice.mjs` passed, and focused cache checks passed. This adds no sound cue.
- V6: `test-machine-borer.mjs` passed its real-heap measurements, then was stopped while running the remaining real-ground cases. It began before the parked-machine cache was added. Run the complete suite on the final code.

- V4: `node tools/test-machine-borer-survey.mjs` passed on the final code. It checks a stationary survey after a fill and a cut on its line, and checks that idle frames and nearby edits away from the line do not read ground heights again. `node tools/test-ground-edit.mjs` passed on the final code. `node tools/test-machine-borer.mjs` passed on an earlier version of the cache; rerun it on the final code with the final checks.

- V7: `node tools/test-machine-borer-freeze.mjs` passed. Four real-ground cuts stall, reverse and continue past 12 m with up, down, left and right inputs, and their tunnel segments join. A separate curved-chord case fails without the face correction. An injected cutter error is logged once, stops Mabel, and leaves the clock and excavator working. The reported key durations alone did not stall at the test's starting position; the test holds W and S longer as needed to produce and clear the real stall. The exact reported hand-drive sequence still needs a visible play check.
- V7: `node tools/test-machine-borer.mjs` passed, including the real heap and mesa checks. It started before the retry change that gives the player the lever after an active order faults; the focused V7 test ran after that change. The later integration merge brought in card notes only.

- V2: `node tools/test-machine-borer-apprentice.mjs` passed. A real mesa bore finishes with Mabel selected and reverse held; she stays at the working face on the daylight step instead of stepping back into the tunnel.

- V1: `node tools/test-machine-borer-scenario.mjs` passed. Every page expression parses, and a ground fixture confirms the heap measurement excludes a separate yard edit. The browser scenario still needs a run in Chrome.

- After the rounding fix and the integration merge, `test-machine-borer` passed: cross slope 0.6990 m per metre, crest 4.7691 m and volume error 0.616%, with daylight reached. The apprentice suite also passed the real mesa comparison after its test was updated to cover both heap footprints. The lesson, scenario expression, town apprentice, ground edit, machine roads, tunnels and Scablands scene suites passed individually. Race replays passed 297 checks and combat replays passed 12. `npm.cmd run build` passed with Vite's chunk-size and mixed-import warnings. The lane tier was not run, as A10 directs.

- Rounding margins: a focused ground-fill check passed. Its steepest crest step was 0.299026 m. The full borer suite, run before the crest margin was added, reached daylight and passed the real-heap measurements but failed the crest check. Rerun the full suite after the crest fix. The real-ground measurements above were taken before the crest margin was added.

- SP connection: `node tools/test-machine-borer.mjs` failed at the real-ground cross-slope check as measured above. The 100-step refresh, sampled crest, volume and surveyed daylight drive passed before that assertion.

- SP clear starting position: `node tools/test-machine-borer.mjs` checks a protected starting area, retained line and volume, unchanged ground and refusal when no position is clear.

- SP fill allocations: `node tools/test-machine-borer.mjs` checks successive deposits through real ground fill against the profile and cut volume, and verifies that a protected deposit leaves the ground untouched.

- SP protected-ground planning: `node tools/test-machine-borer.mjs` checks the requested volume, protected and clear sites, an empty deposit and that planning leaves the ground unchanged.

- SP repeated rotated deposits: `node tools/test-machine-borer.mjs` checks that 200 successive small deposits retain their requested total volume across grid and slope changes.

- SP rotated sizing: `node tools/test-machine-borer.mjs` checks requested volumes at four headings, four bank lengths and three load sizes.

- SP rotated grid: `node tools/test-machine-borer.mjs` checks profile changes against the actual ground grid at four headings, three lengths and an offset mouth, including uniqueness and bounded changes.

- SP sizing cost: `node tools/test-machine-borer.mjs` passed with additional small and large deposits across six starting lengths, comparing the sizing result with the actual cell changes.
- SP sampled sizing: `node tools/test-machine-borer.mjs` passed. It checks small and large deposits at several bank lengths against the sum of the changed cells.
- SP incremental profile: `node tools/test-machine-borer.mjs` passed. It checks each changed grid cell against the full profile and bounds the cells changed by a short extension.
- SP profile sizing: `node tools/test-machine-borer.mjs` passed. It checks the calculated volume against sampled profile heights at four lengths and checks that each volume gives back its length.
- SP target profile: a direct Node check passed for every metre across and along a 40 m profile, including the 5 m crest and both slope limits.
- SP working-end scan: `node tools/test-machine-borer.mjs` passed. It checks that planning stops after the eligible rows, even with 100 old cells; the ground-refresh check sampled 864 heights over 100 steps.
- SP cell records: `node tools/test-machine-borer.mjs` passed. The test checks that deposits copy the list, share unchanged records and leave the preceding state intact.
- SP height reads: `node tools/test-machine-borer.mjs` passed. A deposit spanning nearly full cells reads each existing cell once per cutting step; the ground-refresh check sampled 864 heights over 100 steps.
- SP copying: `node tools/test-machine-borer.mjs` passed. Idle work shares the unchanged bank, and a new deposit leaves the earlier bank state intact. The ground-refresh check sampled 864 heights over 100 cutting steps.
- SP preparation: `node tools/test-machine-borer.mjs` passed, including unique bank cells and the existing ground-refresh check (864 height samples over 100 cutting steps).
- `node tools/test-machine-borer-lesson.mjs`: passed. Scripted clean, stalled, off-level and slow cuts, plus short and unfinished cuts.
- `node tools/test-machine-borer-apprentice.mjs`: passed. Invalid cuts, two-cut means, later improvements, the Dig's Easy setting and limits, retaining a finished tunnel once, and freeing Mabel for a second cut.
- `node tools/test-town-apprentices.mjs`: passed, 16 checks.
- A3: `node tools/test-machine-borer-apprentice.mjs` passed, including observations, grade limits, second-cut survey words and reset.
- A4: `node tools/test-machine-borer-apprentice.mjs` passed, including missing teaching or survey, refused faces, line details and queue order.
- A5 work-order support: `node tools/test-town-apprentices.mjs` passed, 21 checks, including measured distance, no work while time is stopped, and daylight completion.
- A5 apprentice controls: `node tools/test-machine-borer-lesson.mjs` passed. The real cutter held both tested paces and reached the learned grade in rock; stalled controls release the lever.
- A5 delegated step: `node tools/test-machine-borer-apprentice.mjs` passed. It checks actual cutting distance against order progress, no work at zero time, and a 20-second pause at a stall.
- A5 Dig connection: `node tools/test-machine-borer-apprentice.mjs` passed. The excavator remains selected while Mabel cuts, the order and tunnel advance, zero time does no work, and player controls do not drive her twice.
- A5 learned stalls: `node tools/test-machine-borer-apprentice.mjs` passed. A learned mistake causes a real stall, pauses the cutter and lets work resume.
- A5 real mesa: `node tools/test-machine-borer-apprentice.mjs` passed. The sent bore reaches daylight with two mouths while the excavator is selected. The hand-driven cutter follows the same controls on separate real Dig ground; its distance, height, ground and spoil agree within 0.1 m. Closing does not advance the unfinished order without a simulation step.
- A6: `node tools/test-machine-borer-apprentice.mjs` checks active, waiting and finished board entries, including drift, stalls and the estimate.
- A7: `node tools/test-machine-borer-apprentice.mjs` checks visiting the working face, choosing Mabel, player cutting advancing the order, and Pim resuming at the same face.
- A8: `node tools/test-machine-borer-apprentice.mjs` checks a single drift call with the excavator selected and the daylight announcement on the real mesa.
- A8 high exit: `node tools/test-machine-borer-apprentice.mjs` checks a single call from Mabel's high-exit refusal on real editable ground.
- A8 stall: `node tools/test-machine-borer-apprentice.mjs` checks three failed releases, one call and resumed cutting on real editable ground.
- A9 check setup: `node tools/test-machine-borer-apprentice.mjs` passed, including the taught record and the unchanged original visit.
- A9: `node tools/test-machine-borer-apprentice-scenario.mjs` passed. All page expressions parse; a simulated failed run keeps both pictures, records measurements and reports multiple failures together. The browser scenario itself has not run.
- Final checks after merging integration: `test-machine-borer`, `test-machine-borer-lesson`, `test-machine-borer-apprentice`, `test-machine-borer-apprentice-scenario`, `test-town-apprentices`, `test-ground-edit`, `test-machine-roads`, `test-tunnels` and `test-scablands-scene` all passed individually.
- Race fingerprints: `test-replays` passed 297 checks; `test-combat-replays` passed 12 checks.
- Build: `npm.cmd run build` passed. PowerShell blocked `npm.ps1` under its execution policy; the Windows command wrapper worked. Vite reported chunk-size and mixed-import warnings. The generated `dist` was removed.
- The lane tier was not run, as A10 directs.

- V3: the selected machine can survey and queue another face while Mabel is away. The board lists waiting work, and Mabel starts it after daylight. `node tools/test-machine-borer-apprentice.mjs` checks the queue on the real mesa.
- V7: `node tools/test-machine-borer-freeze.mjs` passed for the stall, reverse, tilt and steering cases, and the error recovery guard.

V5 restores the protected-ground check for straight and bent heaps. Both cuts lay spoil before reaching a reserved place, then refuse the deposit; every protected cell remains unchanged. A focused check passed. The first full borer run was stopped after a mistake in the new test was found; the test now checks the intended refusal.

## Changed assertions, for Claude to review

- Waiting bore wording: replaced the old ?Pim is waiting? assertion with ?Bore 2: waiting. 120.0 m.? as directed in V3.

- Older Mabel scenario: the bank growth assertion now reads filled heap cells instead of the removed bank cell list; new checks measure the 5 m crest and 0.7 m per metre side limit. Claude requested the heap measurement in V1.

- Bent-cut mouth clearance: X coordinate at least 12 m changed to distance from the mouth at least 12 m, with a 0.00000001 m floating-point allowance. The bank follows the turned heading, so its X coordinate alone does not measure its clearance. The required distance remains 12 m.
- Hand and delegated spoil comparison: the removed bank cell list is replaced by the union of both heap footprints. The 0.1 m comparison is unchanged.

- Near-ground refresh limit: fewer than 2,000 to fewer than 6,000 height reads in 100 steps. Raised by Claude, 16 November 2026: a heap at its angle of repose touches about five times the ground of the old three-cell bank; 6,000 is under 2 percent of what the fault cost.
- Old bank cells within one metre of the centre line and the three-cell-wide ridge: replaced by a 12 m mouth clearance, five-metre height, and cross-slope and crest checks. Claude's SP ruling requires a heap at its angle of repose instead of the narrow wall.
- Old bank record-sharing and scanning checks: removed with the old cell-list planner. The new planner keeps only the heap's origin, direction and length and lays only changed ground cells.

## Codex decided (Claude to review)

Pace compares distance cut with the distance the same rock allowed during successful cutting steps. Stalls are recorded separately. Waiting, reversing and refusals do not count as cutting time.

Mabel clears a daylight mouth by 12 m before she is ready for another cut. She can reverse back into the tunnel before then.

Holding the grade means 50 consecutive metres within 1 in 50 of the surveyed grade.

A face already in the bore queue cannot be sent a second time with the same heading.

The learned height error is spread upward over the surveyed distance. It is a magnitude in the existing lesson record, so it does not carry a direction.

Learned stalls are evenly spaced by distance. A mistake continues until the real cutter stalls, including across softer material.

The board estimates remaining time from the taught rock pace, expected stall frequency and any current stall wait. A waiting order's estimate is its own cutting time and does not include earlier orders. Only the bore being cut offers a visit, because waiting bores have no working face yet.

At a delegated stall, Pim makes three short release attempts before holding the lever off long enough to free the head. All of this takes place within the existing 20-second wait.

## Sound

No new sound event in A1, A3 or A4. The stall, drift and high-exit calls use `borer.call`. Existing stall and daylight cues remain `borer.stall` and `borer.daylight`.

## Removed

The narrow three-cell spoil bank planner and its cell-list bookkeeping were replaced by the heap planner.

## For Claude to run

Run the older Mabel browser scenario to its end, the apprentice browser scenario and the hand play check. Chrome cannot start in this job. The scenario has not been visually checked.

## Final checks after review fixes

On merge d480af408, the full `test-machine-borer` passed. Its real heap measured a maximum sampled cross slope of 0.6990 m per metre, a 4.7691 m crest and 0.616% volume error. Over 100 cutting steps it read 2,556 heights; the observed maximum was 67 cell fills in one 1/60-second step. The protected-ground and mesa checks passed.

The lesson, apprentice, both scenario-expression, freeze, survey, town-apprentices, ground-edit, machine-roads, tunnels and scablands-scene tests each passed. The race replay fingerprints passed 297 checks and combat replay fingerprints passed 12. `npm.cmd run build` passed with Vite's chunk-size and mixed-import warnings. The lane tier was omitted as A10 directs. Browser scenarios were not run in this job.


## V8: running survey and hill strip

The Dig keeps the survey for the cut when Mabel starts, whether the player or Pim cuts. It shows the running floor, grade and distance with the hill strip, and shows the daylight sentence in their place when the bore is finished. A queued order carries its own survey. The existing face-survey cache still refreshes after edits along its line. Fixing a shadowed input also lets the hand cut pass the survey to the watching words. No new sound cue or race rule was added.

The final checks passed on V8: `test-machine-borer`, `test-machine-borer-lesson`, `test-machine-borer-apprentice`, `test-machine-borer-survey`, `test-machine-borer-freeze`, both scenario-expression tests, `test-town-apprentices`, `test-ground-edit`, `test-machine-roads`, `test-tunnels` and `test-scablands-scene`. The survey test also confirms that the running text changes as the cut advances. The real heap measured a maximum sampled cross slope of 0.6990 m per metre, a 4.7691 m crest and 0.616% volume error. Over 100 cutting steps it read 2,556 heights and filled at most 67 cells per step.

Race fingerprints passed 297 checks; combat replay fingerprints passed 12. `npm.cmd run build` passed on the final code in the previous run, with Vite's mixed-import and chunk-size warnings; `dist` was removed. The lane tier was omitted as A10 directs. Claude must run both browser scenarios and check the restored screen in a visible window. No existing assertion changed for V8; no new design decision was needed.
