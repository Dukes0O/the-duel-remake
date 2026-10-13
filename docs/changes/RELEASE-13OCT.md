---
task: RELEASE-13OCT
status: ready-for-release-gate
kind: release
flag: lap-choice, snowmen
player_facing: yes
---

# Release of 13 October 2026

Kyle approved this release in writing on 13 October 2026.

## Kyle's decision

"Lap choice should be totally flexible, from 2 up to 6 laps." Two switches go
from dev to on: `lap-choice` and `snowmen`. The yeti switch stays dev, and so
does every other switch that was not named.

- Race length: every Duel or Grand Prix race on a lap-choice event offers 2, 3,
  4, 5 and 6 laps, plus the event's own default if that is longer than 6.
  Arenas, the stunt trial, checkpoint rush, drift and chase events, time trial
  and wasteland still offer only their own fixed length.
- Pay: at or above the event's own default length the finishing pay is what it
  was before (the distance factor of one for each 8 km, never below the old
  pay). Below the default, the pay is the default's pay scaled by laps divided
  by the default, rounded to 5. That is why a shorter race now pays less, and
  why each extra lap from 2 to 6 pays more than the one before.
- Snowmen: the eight snowmen near the lodge on Tremblant Snow are now on. That
  course is already live, so players will see and hit them in the release.
  Summit Run also has snowmen, but that course is still dev, so they stay out
  of reach.

## What else the release carries

These were merged earlier and need no new work here.

- The on-foot mouse fix.
- The Ambush Alley opening fix.
- Grand Prix on the nine original circuits.

## Pay at the default length

Kyle asked on 12 October that rewards grow with course length, and the
lap-choice card says a default race over 8 km pays more. With lap choice on, a
race at its own default length therefore pays the old amount times
max(1, km / 8), rounded to 5, and never less than the old amount. Races
shorter than the default pay the default's amount scaled by laps over the
default. The multipliers at each event's default length:

| Event | Grand Prix (3 laps) | Duel (2 laps) |
| --- | --- | --- |
| Pacific Canyon | 1.50 | 1.00 |
| High Country | 1.80 | 1.20 |
| Harbor & Highlands | 1.65 | 1.10 |
| Ridge Rally | 1.32 | 1.00 |
| Eifel Crown | 2.10 | 1.40 |
| Alpine Serpent | 1.80 | 1.20 |
| Azure Riviera | 1.65 | 1.10 |
| Red Mesa | 1.50 | 1.00 |
| Neon Docks | 1.56 | 1.04 |
| Cloudbreak Skyway | 1.95 | 1.30 |
| Tremblant Woods (3 laps) | 1.67 | 1.67 |
| Tremblant Snow (3 laps) | 1.67 | 1.67 |
| Harbour Lights (4 laps) | 2.03 | 2.03 |
| Panorama Ridge (3 laps) | 1.82 | 1.82 |

`tools/test-grand-prix-existing.mjs`: the native Medium Grand Prix position pay
(Pacific Canyon, 12 km) was pinned at 1000, 750, 550 and so on. It is now
derived from the course's real length: the old amount times the multiplier from
`raceDistance`, rounded to 5, never below the old amount (1500 for first place).
No other pay assertion in that file changed.

## Changed code

- `src/lap-choice.js`: `LAP_CHOICES` is 2 to 6. `raceDistance` scales the pay
  factor for races shorter than the default. `distanceFinishingPay` may now pay
  less than the old amount, but only for a race shorter than the default.
- `src/feature-flags.js`: `lap-choice` and `snowmen` are `on`.
- `src/screen-leaderboard.js`: with 2 to 6 offered, the leaderboard's lap filter
  used the first offered length (2) when nothing was picked. It now starts at
  the event's own default length, so a fresh Grand Prix board shows 3 laps and
  Harbour Lights shows 4.

## Changed assertions (reviewed)

`tools/test-lap-choice.mjs` (541 assertions, up from the earlier count):

- The 5 and 10 lap cases become 4 and 6 laps (race-length loop, pay loop,
  records loop). Reason: 10 laps is no longer offered, 4 and 6 are.
- "Disabled switch ignores an explicit long race": 10 laps becomes 6.
- "Unapproved shorter/intermediate choices return the default" (4 laps) becomes
  "Unapproved choices (7 laps) return the default". Reason: 4 laps is now an
  approved choice. A one-lap check is added.
- "Never offer fewer laps than the authored default", `[6,10]` for a default of
  6, becomes `[2,3,4,5,6]`. A default of 8 gives `[2,3,4,5,6,8]`.
- Distance label example: 10 laps, 42.0 km, x5.25 becomes 6 laps, 25.2 km,
  x3.15 (same course length, an offered lap count).
- The invalid-finish case `{laps:4}` becomes `{laps:7}`. Reason: 4 laps is now
  a valid finish; 7 laps is not offered.
- Session choice, menu, results and leaderboard checks use 6 laps instead of
  10 (results text becomes 6 laps, 24.0 km, x3.00).
- Added checks: a Grand Prix (default 3) offers 2 laps; 2 laps on a default-3
  event pays less than the default and no more than two thirds of it before
  rounding to 5; pay rises step by step from 2 to 6 laps (100, 150, 200, 250,
  300 on a base of 100); excluded events (arena, stunt trial, checkpoint,
  practice, time trial, wasteland) are unchanged. Every other assertion is kept.

`tools/test-feature-flags.mjs`: lap choice and snowmen are expected `on`
instead of `dev` (the dev list keeps Snow, The Deep, Grand Prix career and the
yeti). The check's label now says so. The switch count (24 plus courses) is
unchanged.

`tools/test-wasteland-beta.mjs`: the pinned production switch table expects
`lap-choice: 'on'` and `snowmen: 'on'`.

`tools/test-snowmen.mjs`: `FEATURE_STATES.snowmen` is expected `on` instead of
`dev`.

`tools/test-grand-prix-existing.mjs`: three length checks pinned the old
"default length only" rule. Harbour Lights (4 laps): "three laps cannot
complete" becomes "seven laps cannot complete". Pacific four-lap "malformed"
checks become a positive check (four laps is offered) plus a seven-lap
malformed check for finish and records. Grand Prix: "two laps cannot complete"
becomes "two laps is now an offered length" plus "seven laps cannot complete".
Reason: Kyle's decision makes 2 to 6 laps valid on every lap-choice event.

`tools/test-grand-prix-podiums.mjs`: the invalid-request case `{laps: 2}`
becomes `{laps: 7}`. Reason: 2 laps is now valid for a Grand Prix.

`tools/test-race-settings.mjs`: with lap choice on, the menu choices for a Duel
event now carry the session's lap count, so four expected values gain
`laps: 2`. These are the fresh-player defaults, the new-player defaults, the
second player's setup (Harbor & Highlands, Duel) and the unavailable-storage
defaults. Time trial setups are unchanged. This follows directly from the
switch being on; no tolerance changed.

## Tests

Lane tier (`--changed --jobs 4`): 260 suites passed, 0 failed. `npm run build`
passed. Full tier and release evidence on the exact
release commit, run alone by the Release Manager.

## Removed

Nothing yet. The `lap-choice` and `snowmen` switches, and their off paths,
come out with the switch clean-up once this release settles.
