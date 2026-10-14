# HELI-MODE

The helicopter mode controller, from `docs/HELICOPTER.md` sections 2, 6
and 9, re-sliced on 14 October so it needs no lock: the game hooks
(`app.js`, `render3d.js`, the menu and the sound bank line) are HELI-HOOKS.
Here the mode is complete and driven headless.

## What landed

- `src/heli/heli-session.js`: start at the home pad (Tremblant Woods), a
  landing zone beside each start line chosen clear and level, the home
  parking spot, the flying area and ceiling, destinations, the cruise leg
  (fuel taken, arrival 1.5 km out at 150 m facing the zone), hooking and
  delivering the player's car, fuel at the home pump (the free first tank
  fills up), repairs for hard landings, crashes, drops and cargo hits,
  the fuel truck after an out-of-fuel landing, a crash returns you home,
  the play day, and a read-only view for the renderer and instruments.
- `src/heli/heli-jobs.js`: the three destinations with their real base
  altitudes, the leg fuel table and the small map for bearings (board data
  only; HELI-DISPATCH adds jobs).
- `src/feature-flags.js`: `helicopter: 'dev'`.
- `src/input-contexts.js`: a `heli` context (W/S collective, arrows
  cyclic, A/D pedals, H hook, P autopilot, C camera, Enter cruise, Esc
  pause) and `heliControls()` for keys and the gamepad sticks. No race
  key reaches the car in this context.
- `docs/HELICOPTER.md` section 6: what this card settled, including two
  save rules for later sprints from the HELI-SAVE review.
- `tools/test-heli-mode.mjs` with the import guard.

## Checks

- `node tools/test-heli-mode.mjs`: 138 checks pass. The switch is dev and
  the session refuses to start with it off; the heli context; leg fuel;
  each destination's zone (beside the start, nothing tall in it, the same
  every time), parking, area, ceiling and arrival points inside it; the
  free first tank, the price of a refill, no fuel in the air; a Real-mode
  hard landing charged once; the ceiling holds the helicopter in; Cruise
  offered on leaving with a destination, the 25 kg leg, arrival 1.5 km out
  at 150 m facing the zone, the flight counted; Cruise refused without
  enough fuel; the headless flight (hook the car at home, autopilot to the
  edge, cruise to Panorama Ridge, autopilot to a hover over the zone, set
  the car down, release, delivered and saved, no repairs, fuel kept) with
  the same fingerprint on two runs; the import guard (only the save
  normalizer imports `src/heli`; its simulation files import only
  helicopter rules, `../config.js` and `../rendered-ground.js`, and use no
  page, clock or randomness).
- Review (rule 17): one independent reviewer found three real faults:
  changing the destination during the cruise fade broke the leg, a
  rotor-strike crash refunded the fuel burned, and a pilot could be
  stranded with an empty tank. All three are fixed with tests (the leg is
  pinned when Cruise is accepted, the tank is stored before a crash, and
  the fuel truck comes whenever the tank is empty on the ground unless the
  home pump can sell a 60 kg reserve), with its notes on saving only real
  changes, the import guard and the Banshee message. The reviewer
  confirmed the fixes.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4 --keep-going`:
  246 passed, 0 failed, 0 not run in 1235.02 s. Earlier runs failed first
  test-course-kit (the full switch list in test-wasteland-beta needed the
  new switch) and then test-preview-launcher (start-preview.bat needed the
  new switch); both are fixed above.
- `npm run build`: passed in 716 ms (the usual large-chunk warning only).

- `start-preview.bat`: the preview launcher asks for the new
  `helicopter` switch, as it does for every development switch
  (test-preview-launcher checks this; it is the file once in the
  `circuit-registry` lock, which no card holds).

## Changed assertions

- `tools/test-feature-flags.mjs`: the switch count rises from 25 to 26
  (plus the course switches) for the new `helicopter: 'dev'` switch, as
  the packet says. Nothing else in that check changed.
- `tools/test-wasteland-beta.mjs`: the full list of switches gains
  `helicopter: 'dev'` (the same new switch; test-course-kit runs this
  suite inside its own check, which is why the first lane run failed
  there). Every other switch and state is unchanged.
- `tools/test-input-contexts.mjs`: the context list gains `heli` between
  `foot` and `photo`. The other contexts and their keys are unchanged.

## Race fingerprints

No race code changed; nothing outside `src/heli/` and the tests imports
the session. The replay and world-signature guards run in the lane tier.

## Sound cue

No sound here. The session emits `radio` events naming HELI-RADIO's lines
(landing hard, fuel low, fuel out, fuel truck, drop, cargo hit, cruise
ready, cruise refused, arrived) plus the flight and cable events its
sounds follow; HELI-HOOKS connects them.

## Removed

Nothing was replaced, so nothing was removed.
