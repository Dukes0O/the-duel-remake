# HELI-DISPATCH

The dispatch board, flying your own car, and Race here (docs/HELICOPTER.md
sections 5 and 6). With the `helicopter` switch off nothing changes. The
"special cars travel only by air" part of this card's title was already done
by HELI-HOOKS (`AIR_ONLY_CARS`, `isAirOnlyCar`, `_airOnlyRefused`); this card
only keeps customer cars from being special cars.

## What landed

- `src/heli/heli-jobs.js`: the three routes with pay (300, 450, 600),
  `JOB_CARS` (every car the helicopter can lift except the air-only cars),
  `dayJobs(day)` (three jobs, one on each route, three different cars, from
  `makeRng` seeded with `0x4b455354 ^ day`, ids `d<day>-<n>`), `jobPay(job,
  mode)` (Real pays `Math.round(pay * 1.25)`: 375, 563 and 750) and
  `jobTitle(job)` ("Fly the Falcone F42 to Tremblant Snow").
- `src/heli/heli-save.js`: `takeJob`, `dropJob` and `finishJob`, pure and in
  the file's existing style (switch argument, `{ok, profile}`, nothing
  changed in place, credits whole and never below zero, capped at
  1,000,000,000 like the rest of the save). A job left in hand from an
  earlier play day is treated as out of date, so it never blocks a new one.
  The save's shape is unchanged.
- `src/heli/heli-session.js`: the session now holds a list of cars on the
  course (the player's own and the customer's) instead of one. `boardJobs()`,
  `takeJob(id)`, `dropJob()`, `raceHereOffer()`, and `mode` and `job` getters.
  Taking a job works only on the ground at the home pad. The customer's car
  waits at its pick-up (the parking spot at home, the landing zone elsewhere,
  or a new spare spot beside the pad when the player's own car already
  stands there). Hooking and releasing use the car nearest the hook or the
  one on the cable. A clean release of the customer's car in the drop-off
  zone pays, marks the job done and says the radio line; a release from
  height charges the drop as before and the job stays in hand. Hooking the
  customer's car points the destination at the drop-off. A job in hand
  survives a new visit; a crash sends the customer's car back to where it
  waited. The view gains `loads` (every car, with `own` and `job`) and
  `job`; `view.load` is still the one car the renderer draws (the one on the
  cable, else the player's own).
- `src/heli/heli-board.js` (new): `dispatchBoardMarkup(view, {jobs, offer,
  mode})`, `handleBoardAction(action, app)`, `createDispatchBoard({root, app})`
  and `atHomePad(view)`. Plain markup with `heli-board` class names and
  `data-heli-board` buttons (`take:<id>`, `drop`, `race-here`). The jobs part
  shows only on the home pad's ground; the Race here button shows wherever
  the offer is. It is not mounted yet: HELI-VIEW mounts and styles it.
- `docs/HELICOPTER.md` section 6: "Settled while building HELI-DISPATCH".
- `tools/test-heli-jobs.mjs` (new), `tools/test-heli-save.mjs` (extended).

## Numbers

| Route | Pay (Assisted) | Pay (Real) |
| --- | --- | --- |
| Tremblant Woods to Tremblant Snow | 300 | 375 |
| Tremblant Snow to Panorama Ridge | 450 | 563 |
| Tremblant Woods to Panorama Ridge | 600 | 750 |

Customer cars: Falcone F42, Stuttgart 959-S, Falcone Heritage, Aurora GTR,
Dusthawk Rally and Viper Prototype.

## Checks

- `node tools/test-heli-jobs.mjs`: 554 checks. The jobs are the same for the
  same day and differ across days (60 days, many different boards); every
  board has one job on each route with the listed pay and only liftable,
  non-special, different cars; Real pays a quarter more; the board always
  lists "Fly my car"; a job is taken at the home pad and refused in the air,
  refused when another is in hand, and can be dropped; the customer's car
  waits beside the player's, even the same model; a Snow to Panorama Ridge job
  points at Snow first, its car waits in the Snow zone, and hooking it points
  at Panorama Ridge. Headless flights with the scripted pilot: Woods to Snow,
  hook at the home parking spot, autopilot, cruise, set down and release pays
  300 (375 in Real, flown in Real mode with a Real pilot), `jobs.done` has the
  id, the same job cannot be taken again that day, a new play day offers new
  jobs; a car let go 6 m up is charged a drop and stays taken, then hooking
  it again and setting it down gently pays; a crash with the customer's car
  on the cable sends it back; a job in hand is picked up by the next visit
  and an old one does not block a new one; Race here is offered only after
  the player's own car is delivered to an owned course and is withdrawn when
  the car is lifted again; the markup, escaping, the click handler and
  `createDispatchBoard` with a fake root.
- `node tools/test-heli-save.mjs`: 16 groups (two new: jobs taken, dropped,
  finished and paid once; the credit cap and a damaged wallet). The switch-off
  and frozen-input groups also cover the three new helpers.
- The other helicopter suites still pass: flight 119, cable 87, mode 140,
  audio, hooks 124.
- The headless flight fingerprint in `test-heli-mode` is unchanged (checked
  against the code before this card): the flight itself did not change.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`
  (run from PowerShell, as HELI-HOOKS found Git Bash's `tar` breaks
  test-drive-through): 161 passed, 0 failed, 0 not run in 653.23 s.
- `npm run build`: passed in 746 ms (the usual large-chunk warning only).

## Changed assertions

- `tools/test-heli-mode.mjs`, import guard: the rules files may now also
  import `../rng.js` (the seeded generator, for the day's jobs) and
  `../course-access.js` (which courses the player owns, for Race here). Both
  are pure. Nothing else in the guard changed, and no other assertion was
  touched. The two extra checks come from `heli-board.js` joining the list of
  rules files it checks.

## Save review

The three new helpers in `heli-save.js` (`takeJob`, `dropJob`, `finishJob`)
change the `jobs` field's behaviour and add credits, though not the save's
shape: they need the save review.

## Open points for Claude's review

- A customer's car can be the same model as the player's own; the two are told
  apart by `own` and `job` in the view, and the renderer's single `view.load`
  is always the car on the cable or the player's own. HELI-VIEW should draw
  the others from `view.loads` (a customer's car that is not the player's
  model has no drawing yet).
- The board panel's jobs part only shows on the home pad, but Race here has to
  show at the destination, so the panel is two parts. HELI-VIEW decides where
  each sits.
- Day 0 (no `today` given, which only tests do) still has a board.

## Removed

Nothing was replaced.

## Sound cue

Job taken and job done play the radio lines that HELI-RADIO already made
(`heli.radio.job.taken`, `heli.radio.job.done`). Pay and the board add no
other sound.

## Review

One independent review (rule 17; code, money and the save): CLEAR, no
faults. It flew extra deliveries against the real session (a second
release pays nothing, the wrong zone or 30 m outside pays nothing, a crash
returns the job car with the job still in hand), checked the pay values,
the cap, the frozen inputs, the normalizer limits, the switch refusals and
the unchanged headless flight fingerprint. Notes carried forward: the page
draws only one car, so a customer's car and the player's parked car must
both be drawn (HELI-LESSONS draws every car in `view.loads`); the Real
bonus follows the mode at delivery.

