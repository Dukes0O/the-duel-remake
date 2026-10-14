# HELI-HOOKS

Plugs the helicopter into the game (docs/HELICOPTER.md section 9). Holds
`busy-game-files` and `sound-bank` once, for as short a time as possible.
With the `helicopter` switch off nothing changes.

## What landed

- `src/game.js`: `startHeliVisit({courseId, ...})` loads the course the
  way a time trial does, with no opponents, and sets a new `heli` status.
  `step()` returns at once in that status, so no race rule runs while
  flying. The game refuses the visit with the switch off.
- `src/app.js`: `heliAvailable()`, `visitHeli()` (the session with the
  course loader, the player's car, today's date and the save), the session
  stepped in `_simulate` at the same fixed step, the `heli` input context
  and its actions (H hook, P autopilot, Enter cruise, C camera, Esc
  pause), the gamepad sticks, `heliBuyFuel()`, `heliSetDestination()`,
  `heliView()`, `raceHere({courseId, carId})` (leaves the helicopter and
  starts the normal race on an owned course with that car), the fuel left
  saved on `returnToMenu()`, the helicopter sound created with its own
  radio off so the session's radio events are the one source of lines,
  plus the crash line, and dispose.
- Special cars travel only by air (packet section 5): with the switch on,
  `startCampaign` refuses the Koenigsegg Jesko Absolut anywhere but the
  course where it was last set down (Tremblant Woods until flown) and says
  so. `AIR_ONLY_CARS` in `src/heli/heli-jobs.js` holds the list. Done here
  because it needs `app.js`; HELI-DISPATCH no longer needs the lock.
- `src/render3d.js`: the helicopter's group joins the scene before the
  lighting roots, a pose each frame from the session view, the player's
  car drawn on the cable or where it waits, the camera from the chosen
  view, and the race camera's tunnel, mountain and sightline rules skipped
  while flying.
- `src/screen-menu.js`, `src/screen-router.js`: a HELIPAD button under
  START ENGINE, shown only with the switch on, and its action.
- `src/sound-bank.js`: one line maps the helicopter's cue list from
  `src/heli/heli-audio.js` (all flagged `helicopter`).
- `src/heli/heli-scene.js`: a plain stand-in Kestrel One (boxes and
  cylinders, spinning rotor), the cable and hook, the landing ring and the
  pad's H. Development only until HELI-ART-SRC's model passes; HELI-VIEW
  swaps it. Never at release.
- `src/heli/heli-camera.js`: the four views (behind, cockpit, down the
  cable, side). HELI-VIEW tunes them.
- `tools/test-heli-hooks.mjs` and the browser scenario
  `tools/scenarios/heli-first-flight.mjs`.

## Checks

- `node tools/test-heli-hooks.mjs`: 124 checks pass, memory-only storage.
  Every helicopter cue is in the sound bank behind the switch; the HELIPAD
  button starts hidden; switch off: no visit, the game refuses one too,
  the save gains nothing; switch on: the visit starts at Tremblant Woods
  in the `heli` status with the heli keys, the free first tank, W lifts
  off, the race car never moves, P and C work, Esc pauses and resumes the
  flight, the fuel left is saved and survives a reload; Race here refuses
  an unowned course and starts a normal race on an owned one; the Jesko
  races only where it was set down with the switch on, anywhere with it
  off, and other cars are unaffected; the four camera views.
- Browser (`node tools/browser-harness.mjs scenario heli-first-flight`,
  private port, memory-only): HELIPAD button, the scene draws, the free
  tank, lift-off to 15 m, all four views, back to the menu; 0 errors, 0
  warnings. Claude looked at the five pictures: the stand-in, the ring,
  the H and the parked car show where they should. The race HUD still
  shows on top while flying; HELI-VIEW replaces it with the instruments.
  The pictures were deleted after review.
- Review (rule 17): one independent reviewer found five real faults: with
  the switch off every race still loaded the helicopter's 34 sound files
  at start-up; RESTART on the pause screen left the helicopter running into
  a race; leaving the helicopter could overwrite credits earned elsewhere;
  a gamepad could pause the flight but not resume it; and the Jesko could
  still drive into the Wasteland or an arena. Fixed: `src/audio.js` leaves
  helicopter cues out of the start-up load (they load when flying);
  `restart()` is refused while flying; leaving keeps the session's heli
  field and applies only the credits the session itself spent or earned;
  the pad is read while paused; one air-only check guards races, the
  Wasteland, arenas and Race here (which now checks before leaving). Also
  from its notes: helicopter courses load with seed 1989 like their races,
  closing the page saves the fuel, and `returnToMenu` no longer adds an
  empty `heliVisit` to a race state.
- The reviewer confirmed the fixes. Its last note, the RESTART button
  still shown on the helicopter's pause screen (it now does nothing), goes
  to HELI-VIEW, which owns the helicopter's page parts.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`:
  270 passed, 1 failed, 0 not run in 1029.56 s. The one failure,
  test-drive-through, was the Git Bash `tar` reading `C:` as a remote
  host ("Cannot connect to C: resolve failed"), not game code; the same
  suite rerun once on the same files from PowerShell (Windows `tar`)
  passed in 24.72 s (rule 3). Later gates run from PowerShell.
- `npm run build`: passed in 959 ms (the usual large-chunk warning only).

## Other shared file

- `src/audio.js` (not a locked file): the start-up cue load skips cues
  flagged `helicopter`, as it skips The Deep's.

## Changed assertions

- `tools/test-p4-audio.mjs`, `tools/test-arsenal-core-audio.mjs`,
  `tools/test-arsenal-wave1-audio.mjs`: their pinned sound bank hashes now
  also leave out exactly the helicopter's cue list (imported from
  `src/heli/heli-audio.js`), as they already leave out The Deep's cues.
  Every other cue stays pinned.
- `tools/test-heli-mode.mjs`: the import guard approves the hooks' imports
  by name (app, sound bank, renderer, and the three pins above).

## Race fingerprints

Race rules are untouched: the only change in `src/game.js` is a new status
that no race enters. The replay and world-signature guards run in the lane
tier.

## Sound cue

Every cue HELI-RADIO made now plays through the sound bank: rotor, wind,
engine start and stop, cable creak, hook release, set-down thud, low fuel
chime, low rotor horn, radio click and hiss, and the 27 radio lines.

## Removed

Nothing was replaced. The stand-in drawing in `heli-scene.js` is removed by
HELI-VIEW when the picked model goes in.
