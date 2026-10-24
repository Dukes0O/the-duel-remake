# RESCUE-ENGINE: the rescue kinds in the mission engine

Card: RESCUE-ENGINE (Claude, SIM lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 3, 4.2, 5.3, 5.5 and 6. Switch: `rescue` (dev), passed into every
new call as `{rescue: true}` (or `{enabled: true}` for the helpers that touch
the save), the way fire's switch is passed. With it off nothing new runs.
No screen, session or drawing changes (RESCUE-HOOKS and RESCUE-VIEW).

## What changed

### `src/heli/heli-missions.js`

- **Kinds.** With `rescue: true` the engine offers fire plus `hiker`,
  `avalanche`, `hoist` and `supply`, weighted by the season table that
  FIRE-SEASONS already carried (all five rows match packet section 3.2; a
  test pins every row). `MISSION_KINDS` in the save is untouched. Winter is
  open with rescues on, so refuels count in winter and no fire comes.
  `rescueConditions({summitRun})` gives the course lists for the four kinds
  (hiker: Woods, Panorama; avalanche: Tremblant Snow, plus Summit Run;
  hoist: Panorama; supply: Summit Run, or Tremblant Snow while Summit Run is
  not a destination); the hooks join it to fire's row.
- **Stored rescue call with the switch off.** `callOf(missions, {rescue})`
  is the call the engine sees: a call of a rescue kind is absent while the
  switch is off. `callDue`, `openCall`, `noteRefuel`, `answerCall` and
  `endMission` all read it, so a rescue call saved by a build with the
  switch on is never offered, never blocks a fire call (the fire call opens
  over it) and a fire that ends does not touch a stored rescue record.
- **Waiting calls (3.3).** `noteCallFlight` counts a flight on an unanswered
  rescue call (`call.flights`); `callTaken` is true once the next play day
  has ended (play day after next) or after 2 more flights; `takeCall` ends it
  as `endMission` does (count 0, new need, quiet spell), no pay, no charge,
  and hands back Roger's `heli.radio.rescue.taken`. A fire call is never given
  away.
- **Clocks (3.4).** `RESCUE_CLOCKS` (hiker 900 s, avalanche 720, hoist 720,
  supply 1,500). `beginRescue` turns an answered rescue call into the
  `rescue` record (call id and course, seed = the one `openCall` handed out,
  `clockSeconds` 0, stage `fly`, crates `[0,0,0]`, unhurt). `tickRescue`
  adds simulated seconds (air, ground, or a cruise leg's flying time, in one
  step or a frame at a time), hurts an unhurt casualty once at two thirds
  (`cold: true`, using heli-rescue.js's `waitHurt`), stops at the limit and
  says `expired`. `clockLeft` and `duskOf` (the hiker's last 3 minutes, 0 to
  1) are for the panel and the drawing. A supply run has nobody to get cold.
- **Money, one table (`RESCUE_MONEY`, `RESCUE_TALLY`).** Failure (4.2):
  `failRescue(profile, {reason, cratePay, enabled})` for `time`, `crash` or
  `left`: the person comes out badly hurt (condition 2), no pay, 400
  credits taken by `chargeRepair` (what the player has, the rest forgiven,
  never below zero), the kind's skin tally down one (hiker and avalanche:
  `searches`; hoist: `hoists`; supply: `supplies`; never below zero, and a
  missing field stays missing), the mission ends with its quiet spell.
  A supply run first pays for the crates already down (`cratePay`, from
  heli-rescue.js) and then costs 200 instead of 400. `crashRepair: true`
  tells the session to take H1's crash repair as well, as it does today.
  Success: `finishRescue(profile, {pay, site, enabled})` adds the pay (capped
  like every credit change), the tally up one, `rescued` up one for a person,
  the `rescue` badge with the first person, ends the mission, and after a
  hoist leaves the driver's car (`wreck`) for the recovery job. `peoplePay`
  reads the base pay table (hiker 1,000, avalanche 1,200, hoist 1,200)
  through heli-rescue.js's `rescuePay` (100, 60, 25 per cent).

### `src/heli/heli-jobs.js`

- **Summit Run (5.5).** `SUMMIT_RUN` (id `summit-run`, base altitude 2,860 m,
  map position (-10, +12) km, north-west of Panorama Ridge), the four-place
  table `HELI_DESTINATIONS_WITH_SUMMIT`, `destinationsFor({summitRun})`, and
  an options argument on `isDestination`, `legFuelKg` and `bearing`. Legs: 160
  kg from the Woods, 150 from Tremblant Snow, 90 from Panorama Ridge, both
  ways. `HELI_DESTINATIONS`, the three routes, `dayJobs` and every default
  answer are as before; the everyday board never goes to Summit Run.
- **Car recovery job (5.3).** `wreckFor` (the car is a seeded pick from
  `JOB_CARS`), `recoveryJob(wreck, playDay)` (on the board from the day after
  the rescue, 3 play days, 500 credits, id `w<day>-<car>`), `recoveryTitle`
  ("Recover the <car> from Panorama Ridge"), `recoveryJobOf(profile)` and
  `finishRecovery(profile, {enabled, mode})` (pays through `jobPay`, so Real
  pays a quarter more; clears the wreck; never twice). The save already
  removes a wreck more than 3 play days old.

## How the switch-off case is proven (`tools/test-heli-missions.mjs`, `test-heli-jobs.mjs`)

- A fingerprint of 60 players over 5 rounds of the fire engine (need, call
  time, due, call, seed, record) taken from the engine as it stood at
  RESCUE-SAVE's merge is pinned (1254743498); the test runs it with no switch
  and with `rescue: false` and both must equal it. The same for the
  dispatch tables: 60 boards, the legs, the destinations and the Summit Run
  answers, pinned (3257734403).
- A stored call of each rescue kind, and a stored rescue record, with the
  switch off: not seen, never offered, a fire call still opens (and equals the
  fire call opened without the stored one), refuels still count, nothing to
  answer, nothing begins, the clock does not run.

## Tests

- `tools/test-heli-missions.mjs`: 45 groups (25 new), `test-heli-jobs.mjs`:
  612 checks (the new blocks are Summit Run and the recovery job). New groups
  cover the season rows, kind frequency by season, courses by kind, a kind
  repeating, the quiet spell after every kind, the waiting-call rule, the
  clocks, cold at two thirds, expiry, dusk, every failure number (400, 200,
  forgiven, tally, crates, each reason), success pay and badge, the wreck
  car, and that no helper changes the record it is given.
- `test-heli-save.mjs` (35), `test-heli-fire-session.mjs` (79), `test-heli-rescue.mjs`
  (263) and `test-heli-fire.mjs` (12) pass unchanged.
- Lane tier (`--tier lane --changed --jobs 4 --keep-going`, PowerShell): 140 passed, 0 failed, 0 not run, 1,552.67 s. `npm run build`: passed.

## Changed assertions

None. Existing assertions are untouched; only imports and new groups were
added.

## Removed

Nothing replaced.

## Open for Claude

- **RESCUE-HOOKS must read the call through `callOf`.** `heli-fire-run.js`
  (not this card's file) still reads `missions().call` directly in `liftoff`
  (`!m.call`), `step` (the answer countdown), `pressRadio` and `view`. With the
  switch off and a rescue call stored, `liftoff` would not create the call
  clock for a due fire call. The engine is right (`callDue` and `openCall`);
  the hooks must route those four reads through `callOf(m, {rescue})`.
- **`clockSeconds` counts up from the answer** (elapsed), so a damaged or
  missing value reads as a fresh clock, never as time already out.
- **Wreck only on success.** A hoist rescue that fails leaves no car job (the
  ground team brought the driver out; the packet only offers the job after a
  rescue). Say if a failed hoist should leave the car too.
- **The recovery job pays like a dispatch job** (Real pays 625), not like a
  rescue (the same in Assisted and Real).
- **Summit Run's map spot** (-10, +12) km is a choice: the packet says only
  north-west of Panorama Ridge (-6, +7), with north as +z.
- The base pays (1,000 / 1,200 / 1,200) sit in `RESCUE_MONEY.basePay`
  because no other file held them; heli-rescue.js still does the condition
  shares and the supply pay.
