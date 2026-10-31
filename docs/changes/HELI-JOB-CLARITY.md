# HELI-JOB-CLARITY: helicopter jobs say what to do, end, and continue where the helicopter stood

Card: `docs/board/cards/HELI-JOB-CLARITY.md` (Kyle's six reports, each root cause, the design answers and the
builder's decisions for Claude to review). No change to flight physics, pay rules, fuel rules or released courses.

## What changed

- **Job card (D1)**, new `src/heli/heli-job-card.js` (pure words) drawn by `heli-ui.js` top left for the whole
  flight: what (car name, crate and weight, ski drop or group), from where to where, the pay, the one next step
  ("Fly to X." / "... (on the Pilot's map, press N)." / "Hook the X beside the pad: hover low over it and press H." /
  "Carrying. Fly to X." / "Lower it onto the pad and press H to let go."), "H hooks and H lets go.", then
  "Delivered: N credits" for 5 seconds. The session gives `jobStatus()`; the car, recovery, story, crate and ski
  jobs each have their stages.
- **Hook prompt (D2)**: `session.hookPrompt()` and `hookPromptText`: "Press H to hook" (or "Lower 3 m, then press H
  to hook") near a hookable load; "Press H to let go" (or "Lower it until it touches, then ...") with the load over
  a landing circle. Shown above the radio line. The landed crate offer now says "hover low over the crate beside
  the pad and press H".
- **Continuity (D3)**: `session.start()` with no course starts where the helicopter last stood (`resumePad`), home
  for new and old saves, a pilot in lessons, a place that is no longer a destination, the heli-ski group or the
  story crate in hand. `app.visitHeli` already calls `start()` without a course.
- **Car jobs (D4)**: the customer car waits on the parking spot beside the landing circle on every course
  (it stood in the middle of the circle away from home, under the arriving helicopter). The board names map
  pick-ups by name ("Pick up at Pacific Canyon Circuit", was "pacific-canyon").
- **Every job ends (D5)**: `jobLegFlyable`, `fuelOnGround`, `pumpCourses`, `JOB_RESERVE_KG` (80) in `heli-jobs.js`;
  return crates and the map's car routes name only legs that fit the fuel the pilot can have where the leg starts.
  New `session.dropJobHere()` behind the card's Drop job button: anywhere, no pay, no charge (the heli-ski group
  only at home, since it is aboard).
- **Ski panel (D6)**: the landed card names the ski panel only when it is on screen with a run to pick; elsewhere it
  says to land on a ski pad, and the job card gives the nearest pad's distance and heading. The run menu no longer
  shows on a pad that starts no run.

## Save change (for review)

One optional, additive field in the helicopter save: `heli.lastPad` (a course id, or the Table). Written by
`setLastPad` on a safe touchdown, at a visit's start and on the return home after a crash; written only when it is
not the home pad (setting home removes it), so a save that never left home is unchanged byte for byte. `normalizeHeli`
keeps a valid place and drops anything else; `lastPadOf` reads home when the field is absent. Old saves load
unchanged (test-heli-job-clarity round trip). An older game copies the unknown key as it is (the existing rule).

## Tests

- New `tools/test-heli-job-clarity.mjs`: 1,490 checks. D3 save round trip, old save and new save default, bad
  values dropped, the session resuming at the last pad and home in the listed cases, a car job working from the
  resumed pad; D4 every released destination has a car spot outside the landing circle, and the map pick-up car on
  the parking spot; D5 the reach rule numbers, Summit Run to Eifel Crown never offered, every car job and crate over
  40 play days flyable, Drop job anywhere (car job and crate) with no pay or charge and the job back on the board;
  review fixes: Drop drops the job the card shows (a car job in hand with a crate hooked and set down drops the car
  job), a load on the cable is set down first, a dropped crate lies on its pad's crate spot again, a retaken car job
  makes one car, and a barred hook says why (the words and, for lesson 4, in the session);
  D1 and D2 every stage's words; D6 the landed card's ski words.
- Every helicopter suite by hand (`tools/test-heli*.mjs`, 34 files), `test-pilot-map.mjs`, `test-map-secrets.mjs`,
  `test-heli-story.mjs`: all pass.
- Lane tier (`node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`): 104 passed, 0 failed (815 s),
  on the final code. A first run failed 2 (test-drive-lesson-helipad, test-map-view): their small fake page has no
  job-card or prompt element, so the new hosts are now guarded like the arrival host; both pass, then the rerun.
- `npm run build`: built (the usual chunk-size warning only).
- After the review fixes: the new suite 1,518 checks, all 38 helicopter, pilot map, map secrets, helipad lesson and map
  view suites by hand pass; lane tier (`--tier lane --changed --jobs 4`) 104 passed, 0 failed, 0 not run in 742.22s; `npm run build` built.
- Browser, `tools/scenarios/heli-jobs.mjs` (released switches, memory-only saves, 1366x768): passes. Car job from
  the board (Dusthawk Rally, home pad to Tremblant Snow): card at each stage, hook prompt, carry, release prompt,
  delivered and paid 2,650; home for fuel; the Tremblant Snow crate (524 kg) to Panorama Ridge, paid 2,650; landed,
  Shut down; the next visit starts at Panorama Ridge; a ski drop to Summit Run, the card names Devils Playground
  (4.0 km), and on that pad the ski panel shows three runs. One look sheet (round 1) sent to Claude; the evidence
  folder is deleted. Note: one tank does not carry the car job and the 524 kg crate back to back, so the scenario
  refuels at home between them; in the ski leg the scripted climb ran the tank dry on the pad and the fuel truck
  came, as the game always does.

## Changed assertions

- `tools/test-heli-jobs.mjs` "in the landing zone" became "on the parking spot beside the landing zone" plus
  "outside the landing circle": the car's place is the fix for Kyle's report 5 (D4).
- `tools/test-heli-jobs.mjs` "a return load at <place>" for every place now holds except at a pinned list of places
  with no crate, and every crate's leg is checked flyable. The list is pinned exactly (review): with the map on, with
  or without the Table and Kogane, Eifel Crown, Ridge Rally, High Country and Azure Riviera; with the map off, Summit
  Run. Even each one's shortest leg plus 80 kg is more than the fuel the pilot can have there (numbers on the card),
  so none can get a crate with a shorter leg. This is report 2's fix (D5); the pay checks are unchanged.
- `tools/test-heli-jobs.mjs` supply-call crate test: the session fixture now has the pilot's map on (as released),
  since without the far pumps Summit Run has no flyable crate to stow. Its assertions are unchanged.
- `tools/test-heli-summit-arrival.mjs` OTHER_ARRIVALS_PIN 624439558 to 1375301816 and
  `tools/test-heli-summit-rescues.mjs` SUMMIT_ONLY_PIN 1829644530 to 274976626: with the pilot's map off, Summit Run
  lays no return crate now. Verified: with only the crate filter undone, both pins return to their old values
  (flights unchanged). Nothing is loosened.

## Removed

- The landing-zone spot for a customer car away from home (`waitingJobCar`), replaced by the parking spot.
- The "Hook the crate beside the pad to take it." wording, replaced by the wording with the key.
- The old "fits a full tank" check in the map's car routes, replaced by `jobLegFlyable`.
- The repro version of `tools/scenarios/heli-jobs.mjs` became the play-through; nothing else to remove.

## Not done

- A course bought mid-day can reshuffle the day's car jobs (ids follow the owned list). Not fixed; noted on the card.
- On the day this ships, the new reach rule redraws some of the map's car jobs, so a job taken before the update may
  name a different car or route after it (job ids shift once). Accepted by Claude as a one-off.
- The Fly To panel shows no fuel figure for Summit Run (display only). Noted on the card.
