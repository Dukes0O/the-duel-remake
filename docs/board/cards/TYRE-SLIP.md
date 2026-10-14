# TYRE-SLIP

The short board entry controls current state, ownership, dependencies and locks.
This file holds the settled design, the numbers, the tests and the acceptance.

## Kyle's decision (14 October 2026)

"Sliding should cost grip, like real tires." From the storyboard: grip peaks
at a small slide and drops beyond it, so a long screech means lost time, as in
real life. Every race will feel a little different, the drift trial needs
retuning, and saved race replays need checking again. Because it changes how
every race drives, it gets its own design card and one review before it is
built. The first driving lesson (brake in a straight line before a sharp
corner) depends on it; the lesson itself is a separate story card that waits
for Kyle.

## Before any code: one independent review of the numbers

The board entry carries `waiting_on: claude` until one reviewer who did not
write this card checks the numbers in sections 2 to 6 against the code (the
worked tables below are reproducible from the formulas) and records CLEAR or
the changes here. Codex starts only after that line is written.

## 0. What the game does today (checked on integration 82c0f7bb)

- Cornering is a yaw rate. `steeringYawAuthority` (`src/config.js:199-215`)
  takes the smaller of a steering limit (`DRIVE.yawRate` 1.35 rad/s, scaled
  by rolling speed and a high-speed taper) and a tyre limit
  (`DRIVE.maxLateralAccel` 30 m/s², about 3 g, times grip and traction,
  divided by speed). In `_drive` (`src/sim-driving.js:213-216`) the steering
  input is a share of that smaller limit. Full steering at speed is exactly
  the tyre limit, so a car can never ask for more grip than it has, and going
  too fast simply runs wide with no speed cost until the dirt or a wall.
- `s.slipAngle` (`src/sim-driving.js:219-222`) is drawn from steering and
  speed only: `-steerVisual × clamp((mph−38)/85) × (.21 road, .25 graded
  gravel, .31 off-road) × (1 + .6 × brake)`. It never feeds back into yaw or
  speed. `drifting` is `|slipAngle| > .075` above 40 mph. It is read by drift
  scoring, the squeal and road-scrub sounds, smoke and skid marks, the drawn
  car and camera, ghosts, police and collision footprints (contacts use
  heading plus slip, so slip already reaches race state through contacts).
- The squeal (`src/audio.js:1282-1297`) rises from slip, from steering times
  speed and from braking times speed, so hard steering or hard straight-line
  braking screech whether or not anything slides.
- Braking is `DRIVE.brakeAccel` 52 × car braking × surface grip mph/s and
  does not share grip with cornering.
- Keyboard steering (`src/keyboard-steering.js:10-13`) is capped by speed:
  full up to 40 mph, 60% at 120 mph. So today a held key at speed reaches only
  60% to 95% of the tyres' grip.
- Computer racers never run `_drive`. The Duel rival (`src/sim-rival.js`),
  the Grand Prix field (`src/race-field-driver.js`, `src/race-lines.js`),
  police and arena CPUs move on their own paths with a speed target and a yaw
  rate clamped to `steeringYawAuthority`. They have no slip.
- The player autopilot (`src/app.js` `_driveAutopilot`, about 1507-1564)
  does run `_drive`: steer = desired yaw ÷ `steeringYawAuthority`, corner
  speed 85% of `sqrt(30 × grip / bend)`. It drives reference laps, track
  review, feel-lab, combat balance, the race-field balance player and the
  drift-trial test. Several tools and tests copy the same formula.
- Replays record final steer, throttle and brake values, not keys, so the
  keyboard adapter is not in them. Replay tests fix their switches in code
  (`tools/legacy-roadside-duel.mjs` `PRE_RELEASE_FLAGS`); any other switch
  follows the catalog, so a `dev` switch is off in every replay.
- Player saves hold no input replays. Ghosts hold poses (time, position,
  heading including slip, speed), not inputs, so they never re-simulate.
  Best times and ghosts carry no physics version.

## 1. The idea in plain words

A tyre grips best when it slides a little. Below that point, turning harder
gives more grip. Past it, the tyre slides: it grips less, the car runs wide,
and the sliding rubs off speed. The screech you hear is the slide: a short
soft squeal means you are right at the limit, a long loud screech means you
asked for more than the tyres had and you are losing time.

What makes the tyres slide is how much turning the driver asks for compared
with how much grip the tyres have at that speed. Entry speed sets how much a
corner needs (a corner needs four times the grip at twice the speed), so a
car that arrives too fast forces the driver to ask for more than the tyres
have. Braking hard while turning also uses up some grip, so braking late into
the corner makes the slide worse. Brake in a straight line, turn in at the
right speed, and the tyres stay at their best.

Nothing gets faster than today: the most a tyre can grip is today's limit.
Sliding is now slower than today; clean driving is the same as today.

## 2. The grip curve (settled numbers)

All new numbers live in one new `TYRE_SLIP` table in `src/config.js`. The
existing `DRIVE` constants and `steeringYawAuthority` do not change, because
`src/course.js:94-95` builds authored racing lines from them and the rivals
clamp their yaw with them.

Terms, per fixed 120 Hz step, road races only (section 7 lists exclusions):

- `v` = speed in m/s, at least 8 (as today).
- `brakeShare` = `sqrt(1 − (0.6 × brake)²)`. Full brake leaves 80% of the
  cornering grip; half brake leaves 95%.
- `peakYaw` = `30 × steeringGrip × traction × brakeShare / v`: today's tyre
  limit, reduced while braking. `steeringGrip` and `traction` are exactly the
  values `_drive` passes today (car grip, arsenal grip effect, surface and
  tyre grip, mud).
- `steerGain` = `min(steeringLimit, H × peakYawUnbraked)`, where
  `steeringLimit` is today's first limit (rolling speed, high-speed taper,
  low-speed assist) and `H` = **1.25**. This is the yaw that full steering
  asks for. Braking does not change it, so braking never changes how
  sensitive the steering is.
- `demandYaw` = `|steerVisual| × steerGain`.
- `ask` = `demandYaw / peakYaw`: how much the driver asks for, as a share of
  the tyres' best grip. 1.0 is the peak.
- `slip` (new state `s.tyreSlip`, a number, 0 at rest) follows `ask`:
  `slip += (ask − slip) × (1 − exp(−rate × dt))`, rate **12/s** when rising,
  **8/s** when falling (the tyre takes about a tenth of a second to build or
  shed a slide). The target is 0 while reversing, airborne, in a knock, or
  under 15 mph.
- Grip share `g(slip)` = `1 − (1 − slideGrip) × clamp((slip − 1) / W, 0, 1)`,
  with `W` = **0.25**. Grip is full up to the peak, falls in a straight line
  to `slideGrip` at slip 1.25 and stays there.
- Delivered yaw = `sign × min(demandYaw, g(slip) × peakYaw)`. Below the peak
  the car turns exactly as asked. Past it, the car turns less than at the
  peak and runs wide. Today's yaw smoothing (`DRIVE.yawResponse` 22) still
  follows this target.

| | Casual | Pro |
|---|---|---|
| `slideGrip` (grip left in a full slide) | 0.90 | 0.82 |
| Speed rubbed off in a full slide | 8 mph/s | 14 mph/s |

Worked values (Pro, Casual in brackets):

| slip | grip share | speed rubbed off |
|---|---|---|
| 1.00 | 1.000 | 0 |
| 1.05 | 0.964 (0.980) | 2.8 (1.6) mph/s |
| 1.10 | 0.928 (0.960) | 5.6 (3.2) mph/s |
| 1.25 and above | 0.820 (0.900) | 14 (8) mph/s |

For scale, full braking is 52 mph/s, so a full slide costs about a quarter of
full braking, on top of running wide.

Where slip can come from, asphalt, grip 1 (full steering, no brake):

| mph | today's full-steer share of grip | `ask` at full steering |
|---|---|---|
| 40 | 0.80 (steering limited) | 0.80 |
| 50 | 1.00 | 1.01 |
| 60 | 1.00 | 1.21 |
| 80 and above | 1.00 | 1.25 |

So on dry asphalt nothing slides below about 50 mph; on snow (grip 0.7) and
ice the tyre limit arrives at lower speed, so slides start earlier, as they
should. With full brake, `ask` at full steering rises to 1.56 at speed: a full
slide.

## 3. Braking while turning, speed loss, throttle

- **Braking shares grip** one way, through `brakeShare` above. Braking force
  itself stays as today (it already scales with surface grip). Reason: the
  lesson is "brake in a straight line"; the cost of braking while turning is
  less cornering grip, which is the real effect a driver feels.
- **Speed loss while sliding:** forward speed falls by `scrub ×
  clamp((slip − 1) / W, 0, 1) × dt`, `scrub` from the table, on the main road
  and graded gravel only, wheels on the ground, above 15 mph. Off-road keeps
  its own existing scrub and speed limit, with no extra slide cost, so a car
  that has already run onto the dirt is not punished twice.
- **Throttle** does not share grip in this card (no power slides). Named as
  out of scope, not forgotten.

## 4. How the slide is drawn, scored and heard

The drawn slip angle now comes from the real slide, so what you see and hear
is what costs time.

- **Drawn slip angle** target: `sign(−steerVisual) × A(slip)`, with `A`
  joining these points in straight lines: (0, 0), (0.9, 0.045),
  (1.0, 0.075), (1.25, M), flat beyond; `M` = .21 road, .25 graded gravel,
  .31 off-road (today's maxima). Today's smoothing (13 or 7 per second) and
  the `drifting` rule (`|slipAngle| > .075` above 40 mph) stay, so `drifting`
  now means "past the peak". The old speed factor and the `1 + .6 × brake`
  factor are not used with the switch on; braking reaches the slide through
  `brakeShare`.
- **Smoke and skid marks** (`src/effects.js`) need no change: they already
  follow `drifting` and `|slipAngle| > .075`, which now means a real slide.
  Skid marks from hard braking stay as today.
- **Collision footprint** keeps reading heading plus slip angle. Its range is
  unchanged (same maxima), but its values follow the new slip.
- **Sound** (no new cue, no `sound-bank` change). The existing
  `vehicle.tires` loop (`src/sound-bank.js:318-322`) is driven only by the
  slide: `rawSlip = clamp((slip − 0.9) / 0.35, 0, 1)` replaces both of
  today's terms (steering times speed, and braking times speed). Today's
  smoothing, the `(x − .08) / .92` mapping, the smoothstep, gain `× .4`,
  pitch and filter formulas stay. Resulting loop gain: 0 below slip 0.9;
  about 0.05 at the peak (a short soft squeal that says "at the limit");
  0.22 at slip 1.10; 0.40 in a full slide. So a long loud screech means
  speed is being lost every moment it lasts. Straight-line braking is quiet
  (these cars' brakes do not lock), which is also the sound of doing the
  lesson right. The `vehicle.road` scrub layer already follows slip angle
  and needs no change. Loudness ceiling is unchanged, so `audio-mix` is not
  touched.
- **HUD**: the existing DRIFT callout follows `drifting` and needs no change.

## 5. Keyboard feel (road races only; arenas unchanged)

A tap turns the car exactly as much as today. A held key keeps building at
today's rate past today's ceiling, up to a little past the tyres' best grip,
so holding the key too long into a corner makes the tyres squeal and slide.

In shares of the tyres' best grip on dry asphalt (`u`), with today's
`ramp(t)` = 0.30 rising by 0.70 every 0.45 s, today's speed cap `kcap(v)`,
`Q(v)` = today's full-steer share from the table above, and `R(v)` = the new
`ask` at full steering:

- `u(t) = ramp(t) × kcap(v) × Q(v)`, but the ramp no longer stops at 1.
- Ceiling `C(v)` = `min(1.10, kcap(v) × Q(v) + bonus(v))`, where `bonus` is
  0.30 up to 80 mph, falling in a straight line to 0 at 120 mph.
- The steering value sent to the race is `min(u, C) / R(v)`, never above 1.
  Taps and releases behave exactly as today (fresh ramp per direction,
  instant release, reset hooks unchanged). Throttle is unchanged.

| mph | today, held key | new ceiling | time to reach the peak | tap (as today) |
|---|---|---|---|---|
| 40 | 0.80 | 0.80 (identical) | never | 0.24 |
| 60 | 0.90 | 1.10 | 0.52 s | 0.27 |
| 80 | 0.80 | 1.10 | 0.61 s | 0.24 |
| 100 | 0.70 | 0.85 | never | 0.21 |
| 120 | 0.60 | 0.60 (identical) | never | 0.18 |

Below 40 mph the keyboard is byte-identical to today. Above 100 mph a held
key alone does not slide on dry asphalt, but braking while holding it does
(at full brake 0.85 becomes 1.06 of the reduced grip), which is the late
braking the lesson is about. `R(v)` uses dry asphalt and grip 1 so the adapter
needs only speed, as today; on snow the same key asks for more of the smaller
grip and slides sooner, which is right.

**Gamepad:** the stick is a share of `steerGain`, so from 50 mph the stick
grows more sensitive than today, reaching 25% more from about 65 mph: there
80% stick gives today's full turn,
and the last 20% of travel is past the peak. This is the price of letting a
driver ask for more than the tyres hold. Kyle and Gratian judge it in play;
a stick curve is a follow-up only if they ask.

## 6. Computer racers, autopilot and test drivers

- **Rivals, the Grand Prix field, police and arena CPUs are untouched**, byte
  for byte. They already drive at or below the tyre limit (Hard corners at
  100% of it) and never slide. Since the best a tyre can grip does not
  change, a player who drives perfectly is exactly as fast as today: rivals
  cannot lose races they won against a perfect driver. A player who slides
  now loses more, which is Kyle's decision.
- **One helper for every driver that steers the player's car:**
  `steerForYaw(desiredYaw, {speedMph, grip, traction, car, course, brake,
  tyreSlip})` in `src/config.js`. Switch off: it returns exactly today's
  `clamp(−desiredYaw / max(.05, steeringYawAuthority(...)), −1, 1)`. Switch
  on: it divides by `steerGain` and never asks for more than the peak
  (`ask` ≤ 1.0, braking included), because these drivers know the limit.
  Replace every copy of the formula with the helper in the same change:
  the App autopilot, `tools/track-script-drive.mjs`, the combat-balance
  pursuit wrapper (`tools/combat-balance.mjs` about 392),
  `tools/race-field-balance.mjs` about 180, `tools/benchmark-shortcut-pace.mjs`,
  and the test copies in test-opponents, test-stunt-trial, test-jump-distance,
  test-jump-height, test-ufo-landing, test-circuit-summit and
  test-summit-avalanche. With the switch off each replacement must be
  byte-identical, so no existing pin moves.
- **Drift events:** in a `kind: 'drift'` event, the autopilot's ceiling is
  `ask` ≤ **1.12** in corners above 45 mph (it drifts on purpose; at 1.12 it
  scores and loses about 6.7 mph/s Pro while sliding). Everywhere else 1.0.

## 7. Where it applies

- Road races: Duel, Grand Prix, Time Trial, the circuits, Wasteland road
  duels, the drift trial, hidden road and The Deep sea floor (its grip and
  turning drag feed the same terms).
- Not in arenas (`course.def.venue === true && course.def.arena === true`,
  the predicate `steeringYawAuthority` already uses): today's path exactly,
  so the Scrapdome keeps its sharp handling and combat arenas are unchanged.
- Not on foot, not during a crash knock (unchanged), not airborne.
- `s.tyreSlip` resets to 0 everywhere `slipAngle` resets today (game.js:341,
  sim-crash.js:183 and 235, arena-event.js:88-89, convoy-raid.js:126,
  combat-weapons.js:162, hidden-road-journey.js:137, deep-journey.js:180).

## 8. The switch and repeatability

- New switch `'tyre-slip': 'dev'` in `src/feature-flags.js` (not a circuit
  line, so no `circuit-registry` lock).
- Read once when a race starts and kept in race state (`s.tyreSlipRules`,
  true or false), so turning the experimental setting on mid-race cannot
  change the rules of a race in progress. `_drive`, the keyboard adapter, the
  autopilot and the squeal read that value, never the switch directly.
- All new math is plain arithmetic on race state at the fixed 120 Hz step,
  no randomness, no frame time. Same seed and inputs give the same race at
  30, 60 and 144 FPS.
- **Switch off:** every existing replay, combat replay, course replay, world
  signature and salt-flats pin is byte-identical. Not one fixture is
  re-recorded in this card.
- **Switch on:** the card's own fixture `tools/replays/tyre-slip.json` pins
  fingerprints for three cases (a classic Duel stage with the recorded
  inputs, Harbour Lights, Tremblant Snow), each at 30, 60 and 144 FPS, three
  runs each, all equal. Changing it later is a changed assertion to review.
- **World signatures** do not depend on driving and `DRIVE` is untouched, so
  they cannot move.
- **Saved replays:** players have none (ghosts are poses). Old ghosts and best
  times stay valid and beatable, since the best grip is unchanged. Old drift
  trial scores were set under the old rules; they stay (never discard player
  data) and the release note says so.

## 9. Neon Drift Trial retune

Today: targets easy 3500, medium 5000, hard 6000 points; time limits 150,
125 and 110 s (`src/config.js:131`). Under the switch drifting is real
sliding that costs time, so both move. The method, not a guess:

1. Run the App autopilot on Neon Drift Trial (Banshee, seeds 1989, 1990,
   1991, 1992, 1993; 30 and 144 FPS; each CPU level; Casual and Pro) with
   the switch off and on. Record median score and finish time.
2. New target = old target × (median score on ÷ median score off), rounded
   down to 100. New time limit = old limit × (median time on ÷ median time
   off), rounded up to 5 s.
3. Put them beside the old ones as `driftTrial.tyreSlip: {targets,
   timeLimitSec}` and read both through one helper `driftTrialRules(stage,
   tyreSlipRules)` in `src/config.js`, used by every reader of
   `driftTrial.targets` or `timeLimitSec` (game.js objective, sim-results,
   progression win check, leaderboard if it reads them).
4. Drift scoring (`src/drift-scoring.js`) keeps every constant. Its minimum
   slip (.075) now sits at the peak and its maximum (.42) is above every new
   maximum, so it needs no change.

Acceptance: `tools/test-drift-trial.mjs` passes unchanged with the switch
off, and an added switch-on run of the same cases (autopilot wins cleanly at
every level on Casual and Pro; the one-crash run wins Easy and Medium and
times out on Hard) passes with the new numbers.

## 10. Owned files and hooks

Owns:
- `src/config.js`: new `TYRE_SLIP` table, `steerForYaw`, the grip-curve
  helpers, `driftTrialRules`, Neon's `tyreSlip` targets. `DRIVE` and
  `steeringYawAuthority` stay byte-identical.
- `src/sim-driving.js`: the steering, slip and scrub block of `_drive`.
- `src/keyboard-steering.js`: the switch-on road curve (section 5).
- `src/feature-flags.js`: the one switch line.
- `tools/test-tyre-slip.mjs` (new), `tools/replays/tyre-slip.json` (new),
  `docs/changes/TYRE-SLIP.md`.

Hooks (named lines only, byte-identical with the switch off):
- `src/app.js`: keyboard adapter construction, `_driveAutopilot` steering
  through `steerForYaw` and the drift ceiling.
- `src/game.js`: latch `s.tyreSlipRules` at race start, reset at :341, the
  drift objective read.
- `src/audio.js` about 1282-1291: the squeal input.
- The slip reset lines listed in section 7; `src/sim-results.js`,
  `src/progression.js` and `src/leaderboard.js` drift-target reads.
- The tool and test copies of the stock steering formula listed in section 6;
  `tools/test-drift-trial.mjs` (add switch-on cases, change nothing else);
  `tools/race-field-balance.mjs` and `tools/combat-balance.mjs` gain a
  `--flags` pass-through only if they lack one.

Locks: `busy-game-files` (app.js, game.js). No `sound-bank`, `surfaces`,
`save-shape`, `circuit-registry`, `replay-fixtures` or `release`.

## 11. Tests (in `tools/test-tyre-slip.mjs`, written first)

1. Grip curve: `g` and scrub at slip 0.5, 1.0, 1.05, 1.1, 1.25, 1.6, Casual and
   Pro, against the table to 1e-12; `brakeShare` at brake 0, .5, 1.
2. Real `Duel`, flat straight, switch on, Pro:
   - 100 mph, steer 0.7: `ask` 0.875, slip settles below 1, no speed lost to
     sliding, yaw equals `0.7 × steerGain`.
   - 80 mph, steer 1.0: slip reaches 1.25 within 0.5 s, yaw settles at
     `0.82 × peakYaw`, speed loss per step equals the formula.
   - Same at Casual with 0.90 and 8 mph/s.
   - Steer from 1.0 to 0.75 at 80 mph: slip below 1.0 within 0.25 s.
   - 30 mph full steer on asphalt: slip stays below 1, no loss.
   - Snow (grip 0.7): slip passes 1.0 at a lower speed than on asphalt.
   - Full brake plus full steer at 100 mph: slip at least 1.25.
3. Switch off: `_drive` output, `steerForYaw`, the keyboard adapter and the
   squeal input equal today's formulas over a grid of speeds, grips, brake
   and steer values (exact).
4. Arena: a Scrapdome run is byte-identical with the switch on and off.
5. Rivals: a CPU-only race hash is identical with the switch on and off;
   Grand Prix field positions identical over 60 s with a neutral player.
6. Repeatability: the three pinned switch-on fingerprints at 30, 60 and
   144 FPS, three runs each.
7. Keyboard: tap yaw identical to today at 60, 80 and 120 mph; ceilings and
   peak times from the table; identical below 40 mph; arena keyboard
   identical; throttle identical.
8. The lesson, on Harbour Lights' Lantern Hairpin with the line driver:
   "early" brakes to the planned corner speed before turn-in; "late" brakes
   25 m later and asks for full steering through the turn. Switch on: early
   is at least 0.25 s faster over the stretch from 60 m before turn-in to
   80 m past the apex, and late shows slip above 1.0 for at least 0.5 s. Both
   numbers are also recorded with the switch off, for the change note only.
9. Squeal: loop gain 0 below slip 0.9, about 0.05 at 1.0, 0.40 at 1.25 and
   above; no squeal from straight-line full braking at 100 mph.

Existing suites must pass unchanged with the switch off: test-replays,
test-combat-replays, test-world-composition, test-keyboard-steering,
test-drift-trial, test-drift-scoring, test-reference-laps, src/test.js (its
"fast corner develops visible rear slip" check is switch-off behaviour).

## 12. Acceptance (switch on versus off, same seeds, recorded in the change note)

- **Lap times per course**, App autopilot, the reference-lap policy
  (`node tools/build-reference-laps.mjs --event=ID --probe`, writing nothing):
  every course within −0.5% to +1.5% of switch off; snow and ice courses
  within −0.5% to +3%. The autopilot corners at 85% of the limit, so a bigger
  change means a fault, not tuning.
- **Line driver** (`tools/track-script-drive.mjs`, each circuit): within
  −0.5% to +2%, with no new wall contact or off-road excursion.
- **Keyboard-shaped lap** on Harbour Lights (the FIX-DRIVING-FEEL recipe:
  line driver targets turned into real key presses): completes, no stuck
  period of 1 s or more, lap within −2% to +4% of switch off. Faster by more
  than 1% means keyboard players gained from the higher ceiling: report it to
  Claude, do not tune it away.
- **Rival win rates**: `node tools/race-field-balance.mjs --check` passes
  with the switch on, and the player's win rate per difficulty is within
  5 points of switch off on the same seeds.
- **Combat balance**: `node tools/combat-balance.mjs --check` passes with the
  switch on (current rules), win rates within 5 points of switch off.
- **CPU-only fingerprints** unchanged (test 5).
- Lane tier, build, one independent review of the frozen change. The full
  check covers the browser scenarios and frames as usual. Kyle and Gratian
  judge the feel in play; live only at a release on Kyle's "go live".

## 13. Removed

Nothing is removed while the switch is `dev`. The release that turns
`tyre-slip` on (Release Manager, release batch) removes in the same change:
the old cosmetic slip formula in `_drive`, the steering-times-speed and
braking terms of the squeal, the old road keyboard ceiling, Neon's old
targets and time limits and `driftTrialRules`' old branch, the switch-off
branch of `steerForYaw`, and finally the switch line. That release
re-records the replay, combat and course fingerprints, the salt-flats hash
of `expected-fingerprints.json` and every reference lap from their recipes,
with this card named as the reviewed reason.

## 14. Risks named

- Gamepad steering is up to 25% sharper above 50 mph (section 5).
- The rivals measure against the autopilot, which never slides, so the
  balance tools show little change; how human races feel is judged in play.
- Keyboard players can reach more of the grip between 50 and 100 mph than
  today. That is part of the change; the keyboard lap acceptance watches it.
