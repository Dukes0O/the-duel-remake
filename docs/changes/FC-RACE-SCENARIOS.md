# FC-RACE-SCENARIOS

The nightly full check on 22e9a9f8 failed five browser scenarios, and a rerun
failed them again. Four were stale checks against designs already shipped, and
the fifth is part stale, part an unreliable audio check. None was a fault in
the game for a player. Only scenario files changed: no game code, road, world
builder or save code was touched.

## What changed

All edits are in `tools/scenarios/`.

- `qualifying.mjs`: waits for the verified lap save before checking it (both
  the Pacific Canyon laps and the authored pit laps).
- `rescue-view.mjs`: the close look at the walking hiker now picks a side of
  the hiker where the rotor misses the trees, crosses at height and comes
  straight down.
- `lap-telemetry.mjs`: buys track intel level 3 at the menu before the race.
- `track-kits.mjs`: no longer tries to place the Ardennes beech freely on the
  empty test route.
- `p4-audio.mjs`: updated for paid Grand Prix results (see below). Its
  separate sample-frame check is unchanged.

## Cause of each failure

| Scenario | Verdict | Introduced by |
|---|---|---|
| qualifying | Stale scenario | 7dea01b2 (25 Oct, SAVE-RECORDS-IDB) |
| rescue-view | Stale scenario | 27fedc5f (hiker search circles shrank) |
| lap-telemetry | Stale scenario | 473e322e (15 Oct, telemetry needs intel level 3) |
| track-kits | Stale scenario | ca47179c (15 Oct, Ardennes beech must bind to a real tree) |
| p4-audio | Part stale scenario, part unreliable check | cdc16627 (26 Oct, GP-CAREER-LIVE) and laptop audio timing |

- **qualifying.** Lap records are now written to the verified IndexedDB save
  one after another. The scenario drove both timed laps in one synchronous
  loop and read the save in the same breath, so the second lap (the best,
  50.658 s) was still held as session-only and only the first (53.696 s) was
  counted. In play the save finishes a moment after the lap line, so nothing is
  wrong for a player.
- **rescue-view.** 27fedc5f shrank the lost-hiker search area (radius 300 to
  180 m, hiker 250 to 120 m from the last sighting), so the hiker now stands
  in a different part of Tremblant Woods. The scenario's page-side pilot flew
  in a straight line down to 4 m above the ground and the rotor hit a tree top
  (crash cause "rotor", at -625, -371), which reset the helicopter to the pad
  at 30, -20. The real rotor-strike rule did its job.
- **lap-telemetry.** Since 473e322e the Team Room hides telemetry until the
  player has track intel level 3 (finish in the top 5, or buy it for 400
  credits at the menu). The scenario never bought it, so the telemetry panel
  never appeared.
- **track-kits.** Since ca47179c the Ardennes beech kit binds only to an exact
  existing Ardennes tree. The scenario placed every kit id freely on the first
  route, including the beech, and the game correctly refused it ("must bind
  once to its exact selected existing tree"), leaving the kit world in error.
- **p4-audio.** Two separate things.
  1. Stale: GP-CAREER-LIVE (26 Oct) turned Grand Prix pay on. The scenario
     required a zero payout in both the real race and its no-save clone. About
     half of runs now finish with a payout (1,060 credits for a win), which
     failed "reward/balance presentation differs" and the replay comparison.
  2. Unreliable check, no game fault: roughly two runs in three then stop on
     "Missing or duplicated native sample frames: mix". It is always the
     capture counter repeating one 128-frame audio block (for example expected
     3,084,928, got 3,084,800), the recording harness's own clock slipping one
     block on this laptop. It also failed on 15 October, before any commit
     above. Not changed.

## Changed assertions

- `qualifying` (both blocks). Old: right after the synchronous loop, saved laps
  equal 1 (2 in the pit block), status "saved", player matches, best lap equals
  the faster timed lap. New: the same conditions, checked after `waitFor` sees
  the live lap view report status "saved" with the faster lap's time (15 s
  allowed for the real write). The pit block keeps its prior-record
  byte-for-byte check. Not weaker: nothing removed, and the best-lap time is
  fixed before the wait and compared to the saved one afterwards.
- `rescue-view`. No assertion changed. The flying helper now also throws if no
  side of the hiker is clear of trees (a new failure case) and flies to the same
  final view, 26 m off and 4 m up, down a clear column.
- `lap-telemetry`. No assertion changed. Setup adds a level 3 intel purchase and
  fails if it is refused. The panel, rows, lines, losses, focus and read-only
  checks are exactly as before.
- `track-kits`. Old: every kit id staged on the first route. New: the same
  minus `ardennes-beech`. The beech is still covered where the game allows it:
  `test-track-kits.mjs` validates 2,423 actual Ardennes High/LOD placements and
  the exact binding rule, and the `ardennes-views` scenario looks at them. The
  old run could not pass at all since 15 October.
- `p4-audio`. Old: native reward 0 and balance equals the profile; clone reward
  0 and clone balance equals its profile; native and clone state identical in
  every field. New: native reward is a non-negative whole number, balance
  equals the player's profile, a nonzero reward must carry a breakdown with a
  base above 0; clone reward still 0; native and clone state still identical in
  every field, except that inside `results` the 14 fields below are left out,
  because only the real settlement writes them. The no-save clone calls the
  same `_settleResult` but has no run owner, so it stops at the player check
  (`src/app.js` line 1134, `_runPlayerId !== player.id`) before writing any
  result field. Every other result field still has to match exactly, and the
  existing "clone profile unchanged" check still stops the clone from being
  paid. The run report now records the credit reward.

  Fields kept out of the comparison, and the line in `_settleResult` that writes
  each one (all after line 1134, so the clone never writes them):

  | Field | Written at (`src/app.js`) |
  |---|---|
  | `lapChoiceEnabled`, `raceDistance` | 1150-1154, lap-choice block (switch on, Pacific Canyon supports it, race completed) |
  | `creditPositionReward` | 1171, Grand Prix only, inside `if(awarded.awarded)` (1167) |
  | `creditReward`, `creditCharge`, `policeFineCharge`, `creditBreakdown`, `personalBest`, `personalBestStatus`, `previousBest`, `best`, `winStreak`, `milestoneAwards` | 1176, one `Object.assign` inside `if(awarded.awarded)`; values come from `settleRace` in `src/progression.js` |
  | `creditBalance` | 1195, last line of `_settleResult` |

  Fields dropped from the earlier, wider list because the real call cannot
  write them on this run (Falcone F42, Grand Prix, Pacific Canyon, switches as
  `?flags=grand-prix` leaves them): `driftScoreBest`, `driftScoreImproved`
  (1175, drift courses only); `cupSummary`, `cupBonus`, `cupStandings`,
  `cupTrophy` (`_recordCupResult`, needs a cup race); `tunedLap`
  (`_settleTunedLap`, Time Trial only); `coastCup` (1178, Sirena only);
  `yetiSightings` (1161, Summit Run only); `medal`, `earnedCars` (1181; the
  `earned-cars` switch is off, so `settleRace` returns neither);
  `notorietyEarned`, `notorietyRank`, `scrapEarned`, `scrapBalance`
  (1184-1191; `combatNotoriety` and the separate career need Wasteland mode);
  `ghostRecorded` (`_finishGhost`, 927; only Time Trial creates a ghost
  recorder). If one of these ever shows up on this run, the comparison now
  fails and names it, which is the intended signal.

## Tests run

- Each scenario run alone after its fix passed: qualifying, rescue-view,
  lap-telemetry, track-kits, and p4-audio (passed in two of five runs; the
  rest hit only the unreliable frame-gap check above).
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: 23 suites, all
  passed (including test-track-kits).
- `npm run build`: passed.
- Road, world builder, render3d and `src/heli/` were not changed, so
  `test-circuits`, the heli suites and world signatures were not needed.
- The laptop's disk filled to zero free bytes during the final combined rerun
  of the five, so that rerun is reported separately, not claimed here.
- The narrowed `p4-audio` field list (14 fields, from reading `_settleResult`)
  was changed after those runs and has not been run in the browser: the disk
  was full. The file passes a syntax check only. Run `p4-audio` alone once the
  disk is cleared.

## Removed

Nothing was replaced. One free kit placement was dropped from track-kits' empty
test route only because the game forbids it (explained above).

## Follow-up (not done here)

- p4-audio frame gap: the capture's frame counter repeats one 128-frame block
  on busy runs. Open a small card for the unreliable check (AGENTS rule 3): make
  the recorder count by audio time, or rerun a failed segment once. Not a game
  fault.
- The laptop's C: drive hit 0 bytes free during this work (old evidence folders
  of about 4.7 GB in several lanes, build folders, leftover browser profile
  folders in the Temp folder). The janitor should clear them.

## Claude's review (28 October 2026, night)

Approved (rule 18 written review of changed assertions). No game code changed. qualifying now waits for the asynchronous save that SAVE-RECORDS-IDB introduced; same check, longer wait for a real asynchronous write. rescue-view picks a side of the hiker where the rotor clears the trees; same views and checks. lap-telemetry buys track intel level 3 through the game's own buyIntel before checking the readout. track-kits leaves ardennes-beech out of free placement because it is placed by the forest itself. p4-audio: Grand Prix pay is live, so the clone's reward must be 0 and the native reward a non-negative whole number; the fields left out of the replay comparison are narrowed to the 14 the real settlement writes, each tied to an app.js line, so every other field is still compared. Nothing is loosened. The occasional p4-audio capture gap is card QA-P4-AUDIO-FRAME-GAP. Rerun 28 October: all five pass.
