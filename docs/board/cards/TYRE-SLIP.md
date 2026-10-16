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

**Review, 14 October 2026 (independent reviewer, integration e4617818):
CHANGES NEEDED, then applied in this file.** Every number in sections 2, 4,
5, 6 and 9 reproduced (grip and scrub tables, `ask` .80/1.006/1.207/1.25,
`brakeShare` .80/.954 and 1.5625, squeal gain .051/.221/.400, keyboard
columns, tap yaw equal to today, 1.0625 at 100 mph full brake, 6.72 mph/s
at 1.12, Neon numbers). Section 0 facts and the lock list confirmed. Four
real errors were corrected: the snow claim (sections 2, 5, test 2), the
autopilot not drifting on its own (sections 6, 9), the Titan events not
covered by the arena test (section 7), and two test thresholds that could
not pass (section 11). Smaller points folded in: gamepad from 62 mph, squeal
wording, exact switch-off rules, new state fields and whole-state hashes,
the reset list, more slip readers, the "nothing gets faster" sentence, the
autopilot on snow, and its shoulder swerve. With these corrections the
numbers are CLEAR to build.

## 0. What the game does today (checked on integration 82c0f7bb; lines unchanged at e4617818)

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
  heading plus slip, so slip already reaches race state through contacts),
  traffic yielding (`npc-yielding.js:6`), car-to-car contact
  (`sim-contacts.js:480`), weapon and hazard hits (`arsenal/hazards.js:40`,
  `combat-projectiles.js:129`), the sound's direction (`audio.js:69`) and the
  driver's head turn (`render3d.js:590`).
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

The car itself gets no faster than today: the most a tyre can grip is
today's limit. Sliding is now slower than today; clean driving is the same as
today. One exception is on purpose: on the keyboard a held key can now reach
the full grip between 50 and 100 mph, where today it stops at 70% to 95%
(section 5), so a keyboard player who drives cleanly can corner a little
harder than before.

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

So nothing slides below about 50 mph from steering alone. This `ask` at full
steering is the same on every surface, because the steering limit and the
tyre limit both scale with grip and traction. What changes on snow (grip 0.7)
and ice is the corner: a given corner at a given speed needs more of the
smaller grip, so the driver reaches the peak at a lower corner speed and
slides sooner when coming in too fast, as on a real snowy road. With full
brake, `ask` at full steering rises to 1.56 at speed: a full
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
  slide: `rawSlip` is exactly `clamp((slip − 0.9) / 0.35, 0, 1)`. All of
  today's `rawSlip` expression goes: the slip angle times 4.3 and steering
  times speed (both in its first term, `audio.js:1286`) and braking times
  speed. Today's smoothing, the `(x − .08) / .92` mapping, the smoothstep,
  gain `× .4`, pitch and filter formulas stay. Resulting loop gain: 0 up to
  slip 0.93;
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
  With the switch off, and with it on below 40 mph, the adapter runs today's
  exact code path (dividing and multiplying back is not always exact in
  floating point).
  Taps and releases behave exactly as today (fresh ramp per direction,
  instant release, reset hooks unchanged). Throttle is unchanged.

| mph | today, held key | new ceiling | time to reach the peak | tap (as today) |
|---|---|---|---|---|
| 40 | 0.80 | 0.80 (identical) | never | 0.24 |
| 60 | 0.90 | 1.10 | 0.52 s | 0.27 |
| 80 | 0.80 | 1.10 | 0.61 s | 0.24 |
| 100 | 0.70 | 0.85 | never | 0.21 |
| 120 | 0.60 | 0.60 (identical) | never | 0.18 |

Below 40 mph the keyboard is byte-identical to today (today's code path).
Tap yaw at higher speeds equals today's within rounding (1e-12). Above 100 mph a held
key alone does not slide on dry asphalt, but braking while holding it does
(at full brake 0.85 becomes 1.06 of the reduced grip), which is the late
braking the lesson is about. `R(v)` depends only on speed (section 2: it is
the same on every surface), so the adapter needs only speed, as today, and is
exact on snow and ice too.

**Gamepad:** the stick is a share of `steerGain`, so from 50 mph the stick
grows more sensitive than today, reaching 25% more from 62 mph: there 80%
stick gives today's full turn, and the last 20% of travel is past the peak. This is the price of letting a
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
  byte-identical, so no existing pin moves: each site passes exactly the
  arguments it passes today (several omit `car`: test-opponents.mjs:165,
  test-stunt-trial.mjs:56, test-ufo-landing.mjs:43,
  benchmark-shortcut-pace.mjs:28; none pass `course` or the arsenal grip).
  The autopilot's one-off shoulder swerve (`app.js` about 1524, `steer: 1`)
  also goes through the helper, so it cannot slide with the switch on.
- **Autopilot on snow:** its corner speed ignores surface traction
  (`app.js` about 1558), so on snow it already corners at about 103% of the
  grip. With the switch on it will run a little wide there. That is known
  and covered by the wider snow band in section 12; QA-STOCK-SNOW is the card
  that fixes its corner speed.
- **Drift events: the autopilot drifts on purpose.** A ceiling alone is not
  enough: the review ran today's autopilot on Neon (medium, Pro, seed 1989)
  and its switch-on `ask` passed 1.0 in only 503 of 11,795 steps (highest
  1.065), so it would barely score. In a `kind: 'drift'` event, through every
  corner taken above 45 mph, the autopilot holds `ask` at **1.12** (yaw then
  `g(1.12) × peakYaw`, Pro 0.914 of the peak) and sets its corner speed so
  that slide follows the line: `sqrt(g(1.12) × 30 × grip / bend)`. It keeps
  its line with throttle and brake, never by dropping `ask` below 1.0
  mid-corner. At 1.12 it loses about 6.7 mph/s Pro while sliding.
  Everywhere else the ceiling is 1.0.

## 7. Where it applies

- Road races: Duel, Grand Prix, Time Trial, the circuits, Wasteland road
  duels, the drift trial, hidden road and The Deep sea floor (its grip and
  turning drag feed the same terms).
- Not on any course with `course.def.arena === true`: today's path exactly.
  That covers the Scrapdome and Salt Flats (which also carry `venue`) and
  the Titan Monster Arena and Titan Stunt Trial (`config.js:127, 130`,
  `arena` without `venue`), so stunts and combat arenas are unchanged. This
  is wider than the `venue && arena` test `steeringYawAuthority` uses, on
  purpose.
- Not on foot, not during a crash knock (unchanged), not airborne.
- Muddy Hollow (`muddy-hollow.js:392`) and the step back into the car after
  walking (`onfoot-transition.js:267`) also run `_drive` on road courses, so
  the slide applies there too.
- `s.tyreSlip` starts at 0 with the rest of race state (`game.js:95`) and
  resets to 0 everywhere `slipAngle` resets today (game.js:341,
  sim-crash.js:183 and 235, arena-event.js:88-89, combat-weapons.js:162,
  hidden-road-journey.js:137, deep-journey.js:180).

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
  re-recorded in this card. The two new state fields (`tyreSlip`,
  `tyreSlipRules`) do change hashes of the whole race state taken by some
  measuring tools (`gp-existing-rate.mjs:53`, `panorama-field-rate.mjs:60`,
  `arsenal-balance.mjs:136`); nothing pins those, and the replay tests hash
  named fields only, so only the named fixtures promise to stay identical.
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
   **Stop rule:** if the on/off score ratio is below 0.6 at any level, or the
   one-crash recovery run never builds a drift chain (it crashes only once
   `chainScore > 40`), stop and ask Claude. Do not adopt the numbers.
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
  (including the shoulder swerve) through `steerForYaw`, and the drift-event
  driving of section 6.
- `src/game.js`: start `s.tyreSlip` at :95, latch `s.tyreSlipRules` at race
  start, reset at :341, the drift objective read.
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
   - 80 mph, steer 1.0: slip at least 1.24 within 0.5 s (it approaches 1.25
     and never quite reaches it); after 1 s yaw is within 1% of
     `0.82 × peakYaw`; speed loss per step equals the formula.
   - Same at Casual with 0.90 and 8 mph/s.
   - Steer from 1.0 to 0.75 at 80 mph: slip below 1.0 within 0.30 s.
   - 30 mph full steer on asphalt: slip stays below 1, no loss.
   - Snow (grip 0.7): on the same fixed-radius curve, steering to follow
     the curve, slip passes 1.0 at a lower speed than on asphalt.
   - Full brake plus full steer at 100 mph: slip at least 1.25.
3. Switch off: `_drive` output, `steerForYaw`, the keyboard adapter and the
   squeal input equal today's formulas over a grid of speeds, grips, brake
   and steer values (exact).
4. Arenas: a Scrapdome run and a Titan Monster Arena run are each
   byte-identical with the switch on and off.
5. Rivals: a CPU-only race hash is identical with the switch on and off;
   Grand Prix field positions identical over 60 s with a neutral player.
6. Repeatability: the three pinned switch-on fingerprints at 30, 60 and
   144 FPS, three runs each.
7. Keyboard: tap yaw equal to today's within 1e-12 at 60, 80 and 120 mph; ceilings and
   peak times from the table; identical below 40 mph; arena keyboard
   identical; throttle identical.
8. The lesson, on Harbour Lights' Lantern Hairpin with the line driver:
   "early" brakes to the planned corner speed before turn-in; "late" brakes
   25 m later and asks for full steering through the turn. Switch on: early
   is at least 0.25 s faster over the stretch from 60 m before turn-in to
   80 m past the apex, and late shows slip above 1.0 for at least 0.5 s. Both
   numbers are also recorded with the switch off, for the change note only.
9. Squeal: loop gain 0 up to slip 0.9, about 0.05 at 1.0, 0.40 at 1.25 and
   above; no squeal from straight-line full braking at 100 mph.

Existing suites must pass unchanged with the switch off: test-replays,
test-combat-replays, test-world-composition, test-keyboard-steering,
test-drift-trial, test-drift-scoring, test-reference-laps, src/test.js (its
"fast corner develops visible rear slip" check is switch-off behaviour).

## 12. Acceptance (switch on versus off, same seeds, recorded in the change note)

- **Lap times per course**, App autopilot, the reference-lap policy
  (`node tools/build-reference-laps.mjs --event=ID --probe`, writing nothing):
  every course within −0.5% to +1.5% of switch off; snow and ice courses
  within −0.5% to +3%. On dry roads the autopilot corners at 85% of the
  limit, so a bigger change means a fault, not tuning. On snow it already
  corners past the grip (section 6), so if a snow course misses +3%, report
  it with the QA-STOCK-SNOW link rather than tuning this card.
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

- Gamepad steering is up to 25% sharper above 50 mph, fully from 62 mph
  (section 5).
- The rivals measure against the autopilot, which never slides, so the
  balance tools show little change; how human races feel is judged in play.
- Keyboard players can reach more of the grip between 50 and 100 mph than
  today. That is part of the change; the keyboard lap acceptance watches it.

## Independent review: CHANGES, settled by Claude (14 October 2026)

An independent reviewer recomputed every worked number in sections 2 to 6
from the card's formulas: all match except the items below. The slip update
is an exact exponential, so it is stable at 120 Hz, at the 8 m/s floor and at
top speed; a held full-lock slide from 80 mph settles at 49.7 mph (ask back to
1.0). "Nothing faster than today" holds, braking included. Section 0 is
accurate. Codex builds to the card as amended here; these amendments win over
the text above.

1. **Snow wording.** Grip and traction cancel out of `ask`, so full lock
   slides at the same speed on every surface; what changes on snow is that a
   given corner at a given speed needs a higher `ask`. Reword sections 2 and 5
   to say that. Test 2's snow case becomes: desired yaw 0.8 rad/s at 60 mph
   gives ask 0.715 on grip 1 and 1.02 on grip 0.7.
2. **Audio.** The tyre loop reads a new variable (`tyreSlipSmoothed`). The
   road-scrub (audio.js about 1493 to 1495) and gravel (about 1513) layers keep
   reading today's `smoothedSlip` unchanged. Loop gain is 0 below slip 0.928
   (the (x - 0.08) / 0.92 step), not 0.9.
3. **Drift autopilot.** Give the drift-event autopilot a target, not only a
   ceiling: corner speed factor 1.058 (ask 1.12), so it actually slides and
   scores.
4. **Drift records.** Add an optional `tyreSlipRules: true` on new results and
   leaderboard rows (absent means old rules). `src/leaderboard.js` about line
   128 must keep old drift rows instead of dropping them for a different
   `driftTarget`, showing them under old rules. Readers to include in the
   hooks: `src/progression.js` about 456 to 457 and 658, `src/screen-menu.js`
   about 60. This takes the `save-shape` lock and gets the save review.
5. **Keyboard.** "Above 100 mph a held key alone does not slide" becomes
   "above 88 mph" (ceiling 2.1 - 0.0125 x mph). And Kyle approved today's
   gentler keyboard on 13 October: **a held key must never give more yaw than
   today at any speed.** Keep each speed's keyboard ceiling at or below
   today's cap (today 0.80 to 0.90 of peak from 60 to 88 mph, not 0.93), and
   keep 40 to 50 mph at today's value too. Taps unchanged within 1e-9. The
   gamepad at full stick above 62 mph sliding is intended: full stick is
   asking for too much.
6. **Tests.** Slip settles "within 1% of 1.25" (1.2447 at 0.5 s; crosses 1.0 at
   0.175 s); give the yaw-settles and speed-loss checks a stated tolerance. The
   1.0 to 0.75 drop test limit is 0.3 s at a pinned speed (measures 0.242 s).
   "Full brake plus steer at 100 mph" checks slip at least 1.25 within the
   first 0.3 s.
7. **Hooks to add:** `tools/scenarios/grand-prix-pay.mjs` and
   `grand-prix-existing.mjs` (inject `steerForYaw` and `TYRE_SLIP` with the
   pasted helpers); a switch option for `tools/build-reference-laps.mjs`,
   `tools/track-script-drive.mjs` and `tools/race-field-balance.mjs`;
   `tools/combat-balance.mjs` `--flags` must accept `tyre-slip`.
8. **`steeringGrip`** is computed inside `steeringYawAuthority` (`max(grip,1)`
   for assisted cars under 45 mph). Export it; `peakYaw` uses that same value.
9. **Keyboard rules per race:** the adapter is built once in the App
   constructor, so pass the rules into `update()`.
10. **Off-road:** `tyreSlip` runs everywhere in a road race (the drawn angle
    needs it) and `g(slip)` applies off-road too; no new speed cost off-road
    beyond today's.
11. **Which events:** Titan Monster Arena and Titan Stunt Trial keep today's
    steering, like the venue arenas (Kyle wants sharp steering in arenas).
    Ridge Rally gets the new rules.
12. **Smaller points:** in `steerForYaw` compute brake before steer; keep each
    caller's argument list. Keyboard identity checks use 1e-9 tolerance. In
    section 5, apply the speed ceiling after averaging the ramp. Simulate
    Lantern Hairpin entry before freezing its "late entry shows slip for 0.5 s"
    check. The drawn slip angle must be 0 at slip 0 and must not flip sign
    while counter-steering through zero.

Review: CLEAR to build with these amendments. Police are unaffected (they
use a speed target only).

## Claude note - new keyboard curve, 14 October

Kyle found the 13 October keyboard curve too slow, and STEER-055 (merged) sets
the road curve to 55% start, 300 ms to full, 30% less at 120 mph and above.
Amendment 5 above now reads against this new curve: a held key must never give
more yaw than STEER-055 gives at any speed. Recompute section 5's keyboard
table from it before building.

## Factory lock correction before build

The accepted independent-review amendment4 above changes drift result and leaderboard readers in progression.js and explicitly takes save-shape. The short board row now includes save-shape alongside busy-game-files, so the scheduler cannot admit this card while EARN-MEDALS owns saved-profile work. This records the already settled scope; no tyre source, design number or saved field changes here. Attack still holds the named core hooks, and the current release hold forbids all new checks and merges.

## Current STEER-055 table before building — 15 October

Recomputed directly from current keyboardSteeringLimit, createKeyboardSteering and steeringYawAuthority, grip1/asphalt, fixed120Hz. The settled amendment that a held key never exceeds today's yaw wins over section5's old bonus/peak table: the new held peak-share ceiling equals the current held share, with raw steering divided by the new steerGain ratio. No keyboard-only peak is reached unbraked at these speeds. Below40mph and all arenas retain the old path.

| mph | Today's held = new maximum peak share | New raw steering cap | First120Hz tap peak share | Full-brake ask at held cap |
|---|---|---|---|---|
|40|0.804672|1|0.4475988|1.00584|
|50|0.9625|0.956911636|0.535390625|1.203125|
|60|0.925|0.766357804|0.51453125|1.15625|
|80|0.85|0.68|0.4728125|1.0625|
|100|0.775|0.62|0.43109375|0.96875|
|120|0.70|0.56|0.389375|0.875|

These are consequences of the approved55percent start/300ms rise/30percent high-speed reduction, not new tuning. In particular section5's old100mph full-brake1.06 example no longer applies; it is0.96875 under STEER-055. First-tap yaw stays the same by mapping existing averaged input through old authority/new gain, within the approved1e-9 tolerance. Final independent review must check the actual implementation against this table. No lane/source/check started while DRIVE-LESSON-SAVE holds save-shape.

## Daylight build claim — 15 October

Kyle directed continued building. New tyre-slip/codex/tyre-slip starts atb8b6a1e2 while P4-VARIANTS completes its independent final checks. It holds busy-game-files and save-shape, both released by completed Lesson Save; no circuit-registry lock. The accepted independent amendments and current STEER-055 table above control. First tested source slice is the owned config grip/peak/demand/angle/sound/steerForYaw helpers and new test-tyre-slip suite, with legacy DRIVE and steeringYawAuthority text unchanged. This increment has no runtime caller or feature switch installation yet and is not playable/finished acceptance. Then wire the settled per-race dev switch, player/keyboard/reset/audio paths and all named driver copies, complete drift-record save review and full existing card acceptance. No old replay/reference pins or live/preview changes. Arena/CPU off-parity and all final macro checks remain required. Questions stay on this card; no new art or HELI cleanup work.

## Named per-race latch and on-foot reset details

The existing owned game.js hooks include the precise _loadStage/_loadArena flag installation required by the arena exclusion: snapshot the requested switch once in startCampaign, install tyreSlipRules only for a non-arena stage, and explicitly false in native venue _loadArena. Existing stage and listed actor/crash/journey resets clear only the player tyreSlip field; do not add it to CPU actors that never had it. The already named onfoot-transition.js hook includes clearing that player field at actual entry/exit transitions; parked-car _drive remains on the old yaw path while on foot. These settle implementation of existing exclusions, not new rules or tuning. Pure foundation71c41f1f and optional keyboard44aade10 are committed with10focused/443existingkeyboard checks/build passing; runtime and macro acceptance remain pending.

## Named existing audio acceptance cases

Add switch-on cases to existing tools/test-audio.mjs using its present MockContext/makeAudio/state recipe, without changing any old assertion or adding a harness. They check actual recorded tyre-loop gain at reviewed slip values, quiet straight-line braking, and preservation of the separate legacy smoothedSlip used by road/gravel. The new tyreSlipSmoothed variable belongs to the existing src/audio.js constructor plus named squeal block. No sound-bank, PCM recipe, mix threshold or loop gain ceiling changes.

## Bounded drift stop and question —15October afternoon

Retained clean unmerged tyre-slip/codex/tyre-slip912b96ca. Player/keyboard/audio and all named driver copies are wired behind dev;17focused cases and build pass. Early independent reviewer found one actual shared audio local fault, corrected in73bac0f3 and confirmed CLEAR; paired actual surface graph checks pass,503audio checks. Driver-copy argument/dependency/flag review found no other fault, but named the low-speed drift design conflict below. This is not completed feature acceptance or a merge candidate.

Initial actual source050b76fe Hard/Pro30fps five-seed probe, native App/Duel/memory-only/unchanged scoring and deadlines: seeds1989..1993 off all clean two-lap wins6417points/98.61s. On scores240/318/85/104/247, each one lap,2–3crashes and timeout. Median240/6417=0.03740065, below0.6 stop rule. Eight-second probe; other required dimensions, recovery, retune, row versions and final macros/gate are UNRUN. No targets/deadlines or old pins/records changed. Evidence lane.evidence/2026-10-15/TYRE-SLIP/drift-initial.json.

Claude: please settle the drift driver line/speed control while preserving the reviewed grip model/scoring and limits. Implemented amended corner factor1.058 plus requested ask1.12 (signed by actual corner) does not follow this native route cleanly. What controller/target should replace it? Also ask1.12 is unreachable under existing gain above45 until about55.7mph (at50 maximum1.00584); may this range explicitly saturate at current full steer, as now tested46/50/65mph, or should the drift threshold/wording change? Do not increase authority or silently adopt the older superseded corner factor. Source is held, locks released by blocked state, and other cards continue.

## Claude answers - drift driver, 15 October 16:00

- **Controller:** replace the corner-factor target with a slip-hold
  controller. The drift autopilot follows the .95 line driver's path and
  speed, and in each corner of the drift route above 56 mph it holds the
  tyre `ask` at 1.12: more steer when ask is below 1.10, a throttle lift when
  slip passes 1.20, and it returns to the clean line if its lateral error
  exceeds 2 m. Below 56 mph it drives the clean line.
- **Low speed:** yes, saturate at the existing full steer from 45 to 56 mph
  (test 46, 50, 65 as you have). The drift threshold stays; reword the card to
  say a held full lock slides from about 56 mph.
- **Stop rule unchanged:** if the median score ratio is still under 0.6 with
  this controller on the five seeds, stop and write the numbers; Claude then
  decides whether the drift trial's targets need retuning for the new tyres
  (which would be a Kyle-visible change to an event).


## Continue the retained lane after the 16:00 answer

Codex resumes clean912b96ca in the existing tyre-slip lane, holding busy-game-files/save-shape. Only the named App drift hook, TYRE_SLIP settings and existing tyre tests/note change first. Neon has no authored course.racingLine; reuse existing production racingLineFor/buildSpeedProfile for its native path/speed at0.95, with the same actual-car grip and surface limits. No CPU line/profile source change. Clean-line recovery above2m lateral error and below56mph; corner ask1.12 (raise steering below1.10, current authority cap exact), throttle lift above1.20 slip. Remove the superseded corner-factor branch. Existing off-state driving and all scoring/deadlines/targets stay exact. First add focused controller cases, then one initial Hard/Pro30fps five-seed on/off probe; if median ratio remains below0.6 stop without adopting new numbers. No new lane, preview/live change or art.


## Approved-controller matrix stop, 15 October afternoon

Retained clean8e71136a:19/19 focused tests, build1629.7803ms, independent stock_snow_review CLEAR. New controller clean-line/slip-hold behaviors are source-checked, not finished feature acceptance. Actual full native matrix120rows (30/144fps, all3CPU levels, Casual/Pro, seeds1989..1993, off/on; first10 exact rows reused) completed46.38s additional. Every on run finished two laps with zero crashes/resets. Pro allgroups: median5196/6417=0.80972417,86.54/98.61s. Casual allgroups: median52/6319=0.00822915,94.49/99.38s. FPS results agree, but the Casual score ratio violates0.6. STOP: no target/deadline change, one-crash recovery, row-version wiring, other macros, final gate or merge. Evidence is retained in tyre-slip/.evidence/2026-10-15/TYRE-SLIP/drift-matrix.json. This is simulation frame-rate evidence, not a GPU frame-speed check.

Claude: the approved revised controller removes the crashes, but Casual scores52 at every tested CPU level/seed/FPS while Pro scores5196. Please settle whether the Casual drift target/controller needs a further explicit design change under your16:00 stop instruction. No cause of the score gap or safe new target is inferred, and no scoring/authority limit is altered. Busy/save locks released; retain this clean unmerged lane. Fold this result into its own note with the next genuine source change.

## Claude answers (15 October, evening): Casual must still drift

Casual is the default and the one Kyle's son plays, so a Casual drift trial
that scores 52 is not acceptable. Casual should be forgiving, never
slide-proof.
- **Change, in drift events only (`kind: 'drift'`):** Casual slides as
  easily as Pro (`slideGrip` 0.82) but keeps its own gentler speed loss
  (`scrubMphPerSec` 8). Everywhere else Casual's 0.9 stays, so ordinary
  races keep their extra grip.
- **First, within rule 4's 30 minutes:** confirm the cause by reading which
  drift-scoring threshold (slide angle or slip) the Casual run never reaches,
  and record the measured peak values in the note. If the cause is something
  else, stop and write it down; do not change scoring.
- **Acceptance:** the same five-seed matrix. Casual median on/off at least
  0.6, every run finishes with no crashes or resets, and Pro's results are
  unchanged. The Neon Drift Trial targets stay as they are. If Casual still
  falls short, stop with the numbers, and Claude decides on target retuning
  with Kyle.

## Kyle decided, 15 October 2026: Casual keeps today's tyres

Asked by Claude with the drift numbers (Casual 52 of about 6,300, Pro 5,196
of 6,417), Kyle chose: **Casual difficulty keeps today's tyre model**; the
new sliding grip applies on the harder difficulties only, the same way the
arenas keep their sharp steering. So:
- the `tyre-slip` rules are off whenever the race's difficulty is Casual
  (latched at race start like the other race rules), on otherwise;
- Casual results, records and the drift event stay exactly as today (byte
  identical with the switch on);
- the Pro drift result (0.81 of today's score, clean, no crashes) is
  accepted; no further controller or target change;
- add the difficulty case to the tests and the change note.
Then continue to the remaining acceptance (recovery, row versions, final
gate and one review).


## Resume Kyle's explicit Casual decision, after restart

Root resumes existing clean8e71136a lane; no new lane. Freeze the reviewed cup candidate0dd37e84 pending heavy capacity and transfer busy-game-files/save-shape lease here. Intel's new answers are received but its source stays held until this lease returns. Apply only Kyle's explicit Casual-off latch, preserving actual existing Casual state/results/records and the accepted Pro model/controller; then the already approved remaining recovery/version/native acceptance, one independent review and gate/build. No drift retuning or repeated120race matrix, no live feature flip. Heavy checks stay queued behind Ardennes and the shared cap; source and bounded tests may proceed.


## Current decision applied; target clarification before numeric edits

Native source796e085c applies Kyle's Casual-off latch after resolving difficulty. New case RED then4focused cases GREEN; full native Casual road/Neon state streams exactly equal switch off. Original off-state fingerprint remains exact. Existing model-on fixtures now explicitly use Pro without changing numeric limits; default Casual balance wrapper asserts requested flag true but active rules false. No target/controller edit or repeated120race matrix.

Claude: the accepted clean Pro score5196 remains below the unchanged Hard target6000, so the old all-level autopilot-win acceptance cannot pass as written. Latest Kyle answer says no further controller or target change; that instruction wins and every target/deadline stays unchanged. Please settle whether clean ProHard non-win is accepted under this decision, or name any explicitly approved replacement acceptance. Do not infer an automatic retune. Recovery/native remainder stays queued for actual capacity; source work on the already approved optional record version can continue.

## Record presentation hook before code

The already approved optional tyreSlipRules:true is emitted only from real Pro drift state/results. Keep every ordinary/Casual key and old ghost/time comparable unchanged; discriminate only new drift best/leaderboard rows. In addition to the named progression/leaderboard/screen-menu hooks, own the existing src/screen-leaderboard.js row label only so retained old and new drift rows identify their tyre rules. No new store/schema version/budget, deleted old row, arbitrary target waiver or estimated result. Get one independent save/code review. No numeric change while the question is pending.

## Claude answers - Hard acceptance, 15 October 17:05

Accepted: a clean Pro/Hard autopilot non-win. The "autopilot wins at every
level" acceptance was written for the old tyres; with Kyle's decision it now
applies to Casual only (unchanged tyres, byte-identical). On the harder
difficulties the acceptance is: the drift autopilot finishes clean (no crash,
no reset) and scores at least 0.6 of today's score; measured 5,196 of 6,417
(0.81), so it passes. The 6,000 target stays: a human has to drift better
than the autopilot to win on Hard, which is what harder means. Record this
replacement in the change note.


## Record-version increment frozen; acceptance answer received

Clean61e7de00 has independent cups_save_review code/save CLEAR. New Pro row separation and native-objective cases RED then GREEN; historical off pin and complete Casual road/Neon state streams remain exact.13historical fixtures/437checks,27progression,backup andstorage3.54/4MB pass. No target/controller/score/ghost change. All23focused cases now PASS in14.45s; recovery/macros/gate/build remain UNRUN. Claude96ba047d explicitly accepts clean ProHard non-win at>=0.6 of old score; accepted5196/6417=.81 passes, target6000 unchanged. The earlier question is resolved; no Claude wait or retune remains. Do not repeat120matrix or claim remaining acceptance complete. Freeze source and release busy/save lease to the already reviewed cup candidate for its native/gate/build once capacity permits; no new lane.


## Shared lease returned

Cups is complete and merged. Root returns save-shape and busy-game-files to this retained lane for its remaining acceptance and final gate/build. No repeated matrix or retuning. Ardennes release checks take priority; native batches count as heavy work even when process discovery misses their direct script.


## Actual one-crash recovery: outcome decision needed

The existing private native Pro/Banshee/1989 recipe ran once on 61e7de00 in 2620.7076 ms. All three CPU levels completed two laps, with one crash, exact 8-second penalty, no reset or catastrophic state. The real crash occurred at 1925.091535 m while chain score was 41.140153 and banked score 1311.047031. All produced 4828 drift points. Easy won against 3500. Medium completed but missed 5000. Hard completed but missed 6000; it did not time out. Thus all physical recovery checks passed, but the old Medium-win and Hard-timeout outcome clauses failed. No rerun, controller/target/deadline change or weakened assertion.

Claude: does the accepted Pro non-win apply to this one-crash fixture as well, allowing actual completed objective misses while retaining all physical recovery assertions, or is a named controller correction required? Kyle already accepted Casual unchanged and you accepted clean Pro Hard non-win at the existing target; neither silently settles these two different recovery outcome clauses. Actual packet retained at integration .evidence/2026-10-15/TYRE-SLIP/recovery-current.json. Bounded diagnosis is finished; implementation waits for your written decision. Shared save/game leases return to Intel meanwhile.

## Claude answers - one-crash recovery outcomes, 15 October 19:15

Yes, the same rule applies. The recovery fixture's job is physical recovery:
keep every physical assertion (two laps, exactly one crash, the 8-second
penalty, no reset, no catastrophic state). Replace its old outcome clauses
(Medium wins, Hard times out) with: every level completes and scores (all
4,828 here), and Easy still wins. Medium and Hard missing their targets after
a crash is correct under the new tyres. Record the replacement in the change
note.

## Night final acceptance resumes after Summit merge

The missing Pro-only pin was recorded once on b1edcddb; only its new fixture and own note committed1f29566e. No old recording/pin changed. Root briefly reclaims busy-game-files/save-shape only to combine current integration before final gating: the actual merge has two textual conflicts, App imports and feature flags. Retain both racing-line and cup imports, tyre-slip dev plus merged Yeti on and every foreign released flag. Preserve automatically merged cup save/settlement logic. No retune, Casual change or replay re-recording. Freeze and release the core leases immediately after that union; one independent final delta review and the canonical gate execute the still pending new recovery/FPS/arena/CPU assertions. No extra120race matrix.

Union committed clean de0371dd: exactly the two named conflicts resolved by keeping both sets of imports and tyre dev/Yeti on; new cup settlement normalized/preserved. App/flags parse and diff clean. Source frozen again; busy/save leases released immediately. Pending canonical/build and independent final delta confirmation remain, no new acceptance pass yet.

Final independent fixture/merge delta review CLEAR on de0371dd: old recordings/pins exact, cup save/settlement retained, Casual off and Yeti on/tyre dev preserved. Actual final canonical admitted2026-10-16T05:15:40.791Z: wrapper41460,runner29440,exec71090,final-de0371dd/lane-receipt.json pending. One-minute inventory2 roots, no overcap. The pending FPS/recovery/arena/CPU cases are part of this gate; do not duplicate them or claim pass before the actual receipt.


## Final gate failure: bounded diagnosis and exact question for Claude

Exact clean de0371dd canonical completed05:42:00.825UTC:383/394/jobs4/exit1,11failed,0notRun,1567231.7507ms; wrapper41460/runner29440 drained. No build/merge. New tyre suite28/28 including30/60/144FPS replay, actual GP seven-opponent/CPU parity and realScrapdome passed; all three new Pro drift recovery cases passed. Never duplicate those manual acceptances or the old120matrix.

Failed suites: stunt-trial (steerForYaw missing import); arena-junk-shove, arena-shove, arena-steering-ceiling, arena-steering, titan-handling and onfoot-hints (old whole-state road fingerprints); feature-flags, course-kit and wasteland-beta (precise dev registry pins omit tyre-slip); preview-launcher (private flags omit tyre-slip). No model retune, old fixture re-recording or assertion change made.

One bounded existing Falcone/Pacific/1989 casual discovered road recipe proves the first state hash difference is ONLY the two declared telemetry keys: raw a163d7bf62a7956300ad9de0011d971183edcfeb53fdfcece254360570c57b7a; omitting tyreSlip/tyreSlipRules gives the EXACT old discovered pin1342654b0b1b80dd025d23e15b84dcad9b2d83e7a55b7d3ae74c0b339e67178e. At all three samples those fields are0/false; distance61.11576789757167. This proves that single recipe, not every failed hash. Section8's assumption that no tests pinned whole state was incorrect.

Claude: approve a narrow re-slice and assertion interpretation before edits. Proposed six existing whole-state recipes assert new metadata is exactly0/false for off/Casual and hash ALL historical fields with those two declared keys omitted, retaining every old expected hash/numeric assertion. Each must prove its exact old pin; no fixture recording. Proposed owned hooks: tools/test-arena-junk-shove.mjs, tools/test-arena-shove.mjs, tools/test-arena-steering-ceiling.mjs, tools/test-arena-steering.mjs, tools/test-titan-handling.mjs, tools/test-onfoot-hints.mjs. Also name existing tools/test-feature-flags.mjs, tools/test-wasteland-beta.mjs precise tyre-slip dev inventory rows and start-preview.bat explicit private tyre-slip flag (test-preview-launcher already expects it); course-kit copies the flag test. The already owned stunt-trial driver copy needs its existing config steerForYaw import. Is this exact additive metadata projection approved, or should off-state runtime shape remain byte-identical through a different named fix? No silent serializer change, weaker hash, new harness or widened runtime tuning. Keep locks[] while this decision waits; other building continues.


The already owned missing-import repair is committed4f132806 (test-stunt-trial and ownnote only). Actual existing stunt suite now44checks PASS, Casual/Pro30/144FPS; no numeric/controller/runtime assertion change. No other failure rerun or pin projection edit, no final canonical/build/merge. The exact new telemetry-projection/registry/preview question remains waiting; locks stayfree.

## Claude answers - final gate failures, 16 October 00:45

1. **Whole-state pins: keep the off state byte-identical (the second option).**
   Do not change the six whole-state tests. Attach `tyreSlip` and
   `tyreSlipRules` to a car's race state only when the new tyre model is
   active for that car (switch on and Pro or Hard). With the switch off, and
   for Casual at any time (Kyle: Casual keeps today's tyres), the state has
   exactly today's fields, so every old pin holds as recorded. Readers (HUD,
   telemetry, replay) treat a missing field as 0/false. This stays inside the
   card's owned runtime files; prove it by running the six failed suites
   unchanged. If a reader outside the owned files needs the fallback, name it
   before editing.
2. **Registry and preview rows: approved.** Add the `tyre-slip` dev row to the
   precise inventories in `tools/test-feature-flags.mjs`,
   `tools/test-wasteland-beta.mjs` and course-kit's copy, and the private
   `tyre-slip` flag in `start-preview.bat` (test-preview-launcher already
   expects it). Claude's review: these add the new switch to lists that must
   name every switch; nothing is loosened.
3. The stunt-trial import repair (4f132806) is accepted.

Then one lane tier for the changed files (rule 19), build, merge. No full
tier for this card; the 04:00 full check covers it.


## Approved correction frozen; next canonical admitted

Current clean3e2bf73f81c3f703ac9cce1b154adb4ee829d5a2 omits inactive tyre fields and guards existing owned resets. Six historical hash suites unchanged. New exact-shape regression RED thenPASS235.2278ms; approved exact dev/preview rows updated. Actual current-integration union had App imports/result payload and reference-worker flags/retainPoses conflicts: both behaviors preserved, no pin/reference regenerated. Required independent code/save delta review CLEAR.

One final corrected canonical admitted07:24:01.174UTC: wrapper35212/runner13776/exec54240, lane --changed --jobs4 --keep-going --json, ownlane final-3e2bf73f/lane-receipt.json pending. The unchanged six suites run here, no duplicate manual batch. No gate/build/merge pass yet; freeze source/release core now, GP bounded source attempt may proceed under its fresh answer.


## Restart interruption, 16October07:43PT

Announced laptop restart stopped wrapper35212/runner13776 before any buffered JSON or receipt: actual lane.json/lane.log both zero bytes, no running process. Frozen3e2bf73f remains clean/reviewCLEAR. This is incomplete, not a passing gate or assertion failure. Resume the same corrected canonical once; no old passing native matrix/recovery/fixture recording repeated manually.


## Resume deferred for actual exclusive release check

Resume admitted14:43:09UTC on same3e2bf73f (wrapper30480/runner13408/exec46346). Fresh inventory/hold immediately showed older Summit release full28640 started14:43:05UTC. Root stopped only its later verified gate and descendants; subsequent inventory shows all Tyre processes drained. No result JSON/receipt completed; cancellation is not a test failure or pass. Actual cancellation receipt retained under16October/TYRE-SLIP/resume-3e2bf73f. Source/review remain frozen; resume only after FULL TIER FOR RELEASE DONE and any frame hold clears. No ordinary job starts during this foreign hold.


## Corrected canonical actually resumed16October09:14PT

Exact clean3e2bf73f81c3f703ac9cce1b154adb4ee829d5a2, wrapper38356/
runner7204/session44438, lane changed/jobs4/keep-going/json. Native
.evidence/2026-10-16/TYRE-SLIP/canonical-resume-3e2bf73f/ will retain
lane.json/log and lane-receipt.json; JSON can buffer, absent receipt is not
a failure. One-minute count3 including two older foreign jobs. No result,
build or merge yet; source frozen and leasesfree.


## Actual corrected gate and final own-test delta

The exact3e2 canonical finished17:13:43UTC:395/396/jobs4/zero notrun/exit1,
source unchanged. Wrapper38356/runner7204 drained. Actual receipt and full
outputs remain in canonical-resume-3e2bf73f. Only test-tyre-slip failed:28/29
passed, one new private-tool assertion still expected false for an inactive
Casual field. Claude's written821b829f decision requires absent inactive
fields, not false/undefined keys. No runtime or old hash assertion failed.

Frozen13f09aa4 corrects only that new test and ownnote: require both fields
absent, fail if the observation callback never ran, retain requested-switch
and actual Pro-on assertions. Required independent delta review CLEAR.
No new test pass/build/merge yet. One changed-only canonical plan uses the
existing runner main/getChanges seam with actual gitdiff3e2..13f, no runner
edit or filters:17default affected/smoke/replay/world guard suites, jobs4.
No unchanged396batch repeat. Reserved next turn10:20PT until10:40/admission;
foreign newer jobs remain untouched. Build follows only actual green.


## Complete: reviewed development merge, 16 October 11:02 PT

TYRE-SLIP is complete and merged for development. The corrected3e2 gate remains
historically FAILED395/396: only this card's new inactive-field expectation was
wrong. The six old whole-state suites and all other395 suites passed unchanged.
Strict absent-own-key correction13f09aa4 received independent CLEAR, then its
actual two-file canonical delta passed17/17/jobs4/zero fail-notRun/exit0 in
289681.3877ms and its production build passed1733.278ms; source unchanged.

Current-integration union cb1840e5 preserves Rescue/wildlife/skins/TeamRoom,
all current saves and exact inactive state. Its only two conflicts were the
approved preview flag list and precise feature inventory: all foreign rows
plus tyre-slip retained, exact base32 count. Independent code/save union
review CLEAR. Actual conflict-hook canonical passed19/19/jobs4/zero fail-notRun/
exit0 in462405.8415ms; one production build passed2140.9512ms on the same exact
clean source. The final integration merge was conflict-free; no rerun.

Receipts remain in the retained owned lane .evidence/2026-10-16/TYRE-SLIP/
canonical-resume-3e2bf73f, delta-13f09aa4 and union-cb1840e5. All own jobs drained;
locks[]; no real saves, live installation, push, replay recording or old120-race
matrix repeated. Preserve this older lane/evidence: cleanup creation ownership
is not proved. Casual/off remain byte-identical; the new model is Pro/Hard-only
behind dev tyre-slip. This is not a live-enable or new full-tier claim.
