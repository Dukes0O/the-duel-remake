# FIRE-FINISH: Claude's finishing pass on H2 Fire

Card: FIRE-FINISH (Claude, FINISH lane; holds `save-shape` for one field).
Design: `docs/HELI_FIRE.md` section 16; answers on
`docs/board/cards/FIRE-FINISH.md`. Needs FIRE-VIEW (merged).

## What changed

- **Played through in the browser** (`tools/scenarios/fire-finish.mjs`,
  new, memory-only saves): the call 20 to 60 s into a flight, R to answer,
  land and fit the bucket, the autopilot to the lake, a dip, the autopilot
  to the hot edge, H to pour, back to the pad for the pump when fuel runs
  low, until the fire is out and paid; then a fire left to burn, lost on
  the next play day's visit, the course closed with its buyback on the
  course menu. Pictures sent to Kyle. It shares `menu`, `installPilot`,
  `biggestFire`, `writeSheet` and `TRAINED` with `fire-view.mjs`, which
  now exports them (and `menu` can start a new play day).
- **What felt wrong: the fire outran the bucket.** At one spread step per
  90 s of engine time, a fire answered at once took 11 drops and about 36
  minutes headless, and in the browser it was still burning after 12 drops
  and an hour. FIRE-SPREAD tuned the section 4.5 targets with one drop per
  step, but a real bucket round trip, refuels included, takes about 200 s.
  `FIRE.stepSeconds` is now 200 (`src/heli/heli-fire.js`): the same fire
  goes out in 5 drops headless and 2 in the browser run. Play-day steps
  (three a new day) and so the neglect targets are unchanged.
- **Sarah's regrowth news** (`src/heli/heli-save.js`,
  `src/heli/heli-fire-run.js`): a burn remembers the last news heard
  (`burnt[course].heard`: `reopen`, `shoots` or `fireweed`), set by the new
  `hearBurnNews` (only forward, only for a burn, switch off saves nothing).
  At the start of a visit the fire run plays Sarah's line for the stage the
  burn has reached, once (a course whose news came days late hears only its
  latest stage; one line a visit), and emits `burnNews`. Rolled back one
  release, the older save loader drops `heard`, so Sarah repeats the news
  for the current stage once; nothing else is lost. The three lines
  were recorded by FIRE-RADIO and had no caller until now. A new burn
  starts with nothing heard.
- `docs/HELI_FIRE.md` sections 4.2 and 4.5 and the FIRE-SPREAD card name the
  new step; section 12's save list has the `heard` field.

## Tests

- `node tools/test-heli-fire-session.mjs`: 75 checks (was 57): Sarah's news
  at each stage (closed: none; reopened, shoots, fireweed; healed: none;
  bought back early: open again at once; news missed earlier: only the
  latest; the next visit of a stage: none; switch off: none), the save's
  forward-only rule (a buyback keeps the news, a new burn starts with none),
  and a fire answered at once out within 8 drops.
- `node tools/test-heli-save.mjs`: a valid `heard` survives loading,
  anything else is dropped.
- `node tools/test-heli-fire.mjs`, `test-heli-missions.mjs`,
  `test-fire-view.mjs`, `test-heli-mode.mjs`, `test-course-closures.mjs`: pass.
- Browser play-through (`node tools/browser-harness.mjs scenario
  fire-finish`): passed, 5 pictures, 0 warnings, 0 errors; the fire out in
  2 drops, +1,500 credits, the badge; the left fire lost overnight and the
  course closed at 10,000 to buy back.
- Lane tier (PowerShell, `--tier lane --changed --jobs 4 --keep-going`)
  after the review fixes: 179 passed, 0 failed, 0 not run in 879 s.
  `npm run build`: passed.

## Changed assertions

- `tools/test-heli-fire.mjs`: the fire constants list reads
  `stepSeconds` 200 (was 90); the clock check runs 399 s for one step
  (was 179) with 199 s left over (was 89), and a 120 kg cruise leg (200 s)
  is now one step (was two). Same rules, the new step length.
- `tools/test-heli-mode.mjs`: the import allow-list gains the play-through's
  two rule imports (it arms the mission engine in its saves).

## Review

One independent review (rule 17) of the save field, the news, the clock
and the tests: nothing serious. Fixed: two stale lines in the packet (the
plain-time figure and the save list), a stale comment in heli-fire.js, two
missing tests (buyback keeps the news, a new burn has none), and the
rollback note above. It confirmed the changed clock assertions test the
same edges and are not weaker.

## Removed

Nothing.
