# RESCUE-AUTOPILOT: rescue goals, Summit Run as a place to fly to, the car recovery job

Card: RESCUE-AUTOPILOT (Claude, SIM lane, no lock). Design: `docs/HELI_RESCUE.md`
sections 5.3, 5.5, 7, 11 and 12. Built by a helper for Claude. Switches: `rescue`
(the first and third jobs, `rescueEnabled`) and `summit-run` (the second job,
the new session option `summitRunEnabled`). With both off nothing new runs.
No drawing, panel or app change (RESCUE-VIEW owns those).

## What changed

### `src/heli/heli-session.js`

- **Rescue goals for the autopilot (section 7).** With a rescue in hand the
  autopilot flies to, and stops in a hover 40 m above the highest ground or
  tree within 12 m of:
  - the lost hiker's search area centre, then the clearing once the hiker is
    found and not yet aboard;
  - the avalanche's debris area centre (it keeps this goal after the beacon is
    heard, so it stops over the slide rather than drifting on);
  - the hoist driver's cliff spot;
  - the handover circle (the pad at home, or the rescue course's own landing
    zone) once people are aboard or on the line (a carried casualty).

  The 40 m is for the helicopter itself; whatever hangs on the cable (the
  rescuer, the bucket, a car) is allowed for, as the fire goal already does.
  Searching, setting the rescuer down, the hold and landing stay the pilot's:
  nothing flies to a supply run, and while the hold at a casualty is on, the
  autopilot only hovers where it is (it takes the present height and heading).
  H1's obstacle height, bank limit, 30% hand-back and the 20 m/s limit with
  people on the line are unchanged. The goals are checked once a second like
  the fire's, so they follow a stage change (found, aboard) and the helicopter
  coming over from a cruise leg. `view().rescue.goal` shows where the autopilot
  is flying (for the panel; nothing draws it yet).
- **Summit Run as a destination (section 5.5).** New option
  `summitRunEnabled`. With it on, the session's destination table, bearings,
  cruise leg fuel (160 kg from Tremblant Woods, 150 from Tremblant Snow, 90
  from Panorama Ridge, both ways) and `start()`/`setDestination()` all use
  `destinationsFor({summitRun: true})`, and `view().destinations` names the
  four places. `courseSite(course, ground, courseId, {summitRun})` takes the
  option too: Summit Run's zone is found beside its start line by the same
  search as every course (no change to `heli-ground.js` was needed), and with
  the option on every course's flying area takes in the arrival point from
  Summit Run. With it off the table, the areas and the legs are what they were.
- **The car recovery job (section 5.3).** The job in hand can now be the
  recovery job: `takeJob(id)` takes it, `dropJob()` hands it back, the board
  row shows it taken. The customer's car waits where the wreck lies on the
  slope. Taken at the pad, the autopilot's way to the slope is the usual one
  (`aimAtJob`, the cruise leg); on the slope the autopilot goes to a hover 40 m
  above the car, then, with the car hooked, to the landing zone as for any car
  job. A clean release inside the zone pays through RESCUE-ENGINE's
  `finishRecovery` (which also clears the wreck) and then clears the job in
  hand, so it pays once: after that the board no longer has it and it cannot be
  taken. Real pays a quarter more (`finishRecovery` does that).

### `src/heli/heli-board.js`

- The recovery job row has a **Take job** button (and **Drop job** while in
  hand), like the day's jobs. "Hook the car on the slope" stays beside it
  until it is taken.

## The switch-off proof

`tools/test-heli-autopilot-rescue.mjs` pins a fingerprint (3531442031) taken
from the session **before this card's change**: the fire's lake flight on the
autopilot, a flight to Tremblant Snow on the autopilot across its cruise leg
to the approach, and the dispatch board with a job taken, each with its
events, view, save, fingerprint and board markup hashed. It is the same with
no switch, `rescueEnabled: false`, `summitRunEnabled: false` and non-true
values. `test-heli-rescue-session` (the switch-off fingerprint 1400586788 from
RESCUE-HOOKS), `test-heli-fire-session`, `test-heli-jobs` and
`test-heli-missions` pass unchanged.

## Tests

- `tools/test-heli-autopilot-rescue.mjs` (new, 169 checks, about 20 s): the
  pin; a hiker flown from the pad (centre of the search area, 40 m above, a
  stick beyond 30% hands control back, found by hand, the clearing, the pad's
  circle with the hiker aboard, 1,000 paid, twice with the same result); an
  avalanche and a hoist with the rescuer on the line, across the cruise leg
  by autopilot, stopped 40 m above the debris area and the cliff spot, the
  carry at no more than 20 m/s to the handover circle and landing by hand; the
  hold at the driver left to the pilot; no goal for a supply run; Summit Run
  (off: not a destination, the view names three; on: zone and pad, all six
  legs and their fuel, the flight from the Woods, thin air, the approach and a
  good landing); the recovery job (board, Take, Drop, a second job refused,
  off, the 3-day limit, flown from the pad to the slope, hooked, carried and
  set down, 500 paid once, Real 625 on the board); the same goal at 60, 144 and
  240 steps a second.
- `tools/test-heli-mode.mjs` extended (packet 11, 176 checks): Summit Run's
  landing zone and flying area with the option on and the other courses'
  areas taking in its arrival point (and unchanged with it off), and the
  thin-air supply run: the heaviest crate and a full tank do not leave the
  pickup at about 3,430 m, half a tank does, the same load climbs at sea level.

## Changed assertions

One. `tools/test-heli-rescue-session.mjs`, the recovery job on the board: the
assertion `!markup.includes('take:w6')` ("with no Take button yet") is now
`markup.includes('take:w6')`. RESCUE-HOOKS wrote it as a stop gap and noted
"recovery job: shown, not yet takeable"; this card exists to add the button.
Nothing else in that test changes: the title, the 500 credits, "Hook the car
on the slope" and "Pick up at Panorama Ridge" are still asserted on the same
markup. Claude to review.

## Removed

Nothing replaced.

## Open for Claude

- **`src/app.js` needs one line** (busy-game-files, not this card's file):
  `visitHeli` should pass `summitRunEnabled: this._switches().enabled('summit-run')`
  to `createHeliSession`. Until then the app never offers Summit Run.
- **`heli-ui.js` builds its destination buttons from `HELI_DESTINATIONS`**
  (RESCUE-VIEW's file). The panel needs `view.destinations` (added here, only
  with Summit Run on) and `destinationsFor` to show the fourth button and its
  fuel. `heli-board.js` still names Summit Run only through the course id.
- **Summit rescues are not wired.** `rescueConditions()` is still called
  without `{summitRun}`, so the avalanche and the supply run are not offered at
  Summit Run. The supply run there needs the pickup, the fuel truck and crates
  laid out at the pickup (`layCrates` only lays them at the home pad), and the
  flying area's ceiling is 300 m over the start, below the pickup (about
  570 m up) and the hut. That is a card of its own.
- **After the hiker is found** the autopilot goes to the clearing (not in the
  packet's list, which names only the search centre). Say if it should stay
  at the centre.
- **Hooking by hand in Real mode** is not scripted in the recovery flight test;
  Real's 625 is checked on the board and in `test-heli-jobs` through
  `finishRecovery`.
- **Goal cadence** is every 120 steps, as the fire's is, so at other step
  sizes the goal is picked up after a different time (the flight still ends in
  the same hover; tested at 60, 144 and 240 steps a second).

## Gates

Owned and neighbouring suites pass: autopilot-rescue (169), mode (176),
rescue-session (442), fire-session (79), jobs (612), missions (45 groups),
hooks (291), rescue (263), search (1,134), save (43 groups), survey (9,990),
lessons (63). Lane tier (`--tier lane --changed --jobs 4 --keep-going`,
PowerShell, working tree before commit): 141 passed, 0 failed, 0 not run,
619.41 s; full log in the lane's `.qa-dist/lane.log`. `npm run build`: passed.
No browser scenarios, no frame check (nothing here is drawn).

## Claude's review notes

- Changed assertion in `tools/test-heli-rescue-session.mjs`: "no Take button
  yet" becomes "the Take button is there", because this card adds it. Claude's
  review: the old check recorded the missing button; the other recovery-row
  checks are unchanged; nothing is loosened.
- `src/app.js` (Claude, holds busy-game-files): `summitRunEnabled` is passed
  only when fire, `rescue` and `summit-run` are all on. Summit Run is live as a
  course, so gating it on the course switch alone would show an unfinished
  helicopter destination to players; with `rescue` still dev it stays in
  development.
- Summit rescues (supply pickup and truck, the flying ceiling below the
  pickup), the fourth destination button and Real-mode hooking go to later
  cards (SUMMIT-HELI-RESCUES, RESCUE-VIEW).
