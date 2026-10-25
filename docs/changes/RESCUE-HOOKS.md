# RESCUE-HOOKS: the rescues wired into the session and the board

Card: RESCUE-HOOKS (Claude, SIM lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 3.4, 7 and 11. The engine it calls was merged by RESCUE-ENGINE.
Switch: `rescue`, passed to the session as `rescueEnabled: true`. It works
only together with the fire switch, because the calls ring through the fire
engine. With it off nothing new runs.

## What changed

### `src/heli/heli-fire-run.js` (the call engine's host)

- Every read of the call goes through the engine's `callOf`, so a rescue call
  stored by a build with the switch on is absent with it off: it is not shown,
  not answered, and the due fire call still gets its clock and opens over it.
  (The four reads RESCUE-ENGINE named: `liftoff`, `step`, `pressRadio`, `view`.)
- With the switch on the host passes `rescue` to the engine's `callDue`,
  `openCall` and `noteRefuel`, joins the course rows of the four kinds to
  fire's row, and rings a rescue call: the alert tone, then Roger's or
  Sarah's call line, with a `rescueCall` event and 20 seconds to answer.
- R answers a rescue: `answerCall`, then `beginRescue` (the record starts at
  clock 0, stage `fly`), then the answer line (Roger, Sarah, or the lodge) and
  a `rescueAnswered` event. `declineCall()` says "later" at once; after the 20
  seconds it says it by itself (`rescueLater`).
- A waiting rescue call counts a flight at each lift-off and goes to another
  crew after 2 more flights, or at the start of a visit two play days on
  (`takeCall`): Roger says so (`rescueTaken`). A fire call is never given away.
- Roger's winter line plays with the switch on (winter is no longer empty).

### `src/heli/heli-session.js`

- **The rescue in hand** is kept in the session with its clock exact and
  written to the save when something changes and every 10 s. Where it happens
  is picked from the rescue's own seed with `heli-search.js`, so the same
  save gives the same rescue.
- **The clock** runs every step, in the air or on the ground, and a cruise leg
  adds its flying time. Two thirds gone and still unhurt: hurt once, Roger's
  cold line. The last minute ticks (`heli.clock.tick`), the hiker's last
  3 minutes bring Sarah's dusk line.
- **The line at the pad.** `fitRescueLine()` and `takeOffRescueLine()` (the
  board's buttons), free, on the home pad's ground, one fitting at a time
  (the bucket, a hooked car, or the line). Brian's two lines play only for a
  new rescuer, once. The rescuer lies beside the helicopter like the bucket and
  rides the line. `H` does nothing while the line is on. The autopilot holds
  20 m/s with people on the line. A bump on the line is `rescueHit` (pay cut
  through the casualty's condition) and costs no repair; Roger says "Easy".
  The rescuer and the supply crates are never among the cars of `view().loads`.
- **Lost hiker.** Passing within 70 m lights the flare; the hiker walks to the
  clearing at 1.2 m/s; a good landing inside it with the hiker arrived takes
  them aboard; a hard landing in the cabin hurts them; a touchdown in the pad
  circle (or the rescue course's own) is the handover.
- **Avalanche and hoist.** The hold at the beacon or the driver, the clip, and
  the handover come from `stepRescue`. The beacon beeps (`heli.beacon.beep`
  with its pitch) at the packet's rate, and Roger says "you have a signal"
  once. Brian's set-down line is for a new rescuer.
- **Supply run.** Three crates at the home pad's crate spots (Tremblant Snow
  fallback masses), hooked with H like the lesson crate; a crate set down at
  rest inside the yard counts; the last one finishes the run. A crate dropped
  from height costs pay (150 less), not a repair.
- **Handovers.** `finishRescue` with the pay by condition (or the crates'
  pay); Roger says which (`done`, `hurt`, `badly`); the first person brings the
  rescue badge and chime; a hoist leaves the driver's car (`wreck`).
- **Failure.** `failRescue` on the clock running out (`time`), a crash
  (`crash`, on top of the session's own crash repair), or leaving the
  helicopter (`left`, from `leave()` or found stored at the start of a visit).
  A frame that sees the clock run out and a handover together **fails first**:
  the clock is run before any handover or last crate is paid (tested at the
  exact step).
- **View data for the panel** (`view().rescue`, only with the switch on):
  `call` (the waiting call, its place, seconds left to answer), `active` (kind,
  stage, condition, clock seconds, limit, left, orange in the last minute, dusk,
  crates, bearing and distance to the area or the handover circle, the
  beacon's signal, and the places for drawing), `line` (who, condition, hold
  fraction, position) and `crates` (positions). Session state only; nothing
  here draws.
- **New events:** `rescueCall`, `rescueAnswered`, `rescueLater`,
  `rescueTaken`, `rescueLineFitted`, `rescueLineRemoved`, `hikerSpotted`,
  `hikerAboard`, `crateDown`, `rescueDone`, `rescueFailed`, and the cues
  `heli.flare`, `heli.rescue.clip`, `heli.snow.dig`, `heli.beacon.beep`,
  `heli.clock.tick`.
- Finding where rescues can happen (about a second, mostly the hiker spot
  lists) is done at the start of a visit when a call is due, not in mid-air.

### `src/heli/heli-board.js`

- The Radio box shows a waiting rescue with **Answer** and **Later**, or the
  rescue in hand: "Avalanche at Tremblant Snow · 9:40 left" (crates for a
  supply run). A fire shows what it showed before.
- A "Rescue line" box on the home pad: Fit the rescue line / Take off the
  rescue line (disabled while the bucket or a car is on the hook, or two people
  are on the line). `handleBoardAction` knows `radio-later`, `rescue-fit` and
  `rescue-off`.

## The switch-off proof

`tools/test-heli-rescue-session.mjs` pins a fingerprint (1400586788) of the
fire session taken before this change: a call answered at once with the bucket
fitted and the pump used, a call nobody answers, and the first day of each
season, with every event, the save, the view, the board markup and the
session fingerprint hashed. It is the same with no switch, `rescueEnabled:
false` and a non-true value. A rescue call and a rescue record stored by a
build with the switch on, of each of the four kinds, leave the fire call
free to ring, the fire answerable by R, and the record untouched even after
`leave()`.

## Tests

- `tools/test-heli-rescue-session.mjs` (new, 442 checks, about 30 to 60 s): the
  switch off; the call ringing in winter (eight saves, never a fire), the same
  save ringing the same call; the Radio box (Answer, Later, the clock) for
  each kind; a call taken by another crew (2 flights, 2 play days); a hiker
  flown from the flare to the pay (unhurt 1,000; hurt after waiting, 600),
  twice with the same result; an avalanche (beacon, dig, clip, carry; 1,200),
  a hoist rescue (8 s hold, cold on the way, 720, the wreck saved) and the
  supply run (three crates and the pump, 1,000) all flown by script; leaving a
  supply run after one crate (300 for the crate, 200 for the snowcat); the clock
  running out (cold at 10 minutes, dusk, ticks, 400 taken, the tally dropping by
  one) at 30, 60, 120 and 144 steps a second with the same save; a
  handover and the end of the clock on the same step (a step earlier it is
  paid, the same step and a step later it is failed); a crash (800 + 400),
  leaving, and a rescue found stored; the line and the board; and that every
  line said is a recorded line.
- `test-heli-fire-session` (79), `test-heli-missions` (45 groups),
  `test-heli-jobs` (612), `test-heli-mode` (154), `test-heli-hooks` (291),
  `test-heli-save` (43 groups), `test-heli-rescue` (263), `test-heli-search`
  (1,134): pass unchanged.
- GATES: see the end of this note.

## Changed assertions

None.

## Removed

Nothing replaced.

## Director's changes (second pass)

- **App wiring** (`src/app.js`, two lines, busy-game-files): `visitHeli` passes
  `rescueEnabled` (helicopter, forest-fire and rescue switches on), and
  `_heliEvents` plays a cue that carries a `pitch` at `rate: pitch / 1000`
  (the beacon's 900 to 1,400 Hz from its 1,000 Hz tone). Other cues play as before.
  The test builds the app with each switch combination.
- **Crash (packet 3.4):** a crash fails the rescue only with people aboard (the
  hiker in the cabin) or on the line (the fitted rescuer). Before the pickup, or
  on a supply run, the rescue goes on with H1's crash repair only, and a crate
  that was on the line is back at the pad. Both cases are tested.
- **Car recovery job on the board:** the wreck from a hoist rescue shows with
  the day's jobs ("Recover the <car> from Panorama Ridge", 500 credits, Real
  pays a quarter more), for 3 play days, only with the switch on. There is no
  Take button yet: flying it and being paid (`finishRecovery`) is not wired.

## Open for Claude

- **Rescues need the fire switch.** The calls ring through the fire engine, so
  `rescueEnabled` without `fireEnabled` does nothing.
- **A rescue found stored at the start of a visit fails** (leaving it behind
  is the same as walking away). That also catches a closed browser tab.
- **"2 more flights"** is counted at lift-off: the call hands on at the second
  lift-off after the one it rang in.
- **Stages.** `found` is the hiker's flare, or the avalanche's first signal;
  a hoist goes straight from `fly` to `hold`.
- **Recovery job:** shown, not yet takeable or payable in flight.
- **First-hitch.** The first look at where rescues can happen costs about 1 s
  (the hiker spot lists). It is paid at the start of a visit when a call is
  due. If that shows in the game, cache the lists or cap them.
- **Cruise legs are long.** A hoist rescue from the Woods spends 200 s of its
  720 s on the cruise leg, so the driver is cold before the pad (the packet's rule).
- Autopilot goals for rescues and Summit Run as a destination: RESCUE-AUTOPILOT.

## Gates

See the end of the second pass below.

Second pass (app wiring, crash rule, recovery job): fire session (79), mode (154), jobs (612), hooks (291), rescue (263) and the new suite (442 checks) pass. Lane tier (`--tier lane --changed --jobs 4 --keep-going`, PowerShell): 154 passed, 0 failed, 0 not run, 1,000.57 s; full log in the lane's `.qa-dist/lane.log`. `npm run build`: passed. No browser scenarios.
