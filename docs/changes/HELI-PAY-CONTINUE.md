# HELI-PAY-CONTINUE

Kyle's words: "it's not clear on the helicopter run how you earn the credits.
Helicopter takes a long time to get things done, so the credits should be
decent, and it's hard to control." and "When I flew to the Summit Run, and
then I stopped the chopper, it just went back to the main screen, in the last
circuit that I had played. So there isn't continuity."

Lane `claude/heli-continue`, from `integration/wasteland`. Not merged.

## Part A: a flight continues where it lands

### Cause (two faults, both needed to explain what Kyle saw)

1. `src/app.js:1791-1799` (before): `heliLanded('shutdown')` only called
   `returnToMenu()`. Nothing chose the course the helicopter stood on, so the
   menu kept the last circuit raced. Only Race here chose a course (and then
   stopped at the menu instead of racing).
2. `src/screen-menu.js:110` (`updateMenuScene`) writes the menu's own copy of
   the race choices (`choices.startStage`) back into the game with
   `app.setRaceSettings(choices)`. The menu's copy is refreshed only on the
   main menu button (`src/screen-router.js:322`). The helicopter panel's
   buttons (`src/heli/heli-ui.js:425`) called `app.heliLanded` directly and
   never told the menu, so the first redraw of the menu pushed the stale last
   circuit back over anything the game had just set. This is why even Race
   here, which did choose the course, showed the old circuit.

Negative control: with the new game-side choice in place but the menu refresh
removed, the new browser scenario fails with "Shut down should open the Summit
Run setup, the menu shows Pacific Canyon Circuit", which is exactly what Kyle
saw.

### Fix

- `src/app.js`: `returnToMenu()` now asks `_heliLandingChoice()` where the
  helicopter is standing (on the ground, at a race course that is not the home
  pad, course unlocked) and, after the menu is set, calls `setRaceSettings`
  with that course and the car parked there. This covers every way out of the
  flight: Shut down, the pause menu's Main menu (Esc), and the arrival panel.
  A visit that never left the home pad leaves the menu choice alone, as before.
- `heliLanded('race')` now calls the existing `raceHere`, so Race here starts
  the race on that course with the parked car. A refusal (air-only car
  elsewhere, closed course) falls through to the race setup, which says why.
- `src/heli/heli-ui.js` takes an `onMenu` callback and calls it after an
  arrival button ends the visit in the menu; `src/screen-router.js` passes
  `refreshRaceSetup`, which re-reads the game's choices into the menu.

### Tests

- `tools/test-heli-view.mjs` (359 checks): Shut down and Race here at Tremblant
  Snow and Summit Run; Esc (Main menu) at Summit Run selects Summit Run; Esc
  from the home pad leaves the choice alone.
- New browser scenario `tools/scenarios/heli-continue.mjs`: a pilot who last
  raced Pacific Canyon lands at Summit Run, presses Shut down, and the setup
  shows Summit Run (picture: `heli-race-setup-summit-run.png`); Race here then
  starts the race on Summit Run. It also checks the board's pay words and the
  credits in the helicopter's status row.

## Part B: pay

### The rule

One rule for every helicopter job: about 350 credits for each minute of work,
which is what a Medium race win earns. A Medium win is 1,000 credits plus 100
for a clean race, over about 3 minutes with the menu, countdown and results
(a two-lap Pacific Canyon race is 70 to 105 seconds of driving in the repo's
scripted runs, a person is slower). That is about 365 a minute; Easy is about
220 and Hard about 550. A Grand Prix is paid by place (1,000, 750, 550, 400
and so on at Medium) over a longer race, which comes out in the same range.
Race pay is not changed. Fuel prices, repair costs, the fuel truck and the
failed-rescue charges are not changed either.

A clean delivery adds a quarter on top: no hard landing, crash, dropped load or
cargo knock while the job was in hand. The save did not track this, so the
session now counts those repairs (`damageCount` in `heli-session.js`) and each
delivery compares the count at its start with the count at its end. It applies
to car jobs, the recovery job, return crates and the heli-ski group, the jobs
where the load must be set down gently. Rescues already pay by the casualty's
condition and by crate drops, and fires, counts and ski medals have no load, so
they have no clean bonus. A job still in hand from an earlier visit counts as
clean at the start of a new visit (the count starts at zero).

Typical minutes come from each job's own parts; they are estimates, not timed
by a person, and they live in one place, `src/heli/heli-pay.js`. A delivery is
leave the pad 1, hook 1, carry out 1, cruise (leg fuel / 0.6 kg a second),
arrive 1, set down 1. From another pad it first cruises there and lands (about
2 minutes plus the cruise). Cruise legs: Woods to Snow 25 kg (0.7 min), to
Ridge 120 kg (3.3 min), Snow to Ridge 110 kg (3.1 min), Summit 150 to 160 kg
(4.2 to 4.4 min).

### Pay table

| Job | Before | After (base, clean bonus) | Minutes used |
| --- | --- | --- | --- |
| Car job Woods to Snow | 300 | 2,000 + 500 | 5.7 |
| Car job Snow to Ridge (fly to Snow first) | 450 | 3,400 + 850 | 9.8 |
| Car job Woods to Ridge | 600 | 2,900 + 750 | 8.3 |
| Car jobs from the pilot's map | 300 to 800 by distance | same rule from the leg fuel (for example 4,550 to 7,700) | by leg |
| Return crate Snow to Woods | 180 | 2,000 + 500 | 5.7 |
| Return crate Ridge to Snow | 270 | 2,800 + 700 | 8.0 |
| Return crate Ridge to Woods | 360 | 2,900 + 750 | 8.3 |
| Car recovery (Panorama Ridge) | 500 | 3,100 + 800 | 8.8 |
| Wildlife count: good, close, off | 600, 400, 200 | 3,500, 2,350, 1,150 | 10 |
| Wildlife count: rare animal | +100 | +600 | |
| Fire put out | 1,500 | 6,300 | 18 |
| Rescue: lost hiker | 1,000 | 3,500 | 10 |
| Rescue: avalanche | 1,200 | 3,850 | 11 |
| Rescue: hoist | 1,200 | 3,850 | 11 |
| Rescue shares (unhurt, hurt, badly hurt) | 100, 60, 25 per cent | unchanged | |
| Medevac stretcher bonus on a hoist | +200 | +650 | |
| Supply run, each crate | 300 | 1,450 | 14 for three |
| Supply run, crate released from over 1 m | 150 less | 750 less | |
| Supply run, all three in time | +100 (1,000 in all) | +500 (4,850 in all) | |
| Heli-ski group job | 1,200 | 5,600 + 1,400 | 16 |
| Ski medals per run: bronze, silver, gold (total) | 150, 300, 500 | 1,050, 2,100, 3,500 | 10 |
| Powder stash, each of three | 100 | 700 | 2 |
| The Table, found once | 500 | 3,500 | 10 |
| Lessons, Lab challenges | no pay | no pay | |

Real mode still pays a quarter more on the car jobs, recovery, return crates
and the ski group, and on their clean bonus.

### Making earning clear

1. Before a job starts: the dispatch board row says "Pays 2,000 credits, +500
   for a clean delivery" (the count says "Pays up to 3,500 credits"); the
   arrival panel's crate says the same; a waiting rescue call says "Pays up to
   3,850 credits; a hurt casualty pays less" (or "for three crates"); a fire
   call says "Pays 6,300 credits when it is out"; the ski board row for the
   group says it too.
2. When a job ends: the notice reads, for example, "Job done: 2,500 credits
   (2,000 and 500 for a clean delivery). You now have 14,300." The same
   balance goes on the rescue, crate, fire, count, ski group, powder and Table
   notices, and the ski result card. Every paying event carries `balance`,
   set in the session's `emit`.
3. The helicopter's status row shows "CREDITS 5,000" beside autopilot, view,
   hook and map (picture: `heli-job-panel-pay.png` shows it with the board).

## Changed assertions (and why)

Every changed assertion moves because a pay number or a pay sentence moved,
or because Shut down and Race here now do what Kyle asked. No tolerance was
widened and no flight, physics or race result changed.

- `test-heli-view.mjs`: "opens menu without starting race" and "shut down
  leaves menu choice alone" become "Race here starts the race on the arrival
  course" and "shut down selects the arrival course and parked car". This is
  the fix itself.
- `test-heli-jobs.mjs`: three route pays, return crate rule (was 60% of the
  car job, now the minutes rule), recovery 500 to 3,100, the clean bonus on a
  clean car job, a crate and a recovery, and no bonus after a dropped load,
  and the board and arrival wording. Pin 3257734403 became 2810692613: with the
  new pays mapped back to 300, 450 and 600 the same list hashes to the old
  value, so only pay moved.
- `test-map-destinations.mjs`: the distance bands (300 to 800) are replaced by
  the minutes rule; the `jobs` pin moved (471279539 to 3599930983) and the
  legs, bearings, titles and tables pins did not.
- `test-heli-survey.mjs`, `test-heli-skin-session.mjs`: count pays and the
  board pin 3895189678 to 3645581706 (pays only).
- `test-heli-skin-gear.mjs`: rescue and survey scenario hashes (they print
  the credits paid), the stretcher 200 to 650, hoist 3,850.
- `test-heli-skin-session.mjs`, `test-heli-rescue-session.mjs`,
  `test-heli-autopilot-rescue.mjs`: pins for the car job, fire, fire session
  and switch-off flights (they hash pay words); hiker, avalanche, hoist and
  supply hashes did not move. Pays 1,000 to 3,500 and so on.
- `test-heli-rescue.mjs`, `test-heli-summit-rescues.mjs`,
  `test-heli-summit-tune.mjs`, `test-heli-missions.mjs`, `test-heli-save.mjs`,
  `test-heli-fire-session.mjs`, `test-heli-ski-save.mjs`, `test-ski-heli.mjs`,
  `test-heli-skins.mjs`: the pay numbers named above.
- `test-heli-ski-save.mjs` also reads `docs/HELI_SKIING.md`; that file and the
  pay lines in `HELICOPTER.md`, `HELI_RESCUE.md`, `HELI_FIRE.md` and
  `HELI_WILDLIFE.md` were updated to match.
- New `tools/test-heli-pay.mjs` (34 checks): every pay equals its minutes at
  the rate within 50 credits, the race-rate reference, the bonus and the
  words.

These changed assertions need Claude's written review before merge (AGENTS
rule 18).

## Checks

See the end of this note for the results of the final run.

## Removed

- The distance bands `MAP_JOB_PAY` and the old `mapJobPay(km)`; `mapJobPay` now
  takes two courses. The old "60% of the car job" return crate rule. The old
  "(+25% in Real)" board wording. The unused `mapDistanceKm` import in
  `heli-jobs.js`. The old fixed pay numbers in the helicopter design documents.
  No scratch files kept; this task's `.evidence` folder was recycled.

## Open

- The minutes are estimates. If Kyle's play shows a job taking much longer or
  shorter, change `HELI_MINUTES` in `heli-pay.js` and nothing else.
- Map jobs from the pilot's map show the raw course id ("Pick up at
  pacific-canyon") on the board; that was already so and is not touched here.
