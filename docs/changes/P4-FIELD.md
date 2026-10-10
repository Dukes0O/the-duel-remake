# P4-FIELD: racing a full field

Claude (Sonnet agent), 10 October 2026. Design: `docs/CIRCUITS.md` section 3.2.
Switch: `grand-prix` (dev). Preview list in `start-preview.bat` includes it.

## What it does

A Grand Prix race on Pacific Canyon: you and up to seven computer racers on a
closed road with no traffic, police or radar, three laps.

- **The field.** Mara Vale, Iko Ren, Sana Marlow, Jules Reyes, Nia Frost and
  Boone Ward, plus Dex Calloway, the filler racer; Axel Storm takes his place on Hard.
  Each drives a car near yours: its pace on the circuit (`performanceIndex`,
  average speed on the racing line) is within 10% of yours, Easy from the slower
  half, Hard from the faster half. A racer's pace is then evened to your car's
  (`FIELD.carPaceShare`), so the characters decide the race and not the car.
- **Grid and start.** Two by two, 8 m between rows, the right-hand car 4 m
  further back. You start 5th (Easy), 6th (Medium) or 8th (Hard). Five red
  lights, one a second, then dark after a seeded 0.4 to 1.2 s. The cars do not
  run before the lights go out, so throttle does nothing (no jump start). The
  computer racers leave after a seeded reaction time.
- **Driving.** Each racer follows a racing line (`src/race-lines.js`, or the
  course's own `racingLine` when it has one) at its own pace. Characters: Mara
  brakes latest and is quick in slow corners, Iko seldom errs, Sana is fastest on
  straights and uses the tow best, Jules starts best and is keenest on lap one,
  Nia loose-surface grip (stored for the surface card), Boone defends,
  Axel is the one to beat. Seeded small mistakes (a lift, a missed apex) except on
  Hard; the Easy leader makes more.
- **Racing rules.** A faster car close behind a slower one on a straight pulls
  out beside it with room and brakes later into the next corner; one move at most
  to cover the inside before a braking zone, never once the attacker is alongside;
  cars alongside keep their side through a corner and nobody turns into another;
  the follower slows to stay clear of the car ahead.
- **Slipstream.** Within 30 m behind a car and 2.5 m to the side, top speed rises
  5% and acceleration a little. The tow builds over 0.8 s and fades in 0.4 s. It
  works for you too; the HUD shows a TOW marker.
- **Catch-up.** None on Hard. Medium: a racer more than 8 s ahead of you eases off
  2%. Easy: 4%.
- **Screens.** Position (P3 / 8), lap, final-lap call, gaps to the cars ahead and
  behind, running order on the left, five start lights, tow marker, every car on
  the map, and a results table (names, cars, gaps, best laps).
- **Crashes.** Grand Prix crashes use the ordinary crash physics, but cost the
  time you lose and nothing else: no life, no 30 s penalty. Decision for Claude to
  confirm.

## Sound cues and events for P4-AUDIO

`startLight` (n), `go`/`lightsOut`, `positionGain`, `finalLap`, `fieldCrash`,
`opponentFinished`. Tow is `state.field.tow` (0 to 1).

## Hooks outside the card's named files

Small changes, all behind `state.field` (set only in a Grand Prix) so other modes
are untouched: `src/sim-contacts.js` (computer racers share the road on equal
terms, no "yield to the player" rewind), `src/sim-crash.js` (recoverable, no
penalty), `src/sim-driving.js` (tow), `src/screen-menu.js` (the Grand Prix
button, shown only when available), `src/app.js` (availability, a fresh field seed
per run, no pay or active-race mark yet). New files: `src/race-field-driver.js`
and `src/screen-field.js`.

## Racer paint (small change in `src/render3d.js`)

Every racer has its own paint colour and accent (`paint` on the racer, copied to
the computer car). `render3d.js` now paints the rival and the extra computer cars
from `actor.paint` when it is there and keeps the old grey and copy colours
otherwise. The vehicle builder already took a colour option, so no paint code
changed. The renderer remakes a car if its paint changes.

## Hook files beyond the card's named list (approved by Claude)

`src/sim-contacts.js`, `src/sim-crash.js`, `src/sim-driving.js`,
`src/screen-menu.js`, `src/app.js`, plus `src/render3d.js` for paint. Two new
files not in the card's list: `src/race-field-driver.js` and `src/screen-field.js`.

## Tests and checks

TO FILL IN AFTER THE GATES: lane tier, full tier (alone, `--jobs 4`), build and
the browser scenario `grand-prix` with frame pacing.

`node tools/test-race-field.mjs`: 1235 checks pass (grid, start lights, no jump
start, passing, defending, corner sharing, slipstream, catch-up, repeatability,
results).

## Balance (`node tools/race-field-balance.mjs`, 30 seeded races per difficulty, Pacific Canyon, scripted driver as you)

Final run (30 races per difficulty, seeds in `tools/race-field-balance.mjs`):

| | Easy | Medium | Hard | Target |
| --- | ---: | ---: | ---: | --- |
| You win | 73% | 43% | 17% | 60-80 / 30-50 / 10-25 |
| Racers that finish | 100% | 100% | 100% | at least 95% |
| First-lap pile-ups | 0 of 30 | 0 of 30 | 0 of 30 | at most 1 in 20 |
| Passes between computer racers per race | 5.0 | 3.5 | 3.6 | at least 3 on Medium |

Pace per difficulty (`FIELD_TUNING`): Easy 0.842, Medium 0.893, Hard 0.882, as a
share of what the car can do; Hard has no mistakes or catch-up and Axel Storm is a
touch faster still. The scripted driver itself laps at about 93% of the limit.
The Hard win rate is sensitive: half a percent of pace moves it between 7% and 23%.

## Frame cost with eight cars

Eight detailed cars roughly doubled the draw calls at first. Two fixes: the
Falcone Heritage and the Aurora models are more than three times as heavy as the
others, so the computer racers drive the lighter road cars only (Falcone F42,
Stuttgart 959-S, Dusthawk, Banshee, Viper); and in a Grand Prix a car more than
140 m from the camera stops casting a shadow (`render3d.js`, Grand Prix only).

Browser scenario `grand-prix`, 1280x720, nothing else heavy running, 120 frames
each, the same scenario measured against an ordinary two-car Duel:

| Quality | Cars | p50 | p95 | Frames over 33 ms | Draw calls | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| High | 2 | 16.7 ms | 16.8 ms | 0 | 563 | 1.97 M |
| High | 8 | 16.7 ms | 16.8 ms | 0 | 693 | 1.42 M |
| Performance | 2 | 16.7 ms | 16.8 ms | 0 | 461 | 1.65 M |
| Performance | 8 | 16.7 ms | 16.8 ms | 0 | 433 | 0.88 M |

The scenario also checks the start lights, the eight-car grid, the running order,
no police or radar on the HUD, and the results table.

## Changed assertions

`tools/test-feature-flags.mjs`: the switch count 17 to 18 (the new `grand-prix`
switch). No other assertion changed.

## Removed

Nothing removed; nothing is replaced.

## Open

- Pay and records by position, and ghosts, belong to P4-CAREER; a Grand Prix
  settles nothing yet.
- Racer colours: all computer cars use the existing two copy colours, since
  `render3d.js` is outside this card. A colour per racer is a small later change there.
- Other circuits join with P4-GP-EXISTING (add ids to `GRAND_PRIX_COURSES` and
  re-run the balance tool per circuit).
