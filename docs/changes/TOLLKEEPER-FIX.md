# TOLLKEEPER-FIX

Kyle, 12 October 2026: "tollkeeper cannot be beaten. reduce the spawning rate
of the support vehicles. once they're knocked out, they must remain out for 30
seconds. After the tollkeeper goes to zero, the support cars will have 60
seconds before they respawn. the controls for when the guy leaves the car are
nearly impossible to actually make work." Later the same day: "the controls for
the guy only go forward, backward and strafe. they do not turn left and right."

## What was wrong

1. The escorts came back 3.5 s after a knock-out, and the first broken valve
   put both of them back at full armor.
2. After the last valve the tanker kept driving at 35 km/h. A player on foot had
   to chase it.
3. The finish needed a jump onto the roof. The roof plate is 3 m up and a jump
   is 1.1 m, so only Jax's grapple could ever do it. Nobody else could finish
   the fight, which is the main reason it "cannot be beaten".
4. No prompt told the player any of it. The get-out and get-in hints only show
   when the H help is open.
5. On foot, Left and Right (and A and D) strafed. The fighter could not turn
   with the keyboard. Turning needed the mouse, and the mouse only worked after
   a click on the screen, which nothing told the player to do.

## Rules now (docs/SCRAPDOME.md sections 5 and 10, docs/CREW.md)

- Tollkeeper escorts stay out 30 s after a knock-out. The first broken valve
  starts phase two (gates 20% more often) and does nothing else to the escorts.
- The last valve: escorts still driving are knocked out at once (a real wreck,
  no score), escorts already out stay out, none return for 60 s. The 60 s is
  also the boarding window.
- The tanker (Tollkeeper and ordinary Convoy Raid) rolls to a stop within 4 s of
  the last valve and stays stopped for the window. When the window runs out the
  valves come back at half armor and the tanker pulls away over 4 s.
- On foot within 3 m of the stopped tanker, one press of F climbs aboard. Hold
  F or the left mouse button for 1 s to plant. F must be let go after the climb
  before it can plant. The roof limit on the tanker is 20 s (6 s elsewhere).
  Jumping on from a height still works.
- Large always-on prompt (no H key): PRESS F TO GET OUT (within 40 m, with a
  slow-down warning above 40 km/h), RUN TO THE TANKER with arrow and distance,
  PRESS F TO CLIMB ABOARD, HOLD F OR LEFT MOUSE TO PLANT THE CHARGE with a
  filling bar, CHARGE PLANTED. Gamepad: X to get out and climb, X or the right
  trigger to plant.
- Callout `TANKER STOPPING / ESCORTS DOWN FOR 60 s` replaces `TANKER SLOWED /
  BOARD NOW`.
- On foot controls: W/Up and S/Down walk, A/D and Left/Right turn (2.4 rad/s),
  Q/E step sideways, Shift (either) sprints. The mouse is captured as soon as
  the fighter steps out. The H help lists all of it.

## Files

- `src/arena/modes/convoy-raid.js`: stop and pull-away speed, new helpers
  (`convoyEscortOutSeconds`, `convoyStopped`, `convoyBodyGap`), rules
  (`stopSeconds`, `climbReach`, `promptRange`, `escortOutSeconds`); `boardingKph`
  removed.
- `src/arena/convoy.js`: last valve flags the escort stand-down, new callout.
- `src/combat-armor.js`: escort 30 s timer, `standDownConvoyEscorts`.
- `src/warlords/tollkeeper.js`, `src/arena/arena-event.js`: the first-valve
  escort reset and the `respawnRequests` path that only it used are removed.
- `src/crew-gear/boarding.js`, `src/onfoot-transition.js`: climb, F plant, roof
  limit.
- `src/convoy-prompt.js` (new), `src/combat-hud.js`, `src/combat-hud.css`: the
  prompt.
- `src/onfoot.js`, `src/input-contexts.js`, `src/game.js`, `src/controls-help.js`,
  `src/app.js`: turning keys, Q/E strafe, help text, mouse capture on exit.

## Tests

New in `tools/test-warlord-tollkeeper.mjs`: 30 s escort return, the first valve
leaving escorts alone, the last valve and the 60 s hold, the tanker stopping,
F climb (and not from afar or while rolling), F plant, mouse plant, the prompt
at each step, and a scripted keyboard-only player on Medium who breaks the
valves, gets out with F, walks, climbs, plants and wins (valves down at 67.5 s,
fight won at 78.5 s). New in `tools/test-onfoot-controls-camera.mjs`: holding
Right turns the fighter and the camera follows; Left, A, D too; E only strafes.

### Changed assertions (each because Kyle changed the rule)

- `test-warlord-tollkeeper`: "the first valve resets both real escorts once"
  replaced by the 30 s and 60 s tests above. The "only a real roof crossing"
  fixture sets the tanker speed to 0 after breaking the valves, since the
  tanker now stops instead of crawling at 35 km/h.
- `test-arena-convoy`: "slow the native loop to 35 km/h" is now "still rolling,
  then stopped within 4 s, stays stopped"; "returns to 55 km/h" now allows the
  4 s pull-away first. The roof-crossing fixtures start with the tanker stopped.
- `test-input-contexts`: A, D and the arrows are now turn keys (`turnLeft`,
  `turnRight`); strafe moved to Q and E.
- `test-crew-gear`: the strafe-direction check uses Q and E.

## Determinism and gates

No new randomness. Everything runs on the fixed step. Only arena events with the
Tollkeeper or Convoy Raid change (stopping tanker, escort timers). No replay
fingerprint file changed: the lane tier replays (race, arena and Convoy
controls) pass unchanged.

Lane tier (`--changed --jobs 3`): 245 of 246 passed. The one failure,
`test-drive-through`, died on `tar: Cannot connect to C:` (the Git Bash tar
reads a `C:` path as a remote host); the single rerun from PowerShell passed 6
of 6. `npm run build` passed. `node tools/combat-balance.mjs --check` exited 0.

## Removed

The first-valve escort reset, the `respawnRequests` path, `boardingKph`, the
`TANKER SLOWED / BOARD NOW` callout.

## For Claude

- Ordinary Convoy Raid escorts (scored wrecks, 3.5 s return) are unchanged; only
  the tanker stop and the on-foot finish apply to it. Say if the 30 s and 60 s
  escort rules should apply there too.
- The mouse is captured automatically when the fighter steps out. If a browser
  refuses it, a click still works. Pressing Escape releases it and pauses, as
  before.
- Not changed: walk speed 4.5 m/s, sprint 7.5 m/s, mouse sensitivity, the
  40 km/h bail-out limit for getting out of a moving car.
