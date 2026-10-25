# FUN-TITAN-LAUNCH

Status: ready for review. Branch `cloud/fun-titan-launch`, built in a cloud session (Claude). Nothing run on
Windows or in a browser. Listed under "Keep these" in `docs/board/decisions.md`: the monster truck's big air
off cars, for Kyle's son (Gratian).

## What the history says

Searching the code history (`git log -S` on `crushedVehicleSupport`, `canCrushVehicle`, `descendingCrush`,
the CRASH-0x, ARENA-RAMP-SIDE and TITAN-HANDLING notes; the history was compacted on 24 September, so it is
thin) I did not find one commit that removed a launch. What I did find, and what the code does today:

- `6e2aff9e` ("Add off-road freestyle physics, crushing and course unlocks") gave the Titan its crush rule.
  When it hits a car lighter than 75 percent of its mass at 7 mph or more (or lands on one from above), that car
  is flattened on the spot (`_crushVehicle`) and becomes a *wreck support*: a smooth bump under the tyres
  (`crushedVehicleSupport`, a smoothstep over the tyre reach, roof about 0.9 m after the collapse).
- `_jump` turns any rise in the ground under a car into vertical speed. A solid car edge used to be a step;
  the rule above replaced the step with a gentle bump, so the truck now rolls over the wreck. The off-road test
  states it: peak 0.7 to 1.2 m, "truck tires roll over the collapsed roof". That is the roll-over.
- The Titan's crash-physics rules (CRASH_PHYSICS.md: "the Titan hitting a sedan at 60 mph does not crash the
  Titan") keep it undamaged. Nothing else removed air.

## What changed

- The Titan's flattening of a car now also launches it (`_titanCarRamp`, `src/sim-contacts.js`, called from
  `_crushVehicle`): the car is the ramp. It happens only for the player's Titan, only from the ground, only at
  15 mph or more, and not when the Titan lands on a car from above. Launch speed is mph times 0.36, capped at
  16 m/s (`DRIVE.titanCarRamp`), starting from the flattened roof; the flight and landing are the ordinary jump
  rules in `_jump`, so it lands on its wheels without a reset.
  | Titan speed | Air time | Height |
  |---|---|---|
  | 20 mph | 0.9 s | 1.5 m |
  | 30 mph | 1.3 s | 3.7 m |
  | 45 mph and faster | 1.7 s | about 7 m (the cap) |
- Sound: the landing emits the existing `jumpLanded` event (the existing `vehicle.landing` cue, no new
  recording) with no points, and a "BIG AIR / n m" callout. Only authored arena ramps score.
- Every other car keeps today's contact rules (tests below).
- New test `tools/test-titan-car-launch.mjs`, written first (it failed with "air time 0.00 s", today's
  roll-over): a Titan at 30 mph over a parked car, on a flat test road and on Pacific Canyon, needs at least
  1.0 s and 2.5 m of air, no rollover, no crash, no reset, still rolling; a faster Titan takes more air; a
  Falcone and a Dusthawk meeting the same car are not launched.

## Re-recorded

- `tools/test-tyre-slip.mjs`, hash of the released `DRIVE` constants: `926b2aa9…` to `60eb15e4…` (reason: the new
  `titanCarRamp` entry in `DRIVE`; no value used by the released rules changed).
- No replay fingerprint moved. The Titan handling and off-road replays are unchanged (their Titan never meets a
  car at 15 mph or more).

## Checks

On this branch, merged with `origin/integration/wasteland` (dfb420c1), Linux cloud container:

- `node tools/test-titan-car-launch.mjs`: 8/8. `node tools/test-offroad-physics.mjs`: 9861 checks.
- Lane tier: 461 suites, 447 passed, 14 failed. Twelve also fail on the untouched front branch (the
  Windows-only suites course-kit, earned-cars-ui, full-check, drive-through, medals, salt-flats, salt-flats-art;
  p4-kits, compact-binaries and tanker-valve-source need `C:/Users/kyleb/dev/art-library` files; vesper-art needs
  Blender; lab-radio). One is the known dev tyre-slip drift fixture (`test-drift-trial.mjs`, card
  TYRE-SLIP-DRIFT-RETUNE). The last, `test-tyre-slip.mjs`, is the re-record above and passes.
- `npm run build`: passes.
- Not run here: a look at the jump in the browser (camera, wheels in the air, the BIG AIR callout); the laptop
  should drive a Titan into a parked car once.

## Removed

Nothing removed.
