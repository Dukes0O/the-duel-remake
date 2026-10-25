# SKI-HELI

Heli-skiing in the helicopter (docs/HELI_SKIING.md sections 3 and 6): the pads, the drop, the runs, the pickup, the group job and thin air, calling the ski rules (`src/ski/`), the ski save (`recordRun`, `findStash`) and the Lab's wax and aerials rules. Switch `heli-skiing` (dev), with Summit Run on. Nothing reaches a player yet: `src/app.js` passes the switch and the drawing, the run menu and the result card are SKI-VIEW's. With the switch off every helicopter result is what it was.

## What was added

- `src/ski/ski-session.js` (new, pure): one ski run from the drop to the pickup. `createSkiRun({runId, wax, group})`, `stepSkiRun(run, controls)` at the fixed step (events: the skier's, plus `skiStart`, `skiGate`, `skiFinish`, `skiResult`, `skiStash`, `skiOut`, `skiPickup`), `skiRunView(run)` (the skier, clock, gates, the medal limits, the guide's ghost, the group's figures), `skiControls`. Stopping in the pickup circle for half a second ends the run; the zone is walled in. It imports nothing from the helicopter.
- `src/heli/heli-session.js`: option `heliSkiingEnabled` (effective with `summitRunEnabled`); `HELI_SKIING` constants; `skiBoard()`, `takeSkiDrop()`, `takeSkiGroup()`, `dropSkiFlight()`, `skiOffers()`, `skiStepOut(runId, {wax, challenge})`, `restartSkiRun()`, `leaveSkiRun()`; a `skiing` phase whose `step(controls)` takes the ski keys; `view().ski` (only with the switch on) and `fingerprint()` gains the run only while skiing.
  - The group (guide and four guests, 475 kg) rides on the flight state's `upgrades.emptyMassKg`, so thrust and weight come from the helicopter's own rules; `src/heli/heli-flight.js` is untouched.
  - The group job uses the job save (`jobs.taken` / `finishJob`, id `ski<day>`), pays 1,200 (Real 1,500), is offered one play day in three, never on the powder run, and is paid when the helicopter sets down on the home pad with the group aboard after skiing. A job still taken in the save finds its group waiting at the home pad on a new visit.
  - With a ski flight in hand the Summit area's ceiling follows the ground (`aboveGround: 300`, the rescues' rule), for those flights only; the pads were already inside the area's width.
  - Stepping out freezes the helicopter (no fuel is burnt); climbing in puts a new helicopter on the ground at the pickup pad with the same fuel, the group aboard again.
  - Thin air: the line `ski.radio.thin-air` plays once, the first time the collective is at its top and the helicopter still sinks above 3,500 m.
  - Radio: `ski.radio.drop`, `clear`, `pickup`, `fetch`, `group.call`, `group.done`, `thin-air`, and the cue `ski.step-out` (listed with suggested wording on the SKI-AUDIO card).
  - The Lab: the Wax kit's pick is judged against the day's snow (`skiWaxFor`), the Lab's wax challenge is a slalom started with `challenge: 'wax'` and judged by `waxRunResult` (a pass saves the Lab lesson), and the Aerials run waits for `aerialsOpen`.
- `src/lab/lab-heli.js`: re-exports the Snow rules for the session and adds `heli-skiing` to the Lab flags `passLabChallenge` and `labChallengeOpen` use (the Snow lessons need it).
- `tools/test-heli-mode.mjs`: the session may import `../ski/ski-session.js` (one entry in its rules-import list). No assertion changed.

## Tests

`tools/test-ski-heli.mjs` (12 tests, about 90 s), flown through the real session with scripted pilots and skiers:

- Thin air: the corrected doc's numbers from the helicopter's own rules at each pad (most thrust 2,407, 2,309 and 2,217 kg; spare with the full group and a full tank 302, 204 and 112 kg; half a tank 502, 404 and 312; the altitude tune 257 kg at the summit pad), the full group's weight 2,105 kg, hovering stops at 4,027 m, and the flight model climbs at the summit pad's air with the group and sinks with 200 kg more.
- Switch off exact: absent, off and on-with-nothing-taken give the same session, and none of the ski calls does anything; a session of 60 s at home and at Summit Run gives the same hash (`76b81e7710d1e856`) on untouched `origin/integration/wasteland` and on this branch with the option absent, off and on.
- The board: the group day is one in three, repeatable, Real pays 1,500, nothing without the landing lesson or Summit Run.
- A drop to the pickup pad (cruise, ceiling, landing on the pad, aerials, result, pay, no fuel burnt, restart and leave free, a second run pays only the difference); the Lab's wax challenge (right wax passes the lesson, wrong wax does not, the right wax is faster, the kit can then be bought); the Wax kit's pick and the Aerials gate; the group job end to end (aboard at the pad, cruise, pickup, a run, aboard again, home, paid once, the weight on and off); a saved group job found again and handed back; the thin-air line; the powder stashes at the summit pad; the group not taking powder; and the pure run (every run starts, finishes and ends at the pickup, repeatable, junk controls safe, walled in).
- Existing helicopter, Lab, ski and save suites pass unchanged.

## Observations for Claude

- A full group trip leaves less than the 160 kg the cruise home needs. The cruise to Summit takes 160 kg of the 400, and flying over the mountain with 475 kg aboard burns about 0.7 kg a second; by the pickup pad about 90 kg is left. The test lets the helicopter sit at the pickup until the engine runs dry and the existing fuel truck fills the tank for pay (300 + the fuel), which is how a stuck pilot is rescued today. Options if that should be kinder: a pump at the pickup pad for the group job, or a cheaper leg home. Nothing was changed.
- The ski drop for yourself has the same fuel shape without the group's weight (about 40 kg more to spare).

## Independent review

REVIEW

## Lane tier and build

LANE

## Removed

Nothing.
