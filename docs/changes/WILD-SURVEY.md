# WILD-SURVEY: the wildlife count

Card: WILD-SURVEY (Claude, SIM lane, no lock). Design: `docs/HELI_WILDLIFE.md`
section 4. Switch: `wildlife` (dev), passed as `{enabled: true}`. With it off the
board has no count, nothing is paid, and every existing job, fire and rescue
answer is what it was. No screen, session, radio or drawing work (SKIN-HOOKS,
WILD-RADIO, SKIN-VIEW).

## What changed

### `src/heli/heli-survey.js` (new, pure)

Every number is in a named table: `SURVEY` (square, grid, reaches, heights, fright
time, counts), `SURVEY_PAY` (bands and the rare bonus), `SURVEY_TARGETS` (what
can be asked, by course), `SURVEY_NAMES`, `SURVEY_LINES` (Sarah's radio ids).

- **The job.** `surveyJob(day, {summitRun})`: one a play day, same for the same
  day. A course (equal chance among the three, four with Summit Run), then a
  species there by weight. Woods: moose, black bear, deer. Tremblant Snow: deer,
  moose. Panorama Ridge: kangaroos. Summit Run: bighorn sheep (weight 4) or
  cougar (weight 1, so one in five). Never a cougar at Tremblant. Id `s<day>`,
  shown pay 600.
- **The square.** `planSurvey(job, {site, canStand, wildlife})`. 800 m square placed at a
  seeded spot inside `site` ({minX, maxX, minZ, maxZ}, supplied by the session;
  centred on the origin without one). The counted species: 6 to 14 animals in 2
  to 6 herds (every herd at least 1). Other species that do not count (1 to 3
  herds from the course's common animals) and, one square in five
  (`RARE_CHANCE`), the course's rare animal. Every animal is inside the square;
  `canStand(x, z)` keeps them off roads and water. Own seeded generators per
  purpose (`makeRng` from `src/rng.js`), never the race's.
- **The flight.** `createSurveyRun(plan)` and `stepSurvey(run, {dt, x, z, agl})`.
  The path is the straight line from the last step to this one, so any frame
  rate gives the same count and cover. An animal counts once when within 60 m
  sideways while at most 150 m above the ground. Below 60 m above the ground,
  animals within 100 m run and cannot be counted (or seen, if rare) for 120 s
  after the last fright. Events: `count`, `scare` (once per fright), `rare`.
- **Cover.** 40 by 40 cells of 20 m; a cell is covered when its centre lies within
  60 m of the path, counted only while the helicopter is at most 150 m up.
  `surveyShare`, `surveyPercent`, `canReport` (at least 400 of
  1,600 cells, kept in whole cells).
- **The report.** `reportSurvey(run)`: estimate = count divided by share,
  rounded. Within 20% of the true number pays 600, within 40% pays 400, further
  off 200 (compared in whole numbers, so the edges are exact); 100 more if the
  course's rare animal was seen. Changes nothing.

### `src/heli/heli-jobs.js` (added at the end; nothing above edited but one import)

`surveyTitle` ("Count the moose at Tremblant Woods"), `surveyJobOf(profile,
{enabled, summitRun})` (null with the switch off, or once today's count is done)
and `finishSurvey(profile, run, {enabled, summitRun})`. Finishing pays the
report (capped like every credit change, the same in Assisted and Real), adds one
to `missions.wildlifeCounts` and saves `heli.survey = {day, done: true}`. The run
must be for today's job and the job must still be on the board, so a second press
or a replay pays nothing. An unreportable run (under a quarter) pays nothing and
leaves the count on the board to try again.

## How the switch-off case is proven (`tools/test-heli-survey.mjs`)

A fingerprint of the dispatch board as it stood at RESCUE-ENGINE's merge,
taken before this card changed `heli-jobs.js` and pinned (3895189678): 60 days of
`dayJobs` with pay and titles, the routes, cars, destinations, every leg and
bearing with and without Summit Run, and the recovery job and `finishRecovery`
with the switch on and off. The test recomputes it and must equal it. With
`enabled` off or missing, `surveyJobOf` is null and `finishSurvey` returns the
same profile object. `test-heli-missions.mjs` (its own pinned fire fingerprint)
and `test-heli-jobs.mjs` are unchanged and pass.

### Money review fix

A report is accepted only from a run made by `createSurveyRun` (a module-level
`WeakSet`; `isSurveyRun`), so a hand-made object or a copy of a run pays nothing
(`reportSurvey` and `finishSurvey` both refuse it). `finishSurvey` also requires
the run's plan to match today's job (id, course and species), so a count planned
with Summit Run on is refused with it off. Tests cover the forged object, copies,
the Summit Run mismatch, a wrong species, and a real run still paying.

## Tests

`tools/test-heli-survey.mjs`, about 10,000 checks: every table value; the day's
job for 600 days (courses, species, no cougar at Tremblant, Summit Run only with
its switch, cougar about one in five there); the plan over 500 days (6 to 14
animals, 2 to 6 herds, all in the square, the rare share near one in five, other
species never the counted one, `canStand` obeyed, same day same plan); counting
distance (59, 60, 60.5 m), height (150, 150.5 m), once only, other species not
counted, any frame rate (0.1 to 144 steps a second) and one huge step; fright
edges (59, 60 m up; 99, 100, 101 m away), 119, 119.9, 120 s, a second fright
restarting the clock, one event per fright; cover against an independent
brute-force answer, 120 m lines covering all 1,600 cells, 399 against 400 cells;
the estimate and its rounding; every pay band edge for a true number of 10 and 7;
the rare bonus; a full flight over 120 planned squares (every animal counted,
estimate equals the truth, 600 or 700); low flying scaring everything; money once
(second press, replay, yesterday's run, wrong job, cap, Real equals Assisted,
next play day pays again, tally goes up by one and other mission fields stay).
No clock and no `Math.random` (both made to throw during the checks).

The existing suites (`test-heli-jobs.mjs`, `-missions`, `-save`, `-fire-session`,
`-rescue`, `test-wildlife.mjs`) pass unchanged.

## Gates

- `test-heli-survey.mjs`: 9,970 checks. `test-heli-jobs` 612, `test-heli-missions`
  45 groups, `test-heli-save` 43 groups: pass.
- Lane tier (`--tier lane --changed --jobs 4 --keep-going`, PowerShell): 141
  passed, 0 failed, 0 not run, 886.52 s. A first run found one failure,
  `tools/test-heli-mode.mjs` (its import list for the helicopter rules did not
  allow `../wildlife.js`); fixed by handing the tables in (see Open), then the
  whole tier was rerun clean.
- `npm run build`: passed. No browser checks.

## Changed assertions

None.

## Removed

Nothing replaced.

## Open for Claude

- **The species tables are handed in, not imported.** `test-heli-mode.mjs` lists
  the only files the helicopter rules may import, and `../wildlife.js` is not on
  it. That file is not this card's, so `planSurvey` takes `wildlife` (the session
  passes `import * as wildlife from '../wildlife.js'`: `speciesFor`, `SPECIES`,
  `RARE_CHANCE`) and the tests do the same. Without it the square holds only the
  counted animals (no other species, no rare animal, no bonus). If you would
  rather import it directly, add `'../wildlife.js'` to that list (with a comment,
  as FIRE-BUCKET did for `circuit-hills.js`) and drop the argument.
- **Where the square goes.** The packet says "a seeded forest destination" but
  the pure rules cannot see terrain. The session (SKIN-HOOKS) passes `site`
  (the box to choose from) and `canStand` (WILD-PLACE's
  `createPlacementChecker(course).inspect` can build it, with its 15 to 70 m road
  band relaxed, since a count square is wilderness). Without them the square sits
  on the origin and every point is standable.
- **Herd sizes.** The packet's "6 to 14 animals in 2 to 6 herds" wins over the
  species table's herd sizes (a moose herd can be 3 here; a cougar count is 6 to
  14 cougars in 2 to 6 groups).
- **A cougar count has no rare bonus.** The cougar is Summit Run's rare animal,
  so when it is what is counted, there is no separate rare animal and no 100 bonus.
- **Claude decided (16 October):** cover grows only while the helicopter is at
  most 150 m up (the counting height), so flying high covers nothing and a quick
  high pass cannot earn the 200 minimum. Fright does not affect cover. Built
  as a single height check in `stepSurvey`; tests: a 400 m sweep covers 0 cells, a
  100 m sweep covers as before, a mixed path covers only its low part.
- **Height and distance are read at the end of each step**, and distance is
  across the ground (not through the air). The path between steps is a straight
  line.
- **Gear numbers are the base ones.** Quieter rotor tips (50 m fright) and the
  zoom camera (100 m reach) are SKIN-GEAR's: it will read them from `SURVEY` and
  add an options argument to `stepSurvey`. Nothing about gear is built here.
- **Which other species stand in the square:** the course's common animals that
  are not night-only, not tracks, not shore-bound (the beaver), and not the species
  counted. Panorama Ridge's others are cockatoos and kookaburras (birds).
- **Count progress is not saved.** Only the finished day, the pay and the tally are;
  leaving the course or taking another job just drops the run, and a new run for the
  same job starts clean.
