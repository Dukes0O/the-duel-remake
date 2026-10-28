# LESSON-CRASH-STUCK

Kyle, 28 October 2026, after driving lesson 1 (Braking, Panorama Ridge): "If
crashing during a 'Follow Me' run, the screen just shakes without end, the
sound stops working etc. kind of like the crash locks in the crash effects but
doesn't release them." Second report: "hitting both accelerate (up arrow) and
turn (left arrow) doesn't actually result in the car turning."

## Cause

A real crash (`_crash` in `src/sim-crash.js:196`, called by a roadside rock,
tree or building hit) sets the impact timer (`impactTimer`, line 233) and a red
flash, a damage cooldown and a guard time. In a race, `Duel.step` in
`src/game.js` runs the crash down every step: `_impact()` shortens the timer,
the flash, cooldown, guard and callout timers count down, and when the timer
reaches zero the car is put back at the crash site.

Driving lessons take their own path, `_stepDriveLesson` (`src/game.js`, called
from the top of `step`), which returned before any of that. It called `_drive`
and `_collisions` but never `_impact` and never counted the timers down. Until
27 October a crash ended the lesson run, so the missing step never showed.
Since then mistakes never end a run, so the crash state stayed for good:

- `impactTimer` stayed above zero. The camera shake in `src/render3d.js:793`
  and `:863` is that timer times the impact strength, so it shook without end.
- The sound code reads the same timer (`src/audio.js:1226` and `:1527`), so the
  crash mix stayed on and the engine and surface sounds stayed ducked.
- The HUD (`src/screen-hud.js:242`) showed COLLISION and the red flash
  (`crashFlash`) for good, and the callout never timed out.
- Contacts were switched off: `_collisions` is only run while the timer is
  zero, and the guard time and damage cooldown never ran down, so after the
  first crash the car drove through rocks and walls without a second crash or
  even a scrape being noticed (this also made the "touched the wall" mark on a
  later cone too forgiving).
- A run that ended in the middle of a crash (the finish line) froze mid-crash
  behind the result card, still shaking, because nothing stepped after the
  result.

It is the same in all four steps, but Watch me never crashes (it replays a
clean recorded run), so in practice Follow me, Your turn and Beat me.

## Fix

`src/game.js`: new `_stepLessonCrash(dt)` counts down the flash, guard,
cooldown and callout timers and, while the impact timer is above zero, runs
`_impact(dt)` and `_collisions()` exactly as a race step does. It returns true
while the car is in its crash. `_stepDriveLesson` now:

- uses it before driving: during a crash the driver has no control (as in a
  race) and the normal driving, jump and contact step is skipped; once the
  crash ends the car is back at the crash site doing 12 mph and the run goes on;
- keeps calling it in the result phase, so a crash that was still going at the
  finish plays out behind the result card instead of freezing.

Normal races, the instructor builder, Watch me and the lesson rules are not
changed. `src/sim-crash.js`, physics and shared race code are untouched.

## Steering finding (second report)

Not a code fault found. What was checked:

- Keys: `src/app.js:2293` to `2310` builds the steering from ArrowLeft and
  ArrowRight (`src/keyboard-steering.js:11`) and the throttle from ArrowUp or W
  (`src/input-contexts.js:17`). They are separate values, so Up and Left
  together give throttle and a left turn. Nothing in the key handler
  (`src/app.js:2446` to `2466`) clears one key when another is pressed.
- Lessons: the only place a lesson sets the car's input is the Watch me step,
  which replays the recorded instructor inputs (`src/game.js`, `_stepDriveLesson`).
  Follow me is a ghost car drawn for the player to follow and the line, boxes
  and lights are drawn only; none of them touches steering. A speed plan, assist
  or reset in a lesson does not zero the wheel. A crash sets the wheel to zero
  once (`src/sim-crash.js:250`). In the stuck state the wheel still worked and
  the car simply drove through everything, so the stuck crash does not explain a
  car that ignores the wheel. With the fix a crash takes control away for its two
  to three seconds, as in a race, and then gives it back.
- Measured in the real lesson: at the lesson start (Falcone, 174 mph) Up plus
  Left from the real key path gives steering 0.44, 0.56 (full speed limit for
  the keyboard) and a nose turn of about 0.2 radians per second. That is a
  gentle turn at that speed: keyboard steering gives up 30% at high speed
  (`KEYBOARD_STEERING_SPEED_DROP`) and the tyre limit in lessons (grip rules)
  caps the turn further. At 174 mph a gentle left can look like "continuing
  straight". That is the intended handling, not a bug; if it feels too stiff it
  is a tuning question for Kyle, not part of this fix.
- Two keys only (Up plus Left) are handled correctly. Three keys at once (for
  example Up, Left and Space, or Up, Left and a shift key) can fail on laptop
  keyboards that cannot report that many keys; the game never sees the third
  key, so this cannot be fixed in the code. If it happens only while a third key
  is also held, that is the keyboard.

## Tests

New `tools/test-drive-lesson-crash.mjs` (6 tests; the 5 crash tests failed on the old code
and pass now):

- Follow me, Your turn and Beat me: after a crash the impact timer, red flash
  run out, the car is recovered once at the crash site, the crash site is
  cleared.
- After recovery Up plus Left through the real key path steer the car, and a
  second crash can happen and also ends.
- A crash just before the finish line still ends behind the result card.
- Up plus Left held together give throttle and a left wheel in every driven step.

Run (laptop, PowerShell): lane tier `node tools/run-tests.mjs --tier lane
--changed --jobs 4` (28 suites passed, including the replay fingerprint,
world-signature and world composition guards); `npm run build` passed; every
`tools/test-*lesson*.mjs` passed (drive-lesson-2, -3, -4, -crash, -helipad,
-lines, -run, -save, drive-lessons, drive-lessons-view-2, lessons-v2-view,
lesson-instructor-any-car, heli and lab lessons).

Browser scenarios (`--jobs 2`): `drive-lesson-run`, `drive-lessons-view-2` and
`lessons-v2-view` all passed (6, 10 and 12 screenshots, 0 warnings, 0 errors). An
earlier run overlapped with another run in the same output folder and one scenario
(a 100 ms click timing check) failed under that load; the clean rerun passed.

Not run to the end: `tools/test-lesson-instructor-any-car.mjs` ran over 40 minutes
on a busy laptop and was stopped (rule 4). It builds instructor runs with the plain
race step and never reaches `_stepDriveLesson`, so this change cannot affect it.

No assertion was changed. No physics or shared race code was changed, so the
replay fingerprints are untouched (the lane tier guard passed as run).

## Removed

Nothing. The new step adds a few lines to `src/game.js` and replaces the early
return; no old code path is left behind.
